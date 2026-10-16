import sys
import os
import json
from PIL import Image

def main():
    if len(sys.argv) < 3:
        print("Usage: python render_contact_sheet.py '<json_file_list>' <output_path>")
        sys.exit(1)

    arg1 = sys.argv[1]
    if os.path.isfile(arg1):
        with open(arg1, "r", encoding="utf-8") as f:
            paths = json.load(f)
    else:
        paths = json.loads(arg1)
    out_p = sys.argv[2]

    if not paths:
        print("No images to render.")
        sys.exit(0)

    cols = min(len(paths), 3)
    rows = (len(paths) + cols - 1) // cols
    canvas = Image.new('RGB', (cols * 640, rows * 360), (15, 15, 15))

    for idx, p in enumerate(paths):
        try:
            if not os.path.exists(p):
                continue
            img = Image.open(p).convert('RGB')
            w, h = img.size
            target_ratio = 16 / 9
            if w / h > target_ratio:
                new_w = int(h * target_ratio)
                left = (w - new_w) // 2
                img = img.crop((left, 0, left + new_w, h))
            else:
                new_h = int(w / target_ratio)
                top = (h - new_h) // 2
                img = img.crop((0, top, w, top + new_h))
            img = img.resize((640, 360), Image.Resampling.LANCZOS)
            x = (idx % cols) * 640
            y = (idx // cols) * 360
            canvas.paste(img, (x, y))
        except Exception as e:
            print(f"Error loading {p}: {e}")

    os.makedirs(os.path.dirname(os.path.abspath(out_p)), exist_ok=True)
    canvas.save(out_p, quality=90)
    print(f"Successfully saved {out_p}")

if __name__ == "__main__":
    main()
