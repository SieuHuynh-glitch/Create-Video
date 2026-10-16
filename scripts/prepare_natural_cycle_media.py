import os
import math
from PIL import Image, ImageDraw, ImageFilter

MEDIA_DIR = "runs/natural-cycle/media"

def create_seedling_scenes():
    # Load base soil image
    soil_img = Image.open(os.path.join(MEDIA_DIR, "scene_04_soil.jpg")).convert("RGB")
    W, H = soil_img.size

    # Draw organic sprout in the center
    # Create an overlay for the sprout
    overlay = Image.new("RGBA", (W, H), (255, 255, 255, 0))
    draw = ImageDraw.Draw(overlay)

    # Sprout base at center soil
    base_x = W // 2
    base_y = 660 # Soil surface level in scene_04

    # Draw stem with organic curve
    stem_points = [
        (base_x, base_y),
        (base_x - 3, base_y - 40),
        (base_x - 5, base_y - 80),
        (base_x - 2, base_y - 120),
        (base_x, base_y - 150)
    ]
    draw.line(stem_points, fill=(10, 10, 10, 255), width=6)

    # Draw left feather-like leaf
    leaf_l = [
        (base_x - 2, base_y - 130),
        (base_x - 30, base_y - 160),
        (base_x - 70, base_y - 180),
        (base_x - 50, base_y - 150),
        (base_x - 20, base_y - 135)
    ]
    draw.polygon(leaf_l, fill=(15, 15, 15, 255))

    # Draw right feather-like leaf
    leaf_r = [
        (base_x, base_y - 140),
        (base_x + 35, base_y - 170),
        (base_x + 80, base_y - 190),
        (base_x + 60, base_y - 160),
        (base_x + 20, base_y - 145)
    ]
    draw.polygon(leaf_r, fill=(15, 15, 15, 255))

    # Composite sprout onto soil
    seedling_img = Image.alpha_composite(soil_img.convert("RGBA"), overlay).convert("RGB")
    seedling_path = os.path.join(MEDIA_DIR, "scene_05_seedling.jpg")
    seedling_img.save(seedling_path, quality=95)
    print(f"Created {seedling_path}")

    # Scene 06: Camera Selects Seedling (Zoom 1.8x into the sprout)
    crop_w = int(W / 1.7)
    crop_h = int(H / 1.7)
    crop_x1 = (W - crop_w) // 2
    crop_y1 = base_y - 250
    crop_x2 = crop_x1 + crop_w
    crop_y2 = crop_y1 + crop_h

    zoom_crop = seedling_img.crop((crop_x1, crop_y1, crop_x2, crop_y2))
    zoom_img = zoom_crop.resize((W, H), Image.Resampling.LANCZOS)
    zoom_path = os.path.join(MEDIA_DIR, "scene_06_seedling_zoom.jpg")
    zoom_img.save(zoom_path, quality=95)
    print(f"Created {zoom_path}")

def create_tree_and_falling_scenes():
    # Load scene_08_tree_fruits
    tree_fruits = Image.open(os.path.join(MEDIA_DIR, "scene_08_tree_fruits.jpg")).convert("RGB")
    W, H = tree_fruits.size

    # Create scene_07_tree_growing by whiting out the hanging skull fruits
    tree_growing = tree_fruits.copy()
    draw_grow = ImageDraw.Draw(tree_growing)

    # Fruit bounding coordinates in scene_08:
    # 1. Left fruit: x~450..580, y~400..550
    # 2. Bottom center fruit: x~750..860, y~520..660
    # 3. Top fruit: x~1050..1160, y~200..340
    # 4. Right fruit: x~1280..1400, y~560..700
    fruit_boxes = [
        (480, 420, 600, 530),    # Fruit 1
        (760, 520, 850, 630),    # Fruit 2
        (1060, 210, 1150, 310),  # Fruit 3
        (1290, 560, 1385, 670),  # Fruit 4
    ]

    for box in fruit_boxes:
        draw_grow.rectangle(box, fill=(255, 255, 255))

    tree_growing_path = os.path.join(MEDIA_DIR, "scene_07_tree_growing.jpg")
    tree_growing.save(tree_growing_path, quality=95)
    print(f"Created {tree_growing_path}")

    # Scene 09: Falling fruit (Fruit 2 detached and falling downwards towards bottom)
    fruit_falling = tree_fruits.copy()
    # Crop fruit 2
    fruit_2 = tree_fruits.crop((760, 520, 850, 630))
    # Erase fruit 2 from tree
    draw_fall = ImageDraw.Draw(fruit_falling)
    draw_fall.rectangle((760, 520, 850, 630), fill=(255, 255, 255))
    # Paste fruit 2 lower down, rotated slightly
    fruit_2_rot = fruit_2.rotate(18, expand=True, fillcolor=(255, 255, 255))
    fruit_falling.paste(fruit_2_rot, (770, 850))

    fruit_falling_path = os.path.join(MEDIA_DIR, "scene_09_fruit_falling.jpg")
    fruit_falling.save(fruit_falling_path, quality=95)
    print(f"Created {fruit_falling_path}")

if __name__ == "__main__":
    create_seedling_scenes()
    create_tree_and_falling_scenes()
