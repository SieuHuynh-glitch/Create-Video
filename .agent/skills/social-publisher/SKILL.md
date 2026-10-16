---
name: social-publisher
description: Tự động hóa xuất bản bộ tài liệu marketing và SEO runs/<slug>/social.md sau khi render video. Trích xuất chính xác YouTube Video Chapters / Timestamps từ timeline.json, sinh 3 tiêu đề CTR cao, mô tả chuẩn SEO, và bộ hashtags thịnh hành.
---

# Kỹ Năng: Social Publisher & SEO Optimizer (Phiên Bản 2.3)

Kỹ năng này chịu trách nhiệm tự động hóa toàn diện khâu marketing hậu kỳ, biến các thông số kỹ thuật của video hoàn chỉnh (`timeline.json`, `storyboard.json`) thành bộ tài liệu phân phối nội dung đa kênh chuẩn SEO (`social.md`).

---

## 1. Nguyên Tắc & Mục Tiêu

1. **Chính Xác Tuyệt Đối (Data-Driven Timestamps):** Không ước lượng thời gian áng chừng. Mọi mốc thời gian YouTube Chapters phải được tính toán chính xác đến từng frame từ `scene.startFrame / fps`.
2. **Chuẩn Định Dạng YouTube Chapters:**
   - Mốc thời gian đầu tiên luôn bắt đầu bằng `00:00`.
   - Định dạng `MM:SS Tên Chương` (hoặc `HH:MM:SS` nếu video > 1 giờ).
   - Mỗi chương cách nhau tối thiểu 5–10 giây.
3. **Tối Ưu Hóa Tỷ Lệ Nhấp Chuột (High CTR):** Cung cấp 3 phong cách tiêu đề đa dạng để người vận hành lựa chọn phù hợp cho từng kênh phân phối.
4. **Trọn Gói 1 Lệnh (Single Command Execution):** Tích hợp hoàn toàn vào quy trình sản xuất qua lệnh `npm run social -- <slug>`.

---

## 2. Quy Trình Vận Hành Kỹ Năng

Sau khi video đã render xong (Giai đoạn 5 của quy trình sản xuất):
1. **Đọc `timeline.json`:**
   - Quét qua mảng `scenes` để lấy `startFrame` của từng cảnh.
   - Chuyển đổi thành chuỗi thời gian `MM:SS`.
   - Lấy tiêu đề hiển thị `onScreenText.title` hoặc tên nhận diện cảnh làm nhãn chương.
2. **Khởi chạy script xuất bản:**
   ```bash
   npx tsx scripts/generate_social.ts runs/<slug>/timeline.json
   ```
3. **Kiểm tra file kết quả:**
   - File kết quả được ghi vào `runs/<slug>/social.md`.
   - Kiểm tra đầy đủ 5 phần:
     - 3 Tùy chọn Tiêu đề (High CTR Titles).
     - YouTube Timestamps / Video Chapters.
     - Đoạn mô tả video chuẩn SEO.
     - Bộ 15–20 Hashtags phân tầng.
     - Bài đăng ngắn cho mạng xã hội (Facebook, LinkedIn, Threads).

---

## 3. Cấu Trúc File Xuất Bản `social.md`

File `runs/<slug>/social.md` tuân theo định dạng chuẩn sau:

```markdown
# BỘ TÀI LIỆU XUẤT BẢN & SEO: [Tên Video]

- **Dự án (Slug):** `ai-video-revolution`
- **Thời lượng video:** `02:05` (125.4 giây - 3762 frames @ 30fps)

---

## 🎯 1. GỢI Ý TIÊU ĐỀ VIDEO (HIGH CTR TITLES)
1. **Kích thích tò mò:** [Tiêu đề] - Sự thật mà 90% mọi người chưa biết?
2. **Lợi ích trực tiếp:** Cách [Mục tiêu] Cực Kỳ Đơn Giản Trong 2 Phút
3. **Cảnh báo khẩn cấp:** Đừng Vội Làm Gì Nếu Chưa Nắm Rõ Điều Này!

---

## 🕒 2. YOUTUBE TIMESTAMPS / VIDEO CHAPTERS
TIMESTAMPS / MỤC LỤC VIDEO:
00:00 - Mở Đầu: Thách Thức Thời Gian
00:15 - 3 Rào Cản Lớn Của Doanh Nghiệp
00:42 - Giải Pháp Đột Phá Bằng AI
01:28 - Số Liệu Thực Tế Ấn Tượng
01:52 - Kêu Gọi Hành Động & Đúc Kết

---

## 📝 3. ĐOẠN MÔ TẢ VIDEO CHUẨN SEO
[Đoạn mô tả 150-250 từ tích hợp từ khóa tự nhiên và mục lục thời gian]

---

## 🏷️ 4. BỘ HASHTAGS ĐỀ XUẤT
[Danh sách 15-20 hashtags phân loại theo nền tảng]

---

## 📱 5. BÀI ĐĂNG NGẮN CHO MẠNG XÃ HỘI
[Bài tóm tắt 2-3 đoạn văn kèm icon bắt mắt và lời kêu gọi]
```

---

## 4. Tiêu Chuẩn Nghiệm Thu
- File `runs/<slug>/social.md` được tạo thành công không có lỗi runtime.
- Mốc timestamps đầu tiên là `00:00`.
- Tổng thời lượng hiển thị khớp chính xác với `timeline.json`.
