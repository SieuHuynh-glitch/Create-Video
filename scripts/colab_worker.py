#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
COLAB HEADLESS WORKER v4 - LTX-Video hai pha (T5 -> LTX), tự phục hồi khi lỗi.

Pha 1: mã hóa toàn bộ prompt bằng T5 rồi giải phóng RAM/VRAM.
Pha 2: nạp LTX-Video (không text encoder), sinh từng clip, kiểm tra, ghi MP4.

Độ bền:
  - Ghi MP4 bằng imageio-ffmpeg (chỉ định format, không phụ thuộc đuôi file),
    có phương án dự phòng OpenCV / diffusers.
  - Kiểm tra video sau khi ghi (đọc lại, đếm khung, phát hiện video đen/phẳng).
  - Thử lại theo bậc: cùng cấu hình khác seed, rồi giảm số khung hình (OOM).
  - Cache embeddings có hash prompt, kiểm tra NaN/inf.
  - Một shot lỗi không làm dừng cả hàng đợi; có báo cáo JSON cuối cùng.
  - Tùy chọn chép từng clip sang Google Drive ngay khi xong.
"""
from __future__ import annotations

import argparse
import gc
import hashlib
import json
import os
import shutil
import sys
import time
import traceback
from pathlib import Path
from types import SimpleNamespace

WORKER_VERSION = "4.0.0"

# Cấu hình UTF-8 cho stdout/stderr
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Chống phân mảnh bộ nhớ PyTorch, tắt cảnh báo thừa
os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

# ---------------------------------------------------------------------------
# Nạp thư viện (ghi lại lý do nếu thất bại thay vì nuốt lỗi)
# ---------------------------------------------------------------------------
BASIC_IMPORT_ERRORS = []
try:
    import numpy as np  # type: ignore
except Exception as _e:  # pragma: no cover
    np = None  # type: ignore
    BASIC_IMPORT_ERRORS.append(f"numpy: {_e}")
try:
    from PIL import Image  # type: ignore
except Exception as _e:  # pragma: no cover
    Image = None  # type: ignore
    BASIC_IMPORT_ERRORS.append(f"Pillow: {_e}")
try:
    import psutil  # type: ignore
except Exception:
    psutil = None  # type: ignore
try:
    import cv2  # type: ignore
except Exception:
    cv2 = None  # type: ignore

AI_IMPORT_ERROR = ""
try:
    import torch  # type: ignore
    from diffusers import LTXImageToVideoPipeline  # type: ignore
    from transformers import T5EncoderModel, T5Tokenizer  # type: ignore
    AI_AVAILABLE = True
except Exception as _e:
    AI_AVAILABLE = False
    torch = None  # type: ignore
    AI_IMPORT_ERROR = f"{type(_e).__name__}: {_e}"

# ---------------------------------------------------------------------------
# Hằng số
# ---------------------------------------------------------------------------
MODEL_ID = "Lightricks/LTX-Video"
DEFAULT_WIDTH, DEFAULT_HEIGHT = 704, 384
MAX_SEQ_LEN = 128
CACHE_VERSION = 2
FP16_MAX = 65000.0
DEFAULT_NEGATIVE_PROMPT = "worst quality, inconsistent motion, blurry, jittery, distorted"
FALLBACK_FRAME_COUNTS = (33, 25)  # đều có dạng 8k+1 theo yêu cầu của LTX


class BadOutput(Exception):
    """Kết quả sinh ra không dùng được (video đen, file hỏng...)."""


# ---------------------------------------------------------------------------
# Tiện ích chung
# ---------------------------------------------------------------------------
def print_banner():
    print("=" * 65)
    print(f"🤖 COLAB HEADLESS WORKER v{WORKER_VERSION} (LTX-VIDEO TWO-PHASE)")
    print("   - Pha 1: Mã hóa Prompt độc lập qua T5 (tiết kiệm RAM)")
    print("   - Pha 2: LTX-Video sinh clip 704x384 @ 24fps (Float16 T4)")
    print("   - Tự phục hồi: thử lại, hạ cấp khung hình, kiểm tra video")
    print("=" * 65)


def write_json(path: Path, data) -> None:
    """Ghi JSON an toàn (ghi file tạm rồi đổi tên)."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".part")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, path)


def retry_call(fn, what: str, attempts: int = 3, wait: float = 20.0):
    """Gọi fn(), thử lại khi lỗi mạng/tạm thời (tải model từ HF)."""
    last = None
    for i in range(1, attempts + 1):
        try:
            return fn()
        except Exception as e:  # noqa: BLE001
            last = e
            print(f"   ⚠️ {what} lỗi lần {i}/{attempts}: {type(e).__name__}: {e}")
            if i < attempts:
                time.sleep(wait)
    raise last  # type: ignore[misc]


def cleanup_memory() -> None:
    gc.collect()
    if torch is not None and torch.cuda.is_available():
        torch.cuda.empty_cache()
        try:
            torch.cuda.ipc_collect()
        except Exception:
            pass


def is_oom(exc: BaseException) -> bool:
    return type(exc).__name__ == "OutOfMemoryError" or "out of memory" in str(exc).lower()


