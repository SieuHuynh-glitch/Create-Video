# HƯỚNG DẪN QUY TRÌNH B-WORKFLOW (HUMAN-IN-THE-LOOP VEO)
## Mô hình hợp tác Người - Máy (Semi-Auto Pipeline V3.0)

Tài liệu này là sổ tay vận hành dành cho bạn (Người điều hành) khi trực tiếp sinh video clip bằng **Google Veo** (hoặc Kling / Runway Gen-3) và chuyển giao cho pipeline Antigravity xử lý hậu kỳ tự động.

---

## 🎯 NGUYÊN TẮC CỐT LÕI (THE 3 GOLDEN RULES)

1. **Khóa phong cách bắt buộc (Style Lock):** Mọi prompt gửi vào Google Veo đều phải có đoạn đuôi:
   > `monochrome black-and-white ink style, pure white background, no color, no text, no logos, no music, slow and meditative, 8 seconds`
2. **Quy tắc khung hình nối tiếp (Last-Frame Continuity):**
   - **Shot 01:** Dùng ảnh gốc `runs/natural-cycle-v2/media/anchors/scene_02_skull.jpg`.
   - **Shot tiếp theo:** Chạy script `extract_last_frame.ts` để lấy khung cuối của shot trước làm ảnh bắt đầu cho shot sau.
   - **Shot neo (Re-anchor - Shot 05, 07, 09, 11, 12):** Tái sử dụng ảnh gốc tương ứng trong `media/anchors/` để chống trôi phong cách.
3. **Quy tắc Watermark & SynthID:**
   - **TUYỆT ĐỐI KHÔNG** dùng phần mềm bên thứ 3 xóa lem nhem hay crop mất bố cục hình ảnh.
   - Pipeline sẽ tự động crop 4 góc tỷ lệ 1:1 và ghi nhận vào `manifest.json` để bạn trực tiếp xem và quyết định.

---

## 📋 CHECKLIST THAO TÁC TỪNG SHOT (TỪNG BƯỚC THỰC HIỆN)

### Bước 1: Chuẩn bị ảnh đầu vào
- Mở danh mục cảnh quay: [runs/natural-cycle-v2/shot-list.md](file:///d:/project/Create-Video/runs/natural-cycle-v2/shot-list.md).
- Xác định tệp ảnh đầu vào cho shot hiện tại:
  - Nếu là **Shot 01** hoặc **Shot Neo**: Lấy file tương ứng trong `runs/natural-cycle-v2/media/anchors/`.
  - Nếu là **Shot Nối tiếp**: Lấy file `runs/natural-cycle-v2/media/frame_start_for_shot_XX.jpg` do pipeline vừa tạo.

### Bước 2: Sinh Video trên Google Veo
1. Truy cập giao diện Google Veo (hoặc VideoFX / Vertex AI / AI Test Kitchen).
2. Chọn chế độ **Image-to-Video (I2V)**.
3. Tải lên ảnh đầu vào đã chọn ở Bước 1.
4. Copy chính xác đoạn **Prompt Veo** tương ứng trong `shot-list.md` và dán vào ô mô tả.
5. Cài đặt thông số:
   - Thời lượng: **8 giây** (8 seconds).
   - Tỷ lệ khung hình: **16:9** (1920x1080).
   - Camera motion: Smooth / Subtle (chuyển động chậm rãi).
6. Bấm **Generate** và chờ Veo hoàn thành clip.

### Bước 3: Tải về và Đặt tên Chuẩn xác
1. Tải clip video MP4 chất lượng cao nhất về máy.
2. Đổi tên file theo đúng quy ước: `shot_01.mp4`, `shot_02.mp4`, ..., `shot_12.mp4`.
3. Di chuyển file vào thư mục:
   ```text
   runs/natural-cycle-v2/media/shot_XX.mp4
   ```

### Bước 4: Chạy Lệnh Hậu Kỳ Tự Động (Antigravity IDE)
Sau khi thả file `shot_XX.mp4` vào thư mục media, hãy chạy 2 lệnh kỹ thuật:

1. **Trích xuất khung hình cuối cho shot tiếp theo:**
   ```bash
   npx tsx scripts/extract_last_frame.ts runs/natural-cycle-v2/media/shot_XX.mp4
   ```
   *Lệnh này sẽ tự sinh tệp `runs/natural-cycle-v2/media/frame_start_for_shot_XX+1.jpg`.*

2. **Kiểm định kỹ thuật & crop 4 góc soi watermark:**
   ```bash
   npx tsx scripts/check_clip.ts runs/natural-cycle-v2/media/shot_XX.mp4
   ```
   *Lệnh này sẽ:*
   - Đo phân giải, fps, thời lượng thật bằng `ffprobe`.
   - Kiểm tra `freezedetect` xem clip có bị đơ tĩnh $> 1.0$s không.
   - Trích xuất 4 ảnh crop 1:1 ở 4 góc vào `runs/natural-cycle-v2/out/crops/shot_XX_corner_*.png`.
   - Cập nhật thông số vào `manifest.json`.

### Bước 5: Soát ảnh 4 góc & Duyệt Clip
- Mở thư mục `runs/natural-cycle-v2/out/crops/` xem 4 góc ảnh.
- Nếu clip mượt, sạch sẽ và không có biến dạng méo mó -> Tiếp tục tiến hành shot kế tiếp theo Bước 1.

---

## ⚡ BẢNG ÁNH XẠ ẢNH NEO (RE-ANCHOR MATRIX)

Khi thực hiện các shot đặc thù dưới đây, hãy dùng ảnh neo từ thư mục `media/anchors/` thay vì dùng khung cuối của shot trước để giữ vững DNA thị giác nguyên bản:

| Shot | Thời điểm | Tệp ảnh neo sử dụng | Lý do kỹ thuật |
| :--- | :--- | :--- | :--- |
| **Shot 01** | Khởi đầu (0s) | `scene_02_skull.jpg` | Xác lập mẫu hộp sọ lông vũ gốc |
| **Shot 05** | Đất dâng (38s) | `scene_04_soil.jpg` | Đưa chân trời đất đen vào đúng cao độ 25% |
| **Shot 07** | Mầm cây (57s) | `scene_06_seedling_zoom.jpg` | Macro cận cảnh mầm cây với 2 lá lông vũ |
| **Shot 09** | Cây 4 quả (76s) | `scene_08_tree_fruits.jpg` | Khóa đúng số lượng 4 quả đầu lâu đối xứng |
| **Shot 11** | Quả rơi (96.5s) | `scene_09_fruit_falling.jpg` | Khóa đúng quỹ đạo 1 quả rụng thẳng đứng |
| **Shot 12** | Khép vòng (107s) | `scene_10_skull_return.jpg` | Khép kín vòng lặp trùng khớp 100% với Shot 01 |
