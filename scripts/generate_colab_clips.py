import os
import re
import sys
import argparse
import subprocess
from pathlib import Path

# Thiết lập đường dẫn gốc
PROJECT_ROOT = Path(__file__).resolve().parent.parent

def parse_shot_list(shot_list_path: Path):
    """Trích xuất 12 shot và prompt từ shot-list.md"""
    if not shot_list_path.exists():
        raise FileNotFoundError(f"Không tìm thấy: {shot_list_path}")

    content = shot_list_path.read_text(encoding="utf-8")
    shots = []

    # Bản đồ ảnh neo Re-anchor Matrix
    anchor_map = {
        "shot_01": "scene_02_skull.jpg",
        "shot_05": "scene_04_soil.jpg",
        "shot_07": "scene_06_seedling_zoom.jpg",
        "shot_09": "scene_08_tree_fruits.jpg",
        "shot_11": "scene_09_fruit_falling.jpg",
        "shot_12": "scene_10_skull_return.jpg",
    }

    pattern = re.compile(
        r"### 🎬 (Shot \d{2}):[^\n]+\n(?:[^\n]+\n)*?- \*\*Prompt Veo:\*\*\s*\n\s*> `([^`]+)`",
        re.MULTILINE
    )

    for match in pattern.finditer(content):
        shot_id = match.group(1).lower().replace(" ", "_")
        num = int(shot_id.replace("shot_", ""))
        prompt = match.group(2).strip()

        shots.append({
            "id": shot_id,
            "num": num,
            "prompt": prompt,
            "anchor": anchor_map.get(shot_id),
            "prev_id": f"shot_{num - 1:02d}" if num > 1 else None,
        })

    return shots

def extract_last_frame(clip_path: Path, output_frame_path: Path):
    """Trích xuất khung hình cuối cùng của clip bằng ffmpeg làm bàn đạp cho shot tiếp theo"""
    cmd = [
        "ffmpeg", "-y",
        "-sseof", "-0.1",
        "-i", str(clip_path),
        "-update", "1",
        "-q:v", "2",
        str(output_frame_path)
    ]
    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

