import os
import sys
import gc
import json
import time
import argparse
from pathlib import Path

# Cấu hình UTF-8 cho stdout/stderr
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Chống phân mảnh bộ nhớ PyTorch
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"

# Nạp an toàn các thư viện AI
try:
    import torch  # type: ignore
    import psutil  # type: ignore
    from PIL import Image  # type: ignore
    from diffusers import LTXImageToVideoPipeline  # type: ignore
    from diffusers.utils import export_to_video, load_image  # type: ignore
    from transformers import T5EncoderModel, T5Tokenizer  # type: ignore
    AI_AVAILABLE = True
except Exception as e:
    AI_AVAILABLE = False
    torch = None  # type: ignore
    psutil = None  # type: ignore

def print_banner():
    print("=" * 65)
    print("🤖 COLAB HEADLESS WORKER (LTX-VIDEO TWO-PHASE PIPELINE)")
    print("   - Pha 1: Mã hóa Prompt độc lập qua T5 (RAM < 5.5GB)")
    print("   - Pha 2: LTX-Video Sinh Clip 704x384 @ 24fps (Float16 T4)")
    print("   - Skill: colab-gpu-guard (Bảo vệ VRAM/RAM & Fail-Safe)")
    print("=" * 65)

def check_system_memory():
    """Kiểm tra tài nguyên RAM hệ thống và VRAM GPU"""
    info = {"cuda_available": False, "gpu_name": "None", "vram_free_gb": 0.0, "ram_free_gb": 0.0}
    if psutil:
        ram = psutil.virtual_memory()
        info["ram_free_gb"] = round(ram.available / (1024**3), 2)
        info["ram_total_gb"] = round(ram.total / (1024**3), 2)

    if torch and torch.cuda.is_available():
        info["cuda_available"] = True
        info["gpu_name"] = torch.cuda.get_device_name(0)
        free_bytes, total_bytes = torch.cuda.mem_get_info()
        info["vram_free_gb"] = round(free_bytes / (1024**3), 2)
        info["vram_total_gb"] = round(total_bytes / (1024**3), 2)
    return info

def resize_to_704x384(image: Image.Image) -> Image.Image:
    """Resize ảnh về chuẩn 704x384 (16:9 bội số 32 cho LTX-Video)"""
    target_w, target_h = 704, 384
    return image.resize((target_w, target_h), Image.Resampling.LANCZOS)

def phase_1_encode_prompts(jobs, cache_dir: Path):
    """Pha 1: Nạp riêng T5, mã hóa toàn bộ prompt thành file .pt rồi giải phóng RAM"""
    print("\n📦 [PHA 1/2] MÃ HÓA TOÀN BỘ PROMPT VỚI T5 (QUY TRÌNH TIẾT KIỆM RAM)")
    cache_dir.mkdir(parents=True, exist_ok=True)

    model_id = "Lightricks/LTX-Video"
    print(f"   ⏳ Đang nạp Tokenizer & T5EncoderModel từ {model_id}...")

    # Thử nạp 8-bit hoặc float16
    try:
        tokenizer = T5Tokenizer.from_pretrained(model_id, subfolder="tokenizer")
        try:
            text_encoder = T5EncoderModel.from_pretrained(
                model_id,
                subfolder="text_encoder",
                load_in_8bit=True,
                device_map="auto"
            )
            print("   ✅ Đã nạp T5 với lượng tử hóa 8-bit (bitsandbytes)!")
        except Exception as e8:
            print(f"   ℹ️ Không thể nạp 8-bit ({e8}), chuyển sang torch.float16...")
            text_encoder = T5EncoderModel.from_pretrained(
                model_id,
                subfolder="text_encoder",
                torch_dtype=torch.float16
            ).to("cuda" if torch.cuda.is_available() else "cpu")
    except Exception as err:
        print(f"   ❌ Lỗi khi nạp T5 text encoder: {err}")
        return False

    encoded_count = 0
    for job in jobs:
        shot_id = job.get("shotId")
        prompt = job.get("prompt", "")
        embed_file = cache_dir / f"{shot_id}_embeds.pt"

        if embed_file.exists():
            print(f"   ⏭️ Embeddings cho [{shot_id}] đã tồn tại trên đĩa.")
            continue

        print(f"   ✍️ Đang mã hóa prompt cho [{shot_id}]...")
        with torch.no_grad():
            text_inputs = tokenizer(
                prompt,
                padding="max_length",
                max_length=128,
                truncation=True,
                return_tensors="pt"
            )
            input_ids = text_inputs.input_ids.to(text_encoder.device)
            attention_mask = text_inputs.attention_mask.to(text_encoder.device)

            prompt_embeds = text_encoder(input_ids=input_ids, attention_mask=attention_mask)[0]
            
            torch.save({
                "prompt_embeds": prompt_embeds.cpu(),
                "prompt_attention_mask": attention_mask.cpu()
            }, embed_file)
            encoded_count += 1

    print(f"   ✅ Đã lưu {encoded_count} tệp prompt embeddings vào {cache_dir}/")

    # DỌN DẸP TUYỆT ĐỐI T5 ĐỂ GIẢI PHÓNG TOÀN BỘ 7-9GB RAM!
    print("   🧹 Đang giải phóng T5Encoder khỏi RAM...")
    del text_encoder
    del tokenizer
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    
    mem_after = check_system_memory()
    print(f"   ✨ RAM khả dụng sau khi dọn T5: {mem_after.get('ram_free_gb')} GB / {mem_after.get('ram_total_gb')} GB")
    return True

