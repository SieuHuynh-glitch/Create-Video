"""
Mô-đun kiểm tra tiền khả thi (Preflight) và ghi nhật ký bộ nhớ chuẩn mực cho Colab.
"""
import os
import csv
import time
from datetime import datetime
from pathlib import Path
import psutil
import torch

def preflight_check(min_free_vram_gb: float = 2.0, min_avail_ram_gb: float = 2.5) -> dict:
    """
    Kiểm tra tài nguyên thời gian thực trước khi sinh shot.
    Ném lỗi nếu tài nguyên thấp hơn ngưỡng an toàn.
    """
    if not torch.cuda.is_available():
        raise RuntimeError("Không tìm thấy GPU CUDA trên hệ thống!")

    free_vram_bytes, total_vram_bytes = torch.cuda.mem_get_info()
    free_vram_gb = free_vram_bytes / (1024 ** 3)
    total_vram_gb = total_vram_bytes / (1024 ** 3)

    mem = psutil.virtual_memory()
    avail_ram_gb = mem.available / (1024 ** 3)
    total_ram_gb = mem.total / (1024 ** 3)

    stats = {
        "free_vram_gb": free_vram_gb,
        "total_vram_gb": total_vram_gb,
        "avail_ram_gb": avail_ram_gb,
        "total_ram_gb": total_ram_gb,
    }

    if free_vram_gb < min_free_vram_gb or avail_ram_gb < min_avail_ram_gb:
        raise RuntimeError(
            f"❌ CẢNH BÁO BỘ NHỚ THẤP: VRAM trống {free_vram_gb:.2f}GB / {total_vram_gb:.2f}GB, "
            f"RAM trống {avail_ram_gb:.2f}GB / {total_ram_gb:.2f}GB. "
            f"Dừng an toàn trước khi chạy để tránh crash kernel!"
        )

    # Đặt lại bộ đếm peak stats trước khi chạy shot
    torch.cuda.reset_peak_memory_stats()
    return stats

def log_memory_shot(
    csv_path: Path,
    shot_id: str,
    duration_sec: float,
    config_level: str,
    status: str,
    model_name: str,
    error_msg: str = ""
):
    """
    Ghi thông số bộ nhớ chi tiết của shot vào file CSV để theo dõi.
    """
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    file_exists = csv_path.exists()

    peak_vram_gb = torch.cuda.max_memory_allocated() / (1024 ** 3) if torch.cuda.is_available() else 0.0
    mem = psutil.virtual_memory()
    used_ram_gb = (mem.total - mem.available) / (1024 ** 3)

    fieldnames = [
        "shot_id", "timestamp", "peak_vram_gb", "used_ram_gb",
        "duration_sec", "config_level", "status", "model", "error"
    ]

    with open(csv_path, mode="a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerow({
            "shot_id": shot_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "peak_vram_gb": round(peak_vram_gb, 2),
            "used_ram_gb": round(used_ram_gb, 2),
            "duration_sec": round(duration_sec, 2),
            "config_level": config_level,
            "status": status,
            "model": model_name,
            "error": error_msg[:120],
        })