def main():
    parser = argparse.ArgumentParser(description="Tự động sinh 12 clip AI miễn phí bằng GPU Google Colab")
    parser.add_argument("--run", default="natural-cycle-v2", help="Mã slug dự án")
    parser.add_argument("--model", default="ltx", choices=["ltx", "cogvideox"], help="Mô hình AI Video (ltx hoặc cogvideox)")
    parser.add_argument("--shot", default=None, help="Chỉ sinh một shot cụ thể (ví dụ: shot_01)")
    parser.add_argument("--num_inference_steps", type=int, default=30, help="Số bước khử nhiễu (Denoising steps)")
    parser.add_argument("--force", action="store_true", help="Ghi đè clip đã tồn tại")
    args = parser.parse_args()

    run_dir = PROJECT_ROOT / "runs" / args.run
    media_dir = run_dir / "media"
    anchors_dir = media_dir / "anchors"
    shot_list_path = run_dir / "shot-list.md"

    media_dir.mkdir(parents=True, exist_ok=True)

    print("\n" + "=" * 60)
    print(f"🎬 BẮT ĐẦU PIPELINE TỰ ĐỘNG SINH CLIP AI TRÊN GOOGLE COLAB (0đ)")
    print(f"   Dự án: {args.run} | Mô hình: {args.model.upper()}")
    print("=" * 60 + "\n")

    # 1. Kiểm tra PyTorch và GPU
    import torch
    if not torch.cuda.is_available():
        print("❌ CẢNH BÁO: Không tìm thấy GPU CUDA! Vui lòng chọn Runtime -> Change runtime type -> T4 GPU trên Colab.")
        sys.exit(1)

    gpu_name = torch.cuda.get_device_name(0)
    print(f"✅ Phát hiện GPU: {gpu_name}")
    dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    print(f"⚡ Kiểu dữ liệu tối ưu: {dtype}\n")

    # 2. Tải Pipeline mô hình vào GPU VRAM (Tránh ngốn System RAM gây OOM)
    from diffusers.utils import export_to_video, load_image

    if args.model == "ltx":
        from diffusers import LTXImageToVideoPipeline
        print("⏳ Đang tải mô hình Lightricks/LTX-Video trực tiếp vào GPU VRAM (15GB)...")
        pipe = LTXImageToVideoPipeline.from_pretrained(
            "Lightricks/LTX-Video",
            torch_dtype=torch.float16,
            low_cpu_mem_usage=True,
        )
        pipe.to("cuda")
        if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_tiling"):
            pipe.vae.enable_tiling()
        if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_slicing"):
            pipe.vae.enable_slicing()
        print("✅ Mô hình LTX-Video đã nạp an toàn vào GPU VRAM!\n")
    else:
        from diffusers import CogVideoXImageToVideoPipeline
        print("⏳ Đang tải mô hình THUDM/CogVideoX-2b vào GPU VRAM...")
        pipe = CogVideoXImageToVideoPipeline.from_pretrained(
            "THUDM/CogVideoX-2b",
            torch_dtype=torch.float16,
            low_cpu_mem_usage=True,
        )
        pipe.to("cuda")
        pipe.vae.enable_tiling()
        print("✅ Mô hình CogVideoX-2b đã sẵn sàng!\n")

    # 3. Trích xuất danh mục Shot
    shots = parse_shot_list(shot_list_path)
    if args.shot:
        target_shots = [s for s in shots if s["id"] == args.shot.lower()]
    else:
        target_shots = shots

    print(f"🎯 Danh sách shot sẽ xử lý ({len(target_shots)} shots): {[s['id'] for s in target_shots]}\n")

    # 4. Vòng lặp tự động sinh từng shot
    for s in target_shots:
        shot_id = s["id"]
        output_clip_path = media_dir / f"{shot_id}.mp4"

        print("-" * 55)
        print(f"▶️ Xử lý {shot_id.upper()}...")

        if output_clip_path.exists() and not args.force:
            print(f"  ✨ Đã có file {output_clip_path.name}, bỏ qua (dùng --force nếu muốn sinh lại).")
            continue

        # Xác định ảnh khung đầu vào (Start Frame)
        start_frame_path = None
        if s["anchor"]:
            start_frame_path = anchors_dir / s["anchor"]
            print(f"  ⚓ Khung hình neo (Re-anchor Matrix): {s['anchor']}")
        elif s["prev_id"]:
            next_frame = media_dir / f"frame_start_for_{shot_id}.jpg"
            if next_frame.exists():
                start_frame_path = next_frame
                print(f"  🔗 Dùng khung tiếp nối: {next_frame.name}")
            else:
                prev_clip = media_dir / f"{s['prev_id']}.mp4"
                if prev_clip.exists():
                    print(f"  ✂️ Trích xuất khung cuối từ {prev_clip.name}...")
                    extract_last_frame(prev_clip, next_frame)
                    start_frame_path = next_frame

        if not start_frame_path or not start_frame_path.exists():
            print(f"  ❌ Không tìm thấy ảnh bắt đầu cho {shot_id}. Bỏ qua.")
            continue

        # Tải ảnh và tiền xử lý
        input_image = load_image(str(start_frame_path))
        print(f"  🖼️ Kích thước ảnh đầu vào: {input_image.size}")

        # Sinh video AI
        print(f"  🚀 Đang sinh clip AI ({args.num_inference_steps} steps)...")
        print(f"     Prompt: \"{s['prompt'][:80]}...\"")

        with torch.inference_mode():
            if args.model == "ltx":
                # LTX-Video: tỷ lệ 16:9 tối ưu cho T4: 768x512, 121 frames (~5s @ 24fps)
                result = pipe(
                    image=input_image,
                    prompt=s["prompt"],
                    negative_prompt="worst quality, low quality, deformed, distorted, blurry, colored, watermark, logo",
                    width=768,
                    height=512,
                    num_frames=121,
                    frame_rate=24,
                    num_inference_steps=args.num_inference_steps,
                ).frames[0]
            else:
                # CogVideoX-2B: tỷ lệ 720x480
                result = pipe(
                    prompt=s["prompt"],
                    image=input_image,
                    num_frames=49,
                    num_inference_steps=args.num_inference_steps,
                ).frames[0]

        # Lưu file MP4
        export_to_video(result, str(output_clip_path), fps=24)
        print(f"  🎉 Đã lưu thành công: {output_clip_path.name}")

        # Dọn sạch VRAM sau mỗi shot
        del result
        import gc
        gc.collect()
        torch.cuda.empty_cache()

        # Trích xuất ngay khung cuối cho shot tiếp theo nếu cần
        next_shot_num = s["num"] + 1
        if next_shot_num <= 12:
            next_shot_id = f"shot_{next_shot_num:02d}"
            next_start_frame = media_dir / f"frame_start_for_{next_shot_id}.jpg"
            try:
                extract_last_frame(output_clip_path, next_start_frame)
                print(f"  📸 Đã tự trích xuất khung xuất phát cho {next_shot_id}: {next_start_frame.name}")
            except Exception as e:
                print(f"  ⚠️ Cảnh báo trích xuất khung cuối: {e}")

    print("\n" + "=" * 60)
    print("🏁 HOÀN TẤT TOÀN BỘ CÁC SHOT TRÊN GOOGLE COLAB!")
    print(f"📁 Thư mục media: {media_dir}")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()
