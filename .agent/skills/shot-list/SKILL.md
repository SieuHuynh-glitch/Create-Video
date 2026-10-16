---
name: shot-list
description: Phân tích kịch bản phân cảnh storyboard.json để tạo danh sách cảnh quay thị giác runs/<slug>/shot-list.md (mô tả hình ảnh, prompt AI tiếng Anh chuẩn tỉ lệ 16:9, từ khóa tìm kiếm stock, tên file quy ước media/scene_<id>.<ext>) và Style Bible đảm bảo đồng nhất phong cách thị giác và nhân vật. Tự động kết nối fetch_ai_media.ts để sinh ảnh 16:9 miễn phí.
---

# Kỹ Năng: Shot List & Visual Director (Phiên Bản 2.3)

Kỹ năng này chịu trách nhiệm chuyển hóa các ý tưởng thị giác từ kịch bản phân cảnh (`storyboard.json`) thành danh mục tác nghiệp hình ảnh chuẩn điện ảnh (`shot-list.md`), cung cấp thông số kỹ thuật chính xác cho AI sinh ảnh/clip hoặc quay chụp thực tế, đồng thời tự động kích hoạt tiến trình tải ảnh AI miễn phí qua Pollinations.ai FLUX.1.

---

## 1. Nguyên Tắc Cốt Lõi: Style Bible & Công Thức Prompt 5 Lớp

Mọi video sản xuất trong nhà máy đều phải xác định một **Style Bible** (Kim chỉ nam phong cách) cố định trước khi viết prompt cho từng cảnh. 

### 1.1. Công Thức Prompt 5 Lớp Điện Ảnh (Cinematic 5-Layer Formula)
Mọi prompt AI sinh ảnh minh họa bắt buộc phải tuân theo cấu trúc 5 lớp để đảm bảo chất lượng đồ họa cao nhất:

$$\text{[1. Chủ thể chính]} + \text{[2. Hành động & Cảm xúc]} + \text{[3. Môi trường & Chiều sâu]} + \text{[4. Góc máy & Ống kính 85mm]} + \text{[5. Ánh sáng Cinematic & Không khí]} + \text{--ar 16:9}$$

- **Lớp 1 (Subject):** Mô tả rõ độ tuổi, trang phục, đặc điểm nhân diện (Character Anchor) hoặc vật thể trọng tâm.
- **Lớp 2 (Action/Emotion):** Hành động cụ thể, hướng mắt nhìn, trạng thái cảm xúc (ví dụ: *thoughtful expression, confident gesture, focused gaze*).
- **Lớp 3 (Environment & Depth):** Bối cảnh chi tiết, tiền cảnh (foreground), hậu cảnh (background) có chiều sâu điện ảnh.
- **Lớp 4 (Camera & Lens):** Tiêu cự điện ảnh (ví dụ: *85mm portrait lens, wide 24mm establishing shot, shallow depth of field, bokeh, f/1.4, eye-level angle*).
- **Lớp 5 (Lighting & Mood):** Nguồn sáng cụ thể (ví dụ: *volumetric light rays, soft golden hour rim light, dramatic chiaroscuro, cinematic color grading, 8k resolution*).
- **Tham số bắt buộc:** Luôn kết thúc bằng tỉ lệ ngang `--ar 16:9` (hoặc độ phân giải `1920x1080`).

---

## 2. Thư Viện Style Bible Tiêu Chuẩn

Tùy theo chủ đề trong `brief.md`, chọn 1 phong cách chủ đạo làm Style Bible:

