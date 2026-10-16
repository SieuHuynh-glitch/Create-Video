"""
Mô-đun đồng bộ Google Drive và cơ chế Checkpoint/Resume chống mất dữ liệu khi Colab ngắt kết nối.
"""
import os
import shutil
from pathlib import Path

def setup_google_drive(folder_name: str = "Create-Video-Outputs") -> Path:
    """
    Mount Google Drive an toàn và tạo thư mục lưu trữ vĩnh viễn.
    """
    try:
        from google.colab import drive
        drive.mount("/content/drive")
        drive_dir = Path("/content/drive/MyDrive") / folder_name
        drive_dir.mkdir(parents=True, exist_ok=True)
        print(f"✅ Đã kết nối Google Drive thành công: {drive_dir}")
        return drive_dir
    except ImportError:
        print("ℹ️ Không phát hiện môi trường Google Colab, sử dụng thư mục cục bộ.")
        local_dir = Path("runs/outputs")
        local_dir.mkdir(parents=True, exist_ok=True)
        return local_dir

def save_and_sync_shot(local_clip_path: Path, drive_dir: Path) -> bool:
    """
    Sao lưu clip ngay sau khi xuất sang Google Drive để bảo vệ dữ liệu.
    """
    if not local_clip_path.exists() or local_clip_path.stat().st_size < 1024 * 50:
        print(f"❌ File {local_clip_path.name} không hợp lệ để đồng bộ!")
        return False

    drive_dest = drive_dir / local_clip_path.name
    shutil.copy2(str(local_clip_path), str(drive_dest))
    print(f"💾 Đã sao lưu an toàn sang Google Drive: {drive_dest.name} ({drive_dest.stat().st_size / 1024 / 1024:.2f} MB)")
    return True

def should_skip_shot(local_clip_path: Path, drive_dir: Path, force: bool = False) -> bool:
    """
    Kiểm tra xem shot đã được sinh hợp lệ ở Local hoặc trên Drive chưa.
    Nếu có rồi thì bỏ qua (cơ chế Resume).
    """
    if force:
        return False

    drive_clip = drive_dir / local_clip_path.name
    # Kiểm tra tồn tại trên Drive trước
    if drive_clip.exists() and drive_clip.stat().st_size > 1024 * 500:
        if not local_clip_path.exists():
            shutil.copy2(str(drive_clip), str(local_clip_path))
        print(f"✨ Shot {local_clip_path.stem} đã có sẵn trên Drive, bỏ qua.")
        return True

    # Kiểm tra tồn tại cục bộ
    if local_clip_path.exists() and local_clip_path.stat().st_size > 1024 * 500:
        print(f"✨ Shot {local_clip_path.stem} đã có sẵn cục bộ, bỏ qua.")
        return True

    return False