def phase_2_render_clips(jobs, cache_dir: Path, done_dir: Path, failed_dir: Path, root_dir: Path = None, slug: str = "natural-cycle"):
    """Pha 2: Nạp LTX-Video Transformer + VAE (text_encoder=None) và sinh clip"""
    print("\n🎬 [PHA 2/2] NẠP LTX-VIDEO (KHÔNG TEXT ENCODER) & SINH VIDEO")
    model_id = "Lightricks/LTX-Video"

    try:
        print(f"   ⏳ Đang nạp LTXImageToVideoPipeline từ {model_id} (text_encoder=None)...")
        pipe = LTXImageToVideoPipeline.from_pretrained(
            model_id,
            text_encoder=None,
            tokenizer=None,
            torch_dtype=torch.float16
        )
    except Exception as err:
        print(f"   ❌ Lỗi nạp pipeline: {err}")
        return False

    # Thang cấu hình colab-gpu-guard
    print("   🛡️ Kích hoạt colab-gpu-guard memory ladder:")
    try:
        pipe.enable_model_cpu_offload()
        print("   - enable_model_cpu_offload(): ✅ BẬT")
    except Exception as off_err:
        print(f"   - Không thể offload: {off_err}")

    if hasattr(pipe, "vae") and pipe.vae is not None:
        try:
            pipe.vae.enable_tiling()
            pipe.vae.enable_slicing()
            print("   - VAE tiling & slicing: ✅ BẬT")
        except Exception:
            pass

    done_dir.mkdir(parents=True, exist_ok=True)
    failed_dir.mkdir(parents=True, exist_ok=True)

    for idx, job in enumerate(jobs):
        shot_id = job.get("shotId")
        out_video_name = f"{shot_id}.mp4"
        final_video_path = done_dir / out_video_name
        tmp_video_path = done_dir / f"{shot_id}.mp4.tmp"

        if final_video_path.exists() and final_video_path.stat().st_size > 1024:
            print(f"\n⏭️ [{idx+1}/{len(jobs)}] {shot_id} đã hoàn thành, bỏ qua.")
            continue

        print(f"\n🚀 [{idx+1}/{len(jobs)}] Đang xử lý job: {shot_id}")
        raw_img_path = str(job.get("inputImagePath", "") or job.get("sourceImage", "")).replace("\\", "/")
        img_name = Path(raw_img_path).name

        candidate_paths = [
            Path(raw_img_path),
            (root_dir / "runs" / slug / "media" / img_name) if root_dir else None,
            (root_dir / raw_img_path) if root_dir else None,
            Path("/content/Create-Video/runs") / slug / "media" / img_name,
            Path("runs") / slug / "media" / img_name,
        ]

        source_image_path = None
        for cp in candidate_paths:
            if cp and Path(cp).exists():
                source_image_path = Path(cp)
                break

        if not source_image_path:
            print(f"   ❌ Không tìm thấy ảnh nguồn: {raw_img_path}")
            continue

        embed_file = cache_dir / f"{shot_id}_embeds.pt"
        if not embed_file.exists():
            print(f"   ❌ Thiếu file prompt embeddings: {embed_file}")
            continue

        # Nạp ảnh & resize chuẩn 704x384
        init_image = load_image(str(source_image_path))
        init_image = resize_to_704x384(init_image)

        # Nạp embedding
        embed_data = torch.load(embed_file, map_location="cuda" if torch.cuda.is_available() else "cpu")
        prompt_embeds = embed_data["prompt_embeds"].to(pipe.device, dtype=torch.float16)
        prompt_attention_mask = embed_data["prompt_attention_mask"].to(pipe.device)

        seed = job.get("seed", 42)
        generator = torch.Generator(device="cuda" if torch.cuda.is_available() else "cpu").manual_seed(seed)

        start_time = time.time()
        try:
            with torch.inference_mode():
                output = pipe(
                    image=init_image,
                    prompt_embeds=prompt_embeds,
                    prompt_attention_mask=prompt_attention_mask,
                    width=704,
                    height=384,
                    num_frames=job.get("numFrames", 49),
                    frame_rate=job.get("fps", 24),
                    num_inference_steps=job.get("numSteps", 30),
                    guidance_scale=job.get("guidanceScale", 3.0),
                    generator=generator,
                )
                frames = output.frames[0]

            # Xuất video ra file tạm .tmp
            export_to_video(frames, str(tmp_video_path), fps=job.get("fps", 24))

            # Xác thực file video
            if tmp_video_path.exists() and tmp_video_path.stat().st_size > 1024:
                if final_video_path.exists():
                    final_video_path.unlink()
                tmp_video_path.rename(final_video_path)
                elapsed = round(time.time() - start_time, 2)
                size_mb = round(final_video_path.stat().st_size / (1024 * 1024), 2)
                print(f"   🎉 XUẤT THÀNH CÔNG: {final_video_path} ({size_mb} MB trong {elapsed}s)")

                # Chuyển job JSON sang done
                job_json_done = done_dir / f"{shot_id}.json"
                job["status"] = "completed"
                job["completedAt"] = time.strftime("%Y-%m-%d %H:%M:%S")
                job["elapsedSec"] = elapsed
                job_json_done.write_text(json.dumps(job, indent=2), encoding="utf-8")

                # Dọn job ở pending
                pending_job_path = Path(job.get("_source_path", ""))
                if pending_job_path.exists():
                    pending_job_path.unlink()
            else:
                print(f"   ❌ File xuất bị hỏng hoặc 0 bytes: {tmp_video_path}")

        except torch.cuda.OutOfMemoryError as oom:
            print(f"   💥 LỖI OOM (VRAM): {oom}")
            if tmp_video_path.exists():
                tmp_video_path.unlink()
            gc.collect()
            torch.cuda.empty_cache()
        except Exception as gen_err:
            print(f"   ❌ Lỗi khi sinh video: {gen_err}")
            if tmp_video_path.exists():
                tmp_video_path.unlink()

        # Dọn dẹp sau mỗi shot
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

    return True

