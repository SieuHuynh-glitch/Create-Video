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
        # Stretch colorlevels: rimin=0.04 (10), rimax=0.86 (220)
        # Push all off-white/gray >= 220 to 255 pure white, and ink <= 10 to 0 pure black
        stretched = np.clip((arr - 10.0) / (220.0 - 10.0) * 255.0, 0.0, 255.0).astype(np.uint8)
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
