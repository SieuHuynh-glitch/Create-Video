import sys
import os
from PIL import Image
import numpy as np

def normalize_image(src: str, dest: str, width: int = 1920, height: int = 1080, is_mono: bool = True):
    if not os.path.exists(src):
        print(f"Error: {src} does not exist", file=sys.stderr)
        sys.exit(1)
        
    img = Image.open(src)
    
    if is_mono:
        img = img.convert("L")
    else:
        img = img.convert("RGB")
        
    img = img.resize((width, height), Image.Resampling.LANCZOS)
    
    if is_mono:
        arr = np.array(img, dtype=np.float32)
        h, w = arr.shape
        border_px = min(40, min(h, w) // 10)
        top = arr[:border_px, :]
        bottom = arr[h-border_px:, :]
        left = arr[:, :border_px]
        right = arr[:, w-border_px:]
        borders = np.concatenate([top.flatten(), bottom.flatten(), left.flatten(), right.flatten()])

        # Neo diem trang theo phan vi 92nd percentile cua dai vien
        white_anchor = float(np.percentile(borders, 92))
        white_anchor = max(215.0, min(252.0, white_anchor))

        # Neo diem den theo phan vi 2nd percentile
        black_anchor = float(np.percentile(arr, 2))
        black_anchor = max(0.0, min(25.0, black_anchor))

        # Chuan hoa tuyen tinh tu [black_anchor, white_anchor] -> [0, 255]
        normalized = (arr - black_anchor) / (white_anchor - black_anchor) * 255.0

        # Soft-knee roll-off o vung sang (> 230) bang duong cong Hermite S-Curve
        knee_start = 230.0
        mask_high = normalized > knee_start
        t_high = np.clip((normalized - knee_start) / (255.0 - knee_start), 0.0, 1.0)
        smooth_high = knee_start + (255.0 - knee_start) * (t_high * t_high * (3.0 - 2.0 * t_high))
        normalized[mask_high] = smooth_high[mask_high]

        # Soft-toe o vung toi (< 15) bang duong cong Hermite
        toe_end = 15.0
        mask_low = normalized < toe_end
        t_low = np.clip(normalized / toe_end, 0.0, 1.0)
        smooth_low = toe_end * (t_low * t_low * (3.0 - 2.0 * t_low))
        normalized[mask_low] = smooth_low[mask_low]

        stretched = np.clip(normalized, 0.0, 255.0).astype(np.uint8)
        norm_img = Image.fromarray(stretched).convert("RGB")
    else:
        norm_img = img
        
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    norm_img.save(dest, quality=95)
    print(f"Normalized successfully: {src} -> {dest} ({width}x{height}, mono={is_mono})")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python normalize_image.py <src> <dest> [width] [height] [is_mono]", file=sys.stderr)
        sys.exit(1)
        
    src = sys.argv[1]
    dest = sys.argv[2]
    w = int(sys.argv[3]) if len(sys.argv) > 3 else 1920
    h = int(sys.argv[4]) if len(sys.argv) > 4 else 1080
    mono = sys.argv[5].lower() in ("1", "true", "yes") if len(sys.argv) > 5 else True
    
    normalize_image(src, dest, w, h, mono)