### Phong cách A: Cinematic Documentary (Phim Tài Liệu Doanh Nghiệp / Giáo Dục)
- **Visual Style:** Photorealistic, authentic documentary photography, natural skin texture, Hasselblad medium format look.
- **Color Palette:** Deep Slate Blue (#0B0F19), Neutral Charcoal, Warm Amber Accents.
- **Lighting:** Soft natural window light, subtle warm rim lighting, balanced ambient illumination.
- **Camera Tokens:** `shot on 85mm lens, f/2.0 aperture, natural depth of field, subtle film grain, photorealistic, 8k resolution --ar 16:9`.

### Phong cách B: Modern Anime Aesthetic (Hoạt Họa Điện Ảnh Makoto Shinkai)
- **Visual Style:** Masterpiece anime artstyle, vibrant colors, clean delicate lineart, expansive cumulus cloud skies.
- **Color Palette:** Sky Blue (#0284C7), Golden Sunlight (#F59E0B), Cherry Blossom Pink.
- **Lighting:** Ethereal sun flares, golden hour twilight rays, high-contrast emotional backlighting.
- **Camera Tokens:** `Makoto Shinkai style, CoMix Wave Films visual aesthetic, dramatic wide-angle perspective, stunning lighting, ultra-detailed 8k --ar 16:9`.

### Phong cách C: Cyberpunk & High-Tech Future (Công Nghệ, AI, Số Hóa)
- **Visual Style:** Futuristic sci-fi atmosphere, sleek glass surfaces, holographic data overlays.
- **Color Palette:** Dark Obsidian (#030712), Electric Cyan (#06B6D4), Neon Magenta (#EC4899).
- **Lighting:** Neon glow reflections, volumetric atmospheric haze, cool rim lighting.
- **Camera Tokens:** `cinematic sci-fi concept art, Octane render, ray tracing reflections, anamorphic lens flare, 8k resolution --ar 16:9`.

### Phong cách D: Corporate Minimalist Glassmorphism (Kinh Doanh, Tài Chính)
- **Visual Style:** Clean modern vector/3D isometric illustration with frosted glass elements.
- **Color Palette:** Pure White (#FFFFFF), Modern Indigo (#4F46E5), Emerald Mint (#10B981).
- **Lighting:** Clean studio softbox lighting, ambient occlusion, gentle drop shadows.
- **Camera Tokens:** `minimalist 3D isometric render, Blender 3D, translucent frosted glassmorphism, clean studio setup, 8k --ar 16:9`.

---

## 3. Quy Trình Tạo Shot List & Kích Hoạt Tự Động Hóa

1. **Đọc `runs/<slug>/storyboard.json`:**
   - Quét qua danh sách các cảnh.
   - Nhận diện các cảnh `image`, `video` hoặc các cảnh motion graphics cần hình nền minh họa.
2. **Thiết lập Style Bible:**
   - Chọn phong cách phù hợp nhất từ Thư viện Style Bible.
   - Định nghĩa nhân vật đồng nhất (Character Anchor) nếu kịch bản có nhân vật xuyên suốt.
3. **Sinh file `runs/<slug>/shot-list.md`:**
   - Điền prompt 5 lớp cho từng cảnh.
   - Ghi rõ tên file quy ước: `media/scene_xx.jpg` (ảnh) hoặc `media/scene_xx.mp4` (clip).
4. **Khởi tạo thư mục và Tự động tải ảnh AI (Zero-Touch):**
   - Đảm bảo thư mục `runs/<slug>/media/` đã được tạo.
   - **Tự động kích hoạt:**
     ```bash
     npx tsx scripts/fetch_ai_media.ts runs/<slug>/storyboard.json
     ```
   - Script sẽ tự động kết nối Pollinations.ai FLUX.1 tải ảnh 16:9 về đúng vị trí và điền metadata bản quyền vào storyboard.

---

## 4. Cấu Trúc Chuẩn của `shot-list.md`

```markdown
# SHOT LIST & STYLE BIBLE: [Tên Video]

## I. STYLE BIBLE (QUY CHUẨN ĐỒNG NHẤT)
- **Phong cách chủ đạo:** Cinematic Photorealistic Documentary
- **Bảng màu:** Deep Midnight Slate (#0B0F19), Electric Cyan (#06B6D4), Warm Amber (#F59E0B)
- **Ánh sáng:** Soft volumetric morning light, warm 3200K rim lighting
- **Ống kính & Góc máy:** 85mm portrait prime lens, f/1.8, cinematic shallow depth of field
- **Quy chuẩn kỹ thuật:** Tỉ lệ 16:9, độ phân giải tối thiểu 1920x1080 Full HD
- **Nhân vật đồng nhất (Character Anchor):** 
  *"Vietnamese male entrepreneur in his early 30s, short neat black hair, wearing modern casual dark navy blazer with white shirt, confident and thoughtful expression"*

---

## II. DANH MỤC CẢNH QUAY (SHOT LIST)

### 🎬 Cảnh 01: Hook Mở Đầu
- **ID cảnh:** `scene_01`
- **Loại template:** `title` (Motion Graphics native)
- **Visual File:** Đồ họa phát sáng nền native của hệ thống

---

### 🖼️ Cảnh 02: Hình Ảnh Minh Họa Nhân Vật
- **ID cảnh:** `scene_02`
- **Loại template:** `image` (ImageScene - Ken Burns Zoom)
- **Tên file quy ước:** `media/scene_02.jpg`
- **Mô tả nội dung:** Doanh nhân trẻ đang phân tích biểu đồ trên màn hình làm việc trong văn phòng nhìn ra thành phố.
- **Prompt AI 5 Lớp (Pollinations / FLUX.1 / Midjourney v6):**
  > `Photorealistic medium close-up of a Vietnamese male entrepreneur in his early 30s, short neat black hair, dark navy blazer, looking thoughtfully at a glowing digital screen with business growth charts, modern high-rise office overlooking city skyline, 85mm prime lens, shallow depth of field, natural soft morning light streaming through glass window, subtle rim light, cinematic color grading, 8k resolution --ar 16:9`

---

### 🎥 Cảnh 03: Chuyển Động Thực Tế (Video Clip)
- **ID cảnh:** `scene_03`
- **Loại template:** `video` (VideoScene - OffthreadVideo)
- **Tên file quy ước:** `media/scene_03.mp4`
- **Thời lượng yêu cầu:** $\ge 8$ giây
- **Prompt AI sinh Video (Runway Gen-3 / Luma Dream Machine / Kling):**
  > `Cinematic slow motion pan of a modern tech office floor, people collaborating at wooden desks, natural sunlight filtering through large glass windows, subtle dust particles, smooth steadycam forward dolly motion, 30fps --ar 16:9`
```

---

## 5. Tiêu Chuẩn Nghiệm Thu Kỹ Năng
- 100% prompt đều tuân thủ công thức 5 lớp và kết thúc bằng `--ar 16:9`.
- Có quy chuẩn Character Anchor nếu kịch bản có nhân vật lặp lại.
- Tự động tích hợp sẵn câu lệnh `fetch_ai_media.ts` để thực thi Zero-Touch.