def check_system_memory():
    """Kiểm tra tài nguyên RAM hệ thống và VRAM GPU."""
    info = {"cuda_available": False, "gpu_name": "None", "vram_free_gb": 0.0,
            "vram_total_gb": 0.0, "ram_free_gb": 0.0, "ram_total_gb": 0.0}
    if psutil:
        ram = psutil.virtual_memory()
        info["ram_free_gb"] = round(ram.available / (1024 ** 3), 2)
        info["ram_total_gb"] = round(ram.total / (1024 ** 3), 2)
    if torch is not None and torch.cuda.is_available():
        info["cuda_available"] = True
        info["gpu_name"] = torch.cuda.get_device_name(0)
        free_bytes, total_bytes = torch.cuda.mem_get_info()
        info["vram_free_gb"] = round(free_bytes / (1024 ** 3), 2)
        info["vram_total_gb"] = round(total_bytes / (1024 ** 3), 2)
    return info


def normalize_frame_count(n) -> int:
    """LTX yêu cầu số khung hình có dạng 8k+1 (9, 17, 25, 33, 41, 49...)."""
    try:
        n = int(n)
    except Exception:
        n = 49
    n = max(9, n)
    return ((n - 1) // 8) * 8 + 1


def snap32(value, default: int) -> int:
    try:
        v = int(value)
    except Exception:
        return default
    return v if v >= 64 and v % 32 == 0 else default


def build_attempt_plan(num_frames: int, seed: int, max_attempts: int = 4):
    """Danh sách (số_khung, seed): thử lại cùng cấu hình, rồi hạ số khung."""
    n = normalize_frame_count(num_frames)
    plan = [(n, seed), (n, seed + 1)]
    for f in FALLBACK_FRAME_COUNTS:
        if f < n:
            plan.append((f, seed))
    return plan[:max(1, int(max_attempts))]


def prompt_hash(prompt: str, negative: str) -> str:
    raw = f"{CACHE_VERSION}|{MODEL_ID}|{MAX_SEQ_LEN}|{prompt}|{negative}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:20]


# ---------------------------------------------------------------------------
# Ảnh đầu vào
# ---------------------------------------------------------------------------
def resize_to_target(image, width: int = DEFAULT_WIDTH, height: int = DEFAULT_HEIGHT):
    """Cắt giữa theo tỉ lệ đích rồi resize (không méo hình), bội số 32 cho LTX."""
    image = image.convert("RGB")
    src_w, src_h = image.size
    target_ratio = width / height
    src_ratio = src_w / src_h
    if abs(src_ratio - target_ratio) > 1e-3:
        if src_ratio > target_ratio:
            new_w = int(round(src_h * target_ratio))
            left = (src_w - new_w) // 2
            image = image.crop((left, 0, left + new_w, src_h))
        else:
            new_h = int(round(src_w / target_ratio))
            top = (src_h - new_h) // 2
            image = image.crop((0, top, src_w, top + new_h))
    return image.resize((width, height), Image.Resampling.LANCZOS)


def find_source_image(job, root_dir: Path, slug: str):
    raw = str(job.get("inputImagePath", "") or job.get("sourceImage", "")).replace("\\", "/")
    if not raw:
        return None, raw
    name = Path(raw).name
    candidates = [
        Path(raw),
        root_dir / raw,
        root_dir / "runs" / slug / "media" / name,
        Path("/content/Create-Video/runs") / slug / "media" / name,
        Path("runs") / slug / "media" / name,
    ]
    candidates += sorted((root_dir / "runs").glob(f"*/media/{name}")) if (root_dir / "runs").exists() else []
    for cp in candidates:
        try:
            if cp.exists() and cp.is_file():
                return cp, raw
        except OSError:
            continue
    return None, raw


# ---------------------------------------------------------------------------
# Ghi và kiểm tra video
# ---------------------------------------------------------------------------
def to_uint8_array(frame):
    if hasattr(frame, "convert"):
        return np.asarray(frame.convert("RGB"))
    arr = np.asarray(frame)
    if arr.dtype != np.uint8:
        arr = np.nan_to_num(arr.astype(np.float32), nan=0.0, posinf=1.0, neginf=0.0)
        if arr.max() <= 1.0 + 1e-3:
            arr = arr * 255.0
        arr = np.clip(arr, 0, 255).astype(np.uint8)
    if arr.ndim == 3 and arr.shape[0] in (1, 3) and arr.shape[-1] not in (1, 3):
        arr = np.transpose(arr, (1, 2, 0))
    return arr


def analyze_frames(frames):
    """Phát hiện video hỏng: rỗng, toàn đen/toàn trắng (phẳng). Đo độ chuyển động."""
    n = len(frames)
    if n == 0:
        return {"count": 0, "degenerate": True, "motion": 0.0, "reason": "không có khung hình"}
    idx = sorted({0, n // 2, n - 1})
    arrs = [to_uint8_array(frames[i]) for i in idx]
    stds = [float(a.std()) for a in arrs]
    motion = 0.0
    if len(arrs) > 1:
        motion = float(np.abs(arrs[0].astype(np.float32) - arrs[-1].astype(np.float32)).mean())
    if all(s < 0.5 for s in stds):
        return {"count": n, "degenerate": True, "motion": motion,
                "reason": "khung hình phẳng (toàn đen hoặc toàn trắng)"}
    return {"count": n, "degenerate": False, "motion": motion, "reason": ""}


def write_video(frames, path, fps) -> str:
    """Ghi MP4. Thử imageio-ffmpeg -> OpenCV -> diffusers. Trả về tên phương pháp."""
    path = Path(path)
    if path.suffix.lower() != ".mp4":
        raise ValueError(f"Đuôi file phải là .mp4: {path}")
    arrs = [to_uint8_array(f) for f in frames]
    if not arrs:
        raise BadOutput("không có khung hình để ghi")
    fps = float(fps)
    errors = []

    def drop_partial():
        try:
            if path.exists():
                path.unlink()
        except OSError:
            pass

    # 1) imageio-ffmpeg, chỉ định format để không bị đoán nhầm theo đuôi file
    try:
        try:
            import imageio.v2 as iio  # type: ignore
        except ImportError:
            import imageio as iio  # type: ignore
        writer = iio.get_writer(str(path), format="FFMPEG", mode="I", fps=fps,
                                codec="libx264", pixelformat="yuv420p",
                                macro_block_size=1, quality=8)
        try:
            for a in arrs:
                writer.append_data(a)
        finally:
            writer.close()
        return "imageio-ffmpeg"
    except Exception as e:  # noqa: BLE001
        errors.append(f"imageio-ffmpeg: {type(e).__name__}: {e}")
        drop_partial()

    # 2) OpenCV
    if cv2 is not None:
        try:
            h, w = arrs[0].shape[:2]
            vw = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))
            if not vw.isOpened():
                raise RuntimeError("không mở được cv2.VideoWriter")
            try:
                for a in arrs:
                    vw.write(cv2.cvtColor(a, cv2.COLOR_RGB2BGR))
            finally:
                vw.release()
            return "opencv-mp4v"
        except Exception as e:  # noqa: BLE001
            errors.append(f"opencv: {type(e).__name__}: {e}")
            drop_partial()

    # 3) diffusers export_to_video (đuôi .mp4 nên chọn đúng plugin)
    try:
        from diffusers.utils import export_to_video  # type: ignore
        pil_frames = [Image.fromarray(a) for a in arrs]
        export_to_video(pil_frames, str(path), fps=int(round(fps)))
        return "diffusers-export"
    except Exception as e:  # noqa: BLE001
        errors.append(f"diffusers: {type(e).__name__}: {e}")
        drop_partial()

    raise RuntimeError("Không ghi được MP4 bằng mọi phương pháp: " + " | ".join(errors))


def verify_video(path, expected_frames=None, width=None, height=None):
    """Đọc lại file để chắc chắn dùng được. Trả về (ok, thông tin)."""
    path = Path(path)
    if not path.exists():
        return False, "file không tồn tại"
    size = path.stat().st_size
    if size < 1024:
        return False, f"file quá nhỏ ({size} bytes)"
    if cv2 is None:
        return True, f"{size} bytes (không có OpenCV để kiểm tra sâu)"
    cap = cv2.VideoCapture(str(path))
    try:
        if not cap.isOpened():
            return False, "OpenCV không mở được file"
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        if (width and w != width) or (height and h != height):
            return False, f"sai độ phân giải {w}x{h}"
        count = 0
        while True:
            ok, _ = cap.read()
            if not ok:
                break
            count += 1
    finally:
        cap.release()
    if count == 0:
        return False, "không đọc được khung hình nào"
    if expected_frames and count < expected_frames - 1:
        return False, f"thiếu khung hình ({count}/{expected_frames})"
    return True, f"{count} khung, {w}x{h}, {round(size / 1024 / 1024, 2)} MB"


# ---------------------------------------------------------------------------
# Vòng thử lại (tách riêng để dễ kiểm thử không cần GPU)
# ---------------------------------------------------------------------------
def run_attempts(generate_fn, plan, tmp_path, fps, width, height, cleanup_fn=None, log=print):
    """
    Thử lần lượt theo plan. generate_fn(num_frames, seed) -> list khung hình.
    Gặp OOM thì nhảy thẳng tới mức số khung thấp hơn.
    """
    attempts = []
    i = 0
    tmp_path = Path(tmp_path)
    while i < len(plan):
        n, seed = plan[i]
        rec = {"numFrames": n, "seed": seed}
        t0 = time.time()
        try:
            frames = generate_fn(n, seed)
            stats = analyze_frames(frames)
            rec["motion"] = round(stats["motion"], 3)
            if stats["degenerate"]:
                raise BadOutput(stats["reason"])
            method = write_video(frames, tmp_path, fps)
            ok, info = verify_video(tmp_path, len(frames), width, height)
            if not ok:
                raise BadOutput(f"file video không hợp lệ: {info}")
            rec.update(outcome="ok", method=method, info=info, sec=round(time.time() - t0, 1))
            attempts.append(rec)
            return {"ok": True, "numFrames": n, "seed": seed, "attempts": attempts,
                    "motion": stats["motion"], "info": info}
        except Exception as e:  # noqa: BLE001
            oom = is_oom(e)
            rec.update(outcome="oom" if oom else "error",
                       error=f"{type(e).__name__}: {e}", sec=round(time.time() - t0, 1))
            attempts.append(rec)
            log(f"   ⚠️ Lần thử {len(attempts)} ({n} khung, seed {seed}) thất bại: {rec['error']}")
            if not isinstance(e, (BadOutput, RuntimeError, ValueError)) and not oom:
                log("      " + traceback.format_exc().strip().splitlines()[-1])
            try:
                if tmp_path.exists():
                    tmp_path.unlink()
            except OSError:
                pass
            if cleanup_fn:
                cleanup_fn()
            if oom:
                nxt = next((j for j in range(i + 1, len(plan)) if plan[j][0] < n), None)
                if nxt is None:
                    break
                i = nxt
            else:
                i += 1
    err = attempts[-1]["error"] if attempts else "không có lần thử nào"
    return {"ok": False, "attempts": attempts, "error": err}


# ---------------------------------------------------------------------------
# Embeddings (cache có hash)
# ---------------------------------------------------------------------------
def read_embed_file(path: Path, expected_hash: str):
    data = torch.load(path, map_location="cpu", weights_only=True)
    if not isinstance(data, dict):
        raise ValueError("file embeddings sai định dạng")
    if data.get("version") != CACHE_VERSION:
        raise ValueError("embeddings phiên bản cũ")
    if data.get("prompt_hash") != expected_hash:
        raise ValueError("prompt đã thay đổi so với cache")
    for key in ("prompt_embeds", "prompt_attention_mask",
                "negative_prompt_embeds", "negative_prompt_attention_mask"):
        if key not in data:
            raise ValueError(f"thiếu khóa {key}")
    for key in ("prompt_embeds", "negative_prompt_embeds"):
        if not torch.isfinite(data[key].float()).all():
            raise ValueError(f"{key} chứa NaN/inf")
    return data


def embeds_valid(path: Path, expected_hash: str) -> bool:
    try:
        if not path.exists():
            return False
        read_embed_file(path, expected_hash)
        return True
    except Exception:
        return False


def job_negative(job) -> str:
    return str(job.get("negativePrompt") or DEFAULT_NEGATIVE_PROMPT)


def job_hash(job) -> str:
    return prompt_hash(str(job.get("prompt", "")), job_negative(job))


def embed_path(cache_dir: Path, shot_id: str) -> Path:
    return cache_dir / f"{shot_id}_embeds.pt"


def load_text_encoder(dtype):
    base = dict(subfolder="text_encoder", torch_dtype=dtype, low_cpu_mem_usage=True)
    use_cuda = torch.cuda.is_available()
    if use_cuda:
        try:
            return T5EncoderModel.from_pretrained(MODEL_ID, device_map={"": 0}, **base).eval()
        except Exception as e:  # noqa: BLE001
            print(f"   ℹ️ Nạp thẳng lên GPU không được ({type(e).__name__}: {e}); thử nạp qua CPU...")
            cleanup_memory()
    model = T5EncoderModel.from_pretrained(MODEL_ID, **base)
    if use_cuda:
        model = model.to("cuda")
    return model.eval()


def encode_text(tokenizer, text_encoder, text: str):
    ids_full = tokenizer(text, add_special_tokens=True).input_ids
    if len(ids_full) > MAX_SEQ_LEN:
        print(f"   ⚠️ Prompt dài {len(ids_full)} token, bị cắt còn {MAX_SEQ_LEN}.")
    inputs = tokenizer(text, padding="max_length", max_length=MAX_SEQ_LEN,
                       truncation=True, add_special_tokens=True, return_tensors="pt")
    ids = inputs.input_ids.to(text_encoder.device)
    mask = inputs.attention_mask.to(text_encoder.device)
    with torch.no_grad():
        emb = text_encoder(ids, attention_mask=mask)[0]
    emb = emb.float().cpu()
    if not torch.isfinite(emb).all():
        raise ValueError("embeddings chứa NaN/inf (tràn số)")
    if float(emb.abs().max()) > FP16_MAX:
        print("   ⚠️ Embeddings vượt ngưỡng fp16, đã cắt về giới hạn an toàn.")
        emb = emb.clamp(-FP16_MAX, FP16_MAX)
    return emb.to(torch.float16), mask.cpu().bool()


def phase_1_encode_prompts(jobs, cache_dir: Path) -> bool:
    """Pha 1: mã hóa prompt bằng T5 rồi giải phóng bộ nhớ. Chỉ nạp T5 nếu cần."""
    print("\n📦 [PHA 1/2] MÃ HÓA PROMPT VỚI T5 (QUY TRÌNH TIẾT KIỆM RAM)")
    cache_dir.mkdir(parents=True, exist_ok=True)

    needed = [j for j in jobs if not embeds_valid(embed_path(cache_dir, j["shotId"]), job_hash(j))]
    if not needed:
        print("   ⏭️ Tất cả embeddings trong cache đều hợp lệ, bỏ qua việc nạp T5.")
        return True
    print(f"   📝 Cần mã hóa {len(needed)}/{len(jobs)} prompt.")

    last_err = None
    for dtype in (torch.bfloat16, torch.float16):
        name = str(dtype).replace("torch.", "")
        text_encoder = None
        tokenizer = None
        try:
            print(f"   ⏳ Đang nạp Tokenizer & T5EncoderModel ({name}) từ {MODEL_ID}...")
            tokenizer = retry_call(
                lambda: T5Tokenizer.from_pretrained(MODEL_ID, subfolder="tokenizer"),
                "Nạp tokenizer")
            text_encoder = retry_call(lambda d=dtype: load_text_encoder(d), "Nạp T5 text encoder")

            neg_cache = {}
            for job in needed:
                shot_id = job["shotId"]
                neg = job_negative(job)
                if neg not in neg_cache:
                    neg_cache[neg] = encode_text(tokenizer, text_encoder, neg)
                print(f"   ✍️ Đang mã hóa prompt cho [{shot_id}]...")
                emb, mask = encode_text(tokenizer, text_encoder, str(job["prompt"]))
                neg_emb, neg_mask = neg_cache[neg]
                out = embed_path(cache_dir, shot_id)
                tmp = out.with_name(out.name + ".part")
                torch.save({
                    "version": CACHE_VERSION,
                    "prompt_hash": job_hash(job),
                    "prompt_embeds": emb,
                    "prompt_attention_mask": mask,
                    "negative_prompt_embeds": neg_emb,
                    "negative_prompt_attention_mask": neg_mask,
                }, tmp)
                os.replace(tmp, out)
            print(f"   ✅ Đã lưu {len(needed)} tệp embeddings vào {cache_dir}/")
            last_err = None
            break
        except Exception as e:  # noqa: BLE001
            last_err = e
            print(f"   ⚠️ Mã hóa với {name} thất bại ({type(e).__name__}: {e}).")
            if dtype is torch.bfloat16:
                print("      → Thử lại với float16...")
        finally:
            print("   🧹 Đang giải phóng T5Encoder khỏi bộ nhớ...")
            del text_encoder
            del tokenizer
            cleanup_memory()

    mem = check_system_memory()
    print(f"   ✨ RAM khả dụng: {mem['ram_free_gb']} GB / {mem['ram_total_gb']} GB")
    if last_err is not None:
        print(f"   ❌ Không mã hóa được prompt: {last_err}")
        return False
    return True


# ---------------------------------------------------------------------------
# Pha 2: sinh clip
# ---------------------------------------------------------------------------
def mirror_file(src: Path, mirror_dir, slug: str) -> None:
    """Chép sang Google Drive (không làm hỏng job nếu Drive lỗi)."""
    if not mirror_dir:
        return
    try:
        dest_dir = Path(mirror_dir) / slug
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / src.name
        if not dest.exists() or dest.stat().st_size != src.stat().st_size:
            shutil.copy2(src, dest)
    except Exception as e:  # noqa: BLE001
        print(f"   ⚠️ Không chép được {src.name} sang {mirror_dir}: {e}")


def clean_job_files(job, failed_dir: Path, remove_pending: bool) -> None:
    shot_id = job["shotId"]
    try:
        rec = failed_dir / f"{shot_id}.json"
        if rec.exists():
            rec.unlink()
        if remove_pending:
            p = Path(job.get("_source_path", ""))
            if p.is_file():
                p.unlink()
    except OSError:
        pass


def finalize_success(job, env, outcome, tmp_path: Path, final_path: Path, requested: int, elapsed: float):
    shot_id = job["shotId"]
    if final_path.exists():
        final_path.unlink()
    os.replace(tmp_path, final_path)
    degraded = outcome["numFrames"] != requested
    size_mb = round(final_path.stat().st_size / (1024 * 1024), 2)
    flag = f" ⚠️ hạ cấp {requested}→{outcome['numFrames']} khung" if degraded else ""
    print(f"   🎉 XUẤT THÀNH CÔNG: {final_path} ({size_mb} MB trong {elapsed}s){flag}")
    if outcome["motion"] < 0.05:
        print("   ⚠️ Chuyển động rất thấp (clip gần như đứng yên), nên xem lại.")

    record = {k: v for k, v in job.items() if k != "_source_path"}
    record.update(status="completed", completedAt=time.strftime("%Y-%m-%d %H:%M:%S"),
                  elapsedSec=elapsed, numFramesUsed=outcome["numFrames"],
                  seedUsed=outcome["seed"], attempts=outcome["attempts"])
    json_done = env.done_dir / f"{shot_id}.json"
    write_json(json_done, record)
    clean_job_files(job, env.failed_dir, remove_pending=True)
    mirror_file(final_path, env.mirror_dir, env.slug)
    mirror_file(json_done, env.mirror_dir, env.slug)
    return {"shotId": shot_id, "status": "degraded" if degraded else "ok",
            "numFrames": outcome["numFrames"], "attempts": len(outcome["attempts"]),
            "elapsedSec": elapsed, "error": "", "motion": round(outcome["motion"], 3)}


def load_pipeline():
    print(f"   ⏳ Đang nạp Tokenizer từ {MODEL_ID}...")
    tokenizer = retry_call(lambda: T5Tokenizer.from_pretrained(MODEL_ID, subfolder="tokenizer"),
                           "Nạp tokenizer")
    print(f"   ⏳ Đang nạp LTXImageToVideoPipeline từ {MODEL_ID} (text_encoder=None)...")
    return retry_call(
        lambda: LTXImageToVideoPipeline.from_pretrained(
            MODEL_ID, text_encoder=None, tokenizer=tokenizer, torch_dtype=torch.float16),
        "Nạp pipeline LTX-Video")


def phase_2_render_clips(jobs, env) -> list:
    print("\n🎬 [PHA 2/2] NẠP LTX-VIDEO (KHÔNG TEXT ENCODER) & SINH VIDEO")
    results = []

    # Chỉ nạp pipeline nếu còn job thực sự cần sinh
    todo = [j for j in jobs if env.force or not (env.done_dir / f"{j['shotId']}.mp4").exists()
            or not verify_video(env.done_dir / f"{j['shotId']}.mp4")[0]]
    runnable = [j for j in todo if embeds_valid(embed_path(env.cache_dir, j["shotId"]), job_hash(j))]
    env.pipe = None
    if runnable:
        try:
            env.pipe = load_pipeline()
        except Exception as e:  # noqa: BLE001
            print(f"   ❌ Lỗi nạp pipeline: {type(e).__name__}: {e}")
        if env.pipe is not None:
            print(f"   🚀 Chuyển pipeline lên {env.device} (Float16)...")
            env.pipe.to(env.device)
            vae = getattr(env.pipe, "vae", None)
            if vae is not None:
                try:
                    vae.enable_tiling()
                    vae.enable_slicing()
                    print("   - VAE tiling & slicing: ✅ BẬT (bảo vệ VRAM)")
                except Exception:
                    pass
            mem = check_system_memory()
            print(f"   📊 VRAM trống sau khi nạp: {mem['vram_free_gb']} / {mem['vram_total_gb']} GB")

    env.total = len(jobs)
    for idx, job in enumerate(jobs, start=1):
        env.index = idx
        shot_id = job["shotId"]
        try:
            if env.pipe is None and job in runnable:
                results.append(_record_failure(job, env, "không nạp được pipeline LTX-Video"))
                continue
            res = process_job(job, env)
        except KeyboardInterrupt:
            raise
        except Exception as e:  # noqa: BLE001
            traceback.print_exc()
            res = _record_failure(job, env, f"lỗi không lường trước: {type(e).__name__}: {e}")
        results.append(res)
        cleanup_memory()
    return results


def _record_failure(job, env, reason: str, attempts=None) -> dict:
    shot_id = job["shotId"]
    record = {k: v for k, v in job.items() if k != "_source_path"}
    record.update(status="failed", error=reason, attempts=attempts or [],
                  failedAt=time.strftime("%Y-%m-%d %H:%M:%S"))
    try:
        write_json(env.failed_dir / f"{shot_id}.json", record)
    except OSError:
        pass
    print(f"   ❌ {shot_id} THẤT BẠI: {reason}")
    return {"shotId": shot_id, "status": "failed", "numFrames": None, "attempts": 0,
            "elapsedSec": 0.0, "error": reason}


def process_job(job, env) -> dict:
    """Sinh một clip: kiểm tra đầu vào, thử lại theo bậc, chốt file nếu thành công."""
    shot_id = job["shotId"]
    final_path = env.done_dir / f"{shot_id}.mp4"
    tmp_path = env.done_dir / f"_partial_{shot_id}.mp4"
    failed_dir = env.failed_dir
    width = snap32(job.get("width"), DEFAULT_WIDTH)
    height = snap32(job.get("height"), DEFAULT_HEIGHT)
    fps = job.get("fps", 24)

    if not env.force and final_path.exists():
        ok, info = verify_video(final_path, None, width, height)
        if ok:
            print(f"\n⏭️ {shot_id} đã hoàn thành ({info}), bỏ qua.")
            clean_job_files(job, failed_dir, remove_pending=True)
            mirror_file(final_path, env.mirror_dir, env.slug)
            return {"shotId": shot_id, "status": "skipped", "numFrames": None, "attempts": 0,
                    "elapsedSec": 0.0, "error": ""}
        print(f"\n♻️ {shot_id}: file cũ không hợp lệ ({info}), sinh lại.")
        final_path.unlink()

    print(f"\n🚀 [{env.index}/{env.total}] Đang xử lý job: {shot_id}")

    src_path, raw = find_source_image(job, env.root_dir, env.slug)
    if src_path is None:
        return _record_failure(job, env, f"không tìm thấy ảnh nguồn: {raw or '(trống)'}")
    try:
        data = read_embed_file(embed_path(env.cache_dir, shot_id), job_hash(job))
    except Exception as e:  # noqa: BLE001
        return _record_failure(job, env, f"embeddings không dùng được: {e}")
    try:
        init_image = resize_to_target(Image.open(src_path), width, height)
    except Exception as e:  # noqa: BLE001
        return _record_failure(job, env, f"không đọc được ảnh nguồn {src_path.name}: {e}")

    device = env.device
    prompt_embeds = data["prompt_embeds"].to(device, dtype=torch.float16)
    prompt_mask = data["prompt_attention_mask"].bool().to(device)
    neg_embeds = data["negative_prompt_embeds"].to(device, dtype=torch.float16)
    neg_mask = data["negative_prompt_attention_mask"].bool().to(device)
    del data

    def generate_fn(num_frames: int, seed: int):
        generator = torch.Generator(device=device.type).manual_seed(int(seed))
        with torch.inference_mode():
            output = env.pipe(
                image=init_image,
                prompt_embeds=prompt_embeds,
                prompt_attention_mask=prompt_mask,
                negative_prompt_embeds=neg_embeds,
                negative_prompt_attention_mask=neg_mask,
                width=width,
                height=height,
                num_frames=num_frames,
                frame_rate=fps,
                num_inference_steps=int(job.get("numSteps", 30)),
                guidance_scale=float(job.get("guidanceScale", 3.0)),
                max_sequence_length=MAX_SEQ_LEN,
                generator=generator,
            )
        return output.frames[0]

    requested = normalize_frame_count(job.get("numFrames", 49))
    plan = build_attempt_plan(requested, int(job.get("seed", 42)), env.max_attempts)
    start = time.time()
    try:
        outcome = run_attempts(generate_fn, plan, tmp_path, fps, width, height,
                               cleanup_fn=cleanup_memory)
    except BaseException:
        try:
            if tmp_path.exists():
                tmp_path.unlink()
        except OSError:
            pass
        raise
    finally:
        del prompt_embeds, prompt_mask, neg_embeds, neg_mask, init_image
        cleanup_memory()
    elapsed = round(time.time() - start, 1)

    if not outcome["ok"]:
        res = _record_failure(job, env, outcome["error"], outcome["attempts"])
        res.update(attempts=len(outcome["attempts"]), elapsedSec=elapsed)
        return res
    return finalize_success(job, env, outcome, tmp_path, final_path, requested, elapsed)


# ---------------------------------------------------------------------------
# Kiểm tra trước khi chạy, báo cáo, main
# ---------------------------------------------------------------------------
def preflight(root_dir: Path, allow_cpu: bool) -> bool:
    ok = True
    if BASIC_IMPORT_ERRORS:
        print("❌ Thiếu thư viện cơ bản: " + "; ".join(BASIC_IMPORT_ERRORS))
        ok = False
    if not AI_AVAILABLE:
        print(f"❌ Không nạp được thư viện AI: {AI_IMPORT_ERROR}")
        print("   → Hãy chạy ô 'Cài đặt môi trường' của notebook rồi chạy lại.")
        return False
    if not torch.cuda.is_available():
        if allow_cpu:
            print("⚠️ Không có GPU, chạy bằng CPU (rất chậm).")
        else:
            print("❌ Không có GPU CUDA. Vào Runtime → Change runtime type → chọn T4 GPU, rồi chạy lại.")
            ok = False
    else:
        mem = check_system_memory()
        if mem["vram_free_gb"] < 8:
            print(f"⚠️ VRAM trống chỉ {mem['vram_free_gb']} GB (cần ~8 GB). "
                  "Hãy Runtime → Restart session nếu gặp lỗi bộ nhớ.")
    try:
        free_gb = shutil.disk_usage(root_dir).free / 1e9
        if free_gb < 3:
            print(f"❌ Ổ đĩa còn trống {free_gb:.1f} GB, không đủ để chạy.")
            ok = False
        elif free_gb < 15:
            print(f"⚠️ Ổ đĩa còn trống {free_gb:.1f} GB, có thể không đủ để tải model.")
    except Exception:
        pass
    return ok


def load_jobs(pending_dir: Path, only, limit):
    jobs, bad = [], []
    files = sorted(pending_dir.glob("*.json")) if pending_dir.exists() else []
    for pf in files:
        try:
            data = json.loads(pf.read_text(encoding="utf-8"))
            if not data.get("shotId") or not str(data.get("prompt", "")).strip():
                raise ValueError("thiếu shotId hoặc prompt")
            data["_source_path"] = str(pf)
            jobs.append(data)
        except Exception as e:  # noqa: BLE001
            bad.append({"shotId": pf.stem, "status": "failed", "numFrames": None, "attempts": 0,
                        "elapsedSec": 0.0, "error": f"file job hỏng ({pf.name}): {e}"})
            print(f"⚠️ Lỗi đọc job {pf}: {e}")
    if only:
        wanted = set(only)
        jobs = [j for j in jobs if j["shotId"] in wanted]
    if limit:
        jobs = jobs[:limit]
    return jobs, bad


def summarize(results) -> dict:
    s = {"ok": 0, "degraded": 0, "skipped": 0, "failed": 0}
    for r in results:
        s[r["status"]] = s.get(r["status"], 0) + 1
    return s


def print_summary(results) -> None:
    icons = {"ok": "✅", "degraded": "🟡", "skipped": "⏭️", "failed": "❌"}
    print("\n" + "=" * 65)
    print("📋 BÁO CÁO KẾT QUẢ")
    print("=" * 65)
    for r in results:
        extra = ""
        if r["status"] == "degraded":
            extra = f" (hạ cấp còn {r['numFrames']} khung)"
        elif r["status"] == "failed":
            extra = f" - {r['error']}"
        print(f" {icons.get(r['status'], '?')} {r['shotId']}: {r['status']}{extra}")
    s = summarize(results)
    print(f"\n Tổng: {s['ok']} ok, {s['degraded']} hạ cấp, {s['skipped']} bỏ qua, {s['failed']} lỗi")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Colab Worker for LTX-Video Generation")
    parser.add_argument("--slug", type=str, default="natural-cycle-v2", help="Mã slug dự án")
    parser.add_argument("--root", type=str, default=".", help="Đường dẫn gốc thư mục dự án")
    parser.add_argument("--only", nargs="+", default=None, help="Chỉ chạy các shot này (vd: shot_01 shot_05)")
    parser.add_argument("--limit", type=int, default=0, help="Chỉ chạy N job đầu tiên")
    parser.add_argument("--mirror-dir", type=str, default=os.environ.get("WORKER_MIRROR_DIR", ""),
                        help="Chép từng clip xong sang thư mục này (vd: Google Drive)")
    parser.add_argument("--max-attempts", type=int, default=4, help="Số lần thử tối đa cho mỗi shot")
    parser.add_argument("--force", action="store_true", help="Sinh lại cả shot đã có clip hợp lệ")
    parser.add_argument("--allow-cpu", action="store_true", help="Cho phép chạy khi không có GPU")
    parser.add_argument("--version", action="store_true", help="In phiên bản rồi thoát")
    args = parser.parse_args(argv)

    if args.version:
        print(f"colab_worker {WORKER_VERSION}")
        return 0

    print_banner()
    root_dir = Path(args.root).resolve()
    slug = args.slug
    pending_dir = root_dir / "jobs" / "pending" / slug
    done_dir = root_dir / "jobs" / "done" / slug
    failed_dir = root_dir / "jobs" / "failed" / slug
    cache_dir = root_dir / "jobs" / ".cache" / slug

    if not preflight(root_dir, args.allow_cpu):
        return 2

    mem = check_system_memory()
    print("📊 Tài nguyên hệ thống:")
    print(f"   - GPU: {mem['gpu_name']} (VRAM trống: {mem['vram_free_gb']} / {mem['vram_total_gb']} GB)")
    print(f"   - RAM: {mem['ram_free_gb']} GB khả dụng / {mem['ram_total_gb']} GB tổng")

    jobs, bad = load_jobs(pending_dir, args.only, args.limit)
    if not jobs and not bad:
        print(f"\nℹ️ Không có job pending nào trong {pending_dir}/")
        return 0

    print(f"\n📋 Đã tìm thấy {len(jobs)} jobs trong hàng đợi:")
    for j in jobs:
        print(f"   - {j['shotId']}: {str(j['prompt'])[:60]}...")

    done_dir.mkdir(parents=True, exist_ok=True)
    failed_dir.mkdir(parents=True, exist_ok=True)
    for stale in done_dir.glob("_partial_*.mp4"):
        try:
            stale.unlink()
        except OSError:
            pass

    env = SimpleNamespace(
        root_dir=root_dir, slug=slug, done_dir=done_dir, failed_dir=failed_dir, cache_dir=cache_dir,
        mirror_dir=args.mirror_dir or "", force=args.force, max_attempts=args.max_attempts,
        device=torch.device("cuda" if torch.cuda.is_available() else "cpu"),
        pipe=None, index=0, total=len(jobs),
    )

    started = time.strftime("%Y-%m-%d %H:%M:%S")
    results = list(bad)
    interrupted = False
    try:
        phase_1_encode_prompts(jobs, cache_dir)
        results += phase_2_render_clips(jobs, env)
    except KeyboardInterrupt:
        interrupted = True
        print("\n⏹️ Đã bị dừng thủ công. Chạy lại để tiếp tục từ shot chưa xong.")
    finally:
        done_shots = {r["shotId"] for r in results}
        for j in jobs:
            if j["shotId"] not in done_shots:
                results.append({"shotId": j["shotId"], "status": "failed", "numFrames": None,
                                "attempts": 0, "elapsedSec": 0.0,
                                "error": "chưa được xử lý (bị dừng hoặc lỗi ở pha trước)"})
        report = {"worker": WORKER_VERSION, "slug": slug, "startedAt": started,
                  "finishedAt": time.strftime("%Y-%m-%d %H:%M:%S"),
                  "summary": summarize(results), "results": results}
        report_path = root_dir / "jobs" / f"report-{slug}.json"
        try:
            write_json(report_path, report)
            mirror_file(report_path, args.mirror_dir, slug)
        except OSError as e:
            print(f"⚠️ Không ghi được báo cáo: {e}")
        print_summary(results)
        print(f"\n📄 Báo cáo chi tiết: {report_path}")

    print("\n🏁 WORKER ĐÃ HOÀN TẤT VÒNG LẶP XỬ LÝ!")
    if interrupted:
        return 130
    return 1 if summarize(results)["failed"] else 0


if __name__ == "__main__":
    sys.exit(main())