def main():
    print_banner()
    parser = argparse.ArgumentParser(description="Colab Worker for LTX-Video Generation")
    parser.add_argument("--slug", type=str, default="natural-cycle-v2", help="Mã slug dự án")
    parser.add_argument("--root", type=str, default=".", help="Đường dẫn gốc thư mục dự án")
    args = parser.parse_args()

    root_dir = Path(args.root).resolve()
    slug = args.slug
    pending_dir = root_dir / "jobs" / "pending" / slug
    done_dir = root_dir / "jobs" / "done" / slug
    failed_dir = root_dir / "jobs" / "failed" / slug
    cache_dir = root_dir / "jobs" / ".cache" / slug

    mem = check_system_memory()
    print(f"📊 Tài nguyên hệ thống:")
    print(f"   - GPU: {mem['gpu_name']} (VRAM trống: {mem['vram_free_gb']} / {mem.get('vram_total_gb', 0)} GB)")
    print(f"   - RAM: {mem['ram_free_gb']} GB khả dụng / {mem.get('ram_total_gb', 0)} GB tổng")

    if not AI_AVAILABLE:
        print("\n⚠️ Cảnh báo: Các thư viện AI (torch, diffusers, transformers) chưa được cài đặt trên môi trường này.")
        print("   Worker script này được thiết kế để chạy trên Google Colab GPU Runtime.")
        print("   Hãy nạp tệp này hoặc chạy qua notebooks/colab_worker.ipynb trên Google Colab!")
        return

    # Quét danh sách pending jobs
    pending_files = list(pending_dir.glob("*.json")) if pending_dir.exists() else []
    if not pending_files:
        print(f"\nℹ️ Không có job pending nào trong {pending_dir}/")
        return

    jobs = []
    for pf in pending_files:
        try:
            data = json.loads(pf.read_text(encoding="utf-8"))
            data["_source_path"] = str(pf)
            jobs.append(data)
        except Exception as e:
            print(f"⚠️ Lỗi đọc job {pf}: {e}")

    print(f"\n📋 Đã tìm thấy {len(jobs)} jobs trong hàng đợi:")
    for j in jobs:
        print(f"   - {j.get('shotId')}: {j.get('prompt')[:60]}...")

    # Chạy quy trình 2 pha
    ok1 = phase_1_encode_prompts(jobs, cache_dir)
    if ok1:
        phase_2_render_clips(jobs, cache_dir, done_dir, failed_dir, root_dir, slug)

    print("\n🏁 WORKER ĐÃ HOÀN TẤT VÒNG LẶP XỬ LÝ!")

if __name__ == "__main__":
    main()
