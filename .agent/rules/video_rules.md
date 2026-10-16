# BỘ QUY TẮC VIDEO (VIDEO RULES)

Tất cả video được tạo bởi Nhà máy Video phải tuân thủ nghiêm ngặt các tiêu chuẩn chất lượng sau:

## 1. Thông số kỹ thuật hiển thị
- **Độ phân giải chuẩn:** `1920x1080` (Tỷ lệ khung hình chuẩn ngang 16:9).
- **Tốc độ khung hình (FPS):** Cố định `30 FPS`.
- **Định dạng xuất:** `.mp4` (H.264 video, AAC audio).

## 2. Nhịp điệu và Thời lượng cảnh
- **Thời lượng mỗi cảnh:** Nằm trong khoảng `6 – 12 giây` (tương đương 180 – 360 frames).
- Tránh cảnh quá ngắn (< 5s gây giật nhịp, người xem không kịp đọc chữ).
- Tránh cảnh quá dài (> 14s gây nhàm chán, mất tập trung).
- **Thời lượng tổng video 2 phút:** Nằm trong dải `110 – 130 giây` (3300 – 3900 frames).

## 3. Typography & Kiểu chữ
- **Số lượng font tối đa:** Tối đa `2 font chữ` trong toàn bộ video (Heading & Body).
- **Font tiếng Việt chuẩn:** Nạp tự động qua `@remotion/google-fonts` (`Outfit` cho Tiêu đề & Con số, `Inter` cho Nội dung & Phụ đề).
- **Cỡ chữ tối thiểu:** Không được nhỏ hơn `48px` ở độ phân giải 1080p để đảm bảo người xem trên thiết bị di động đọc rõ ràng.
- **Mật độ chữ trên màn hình:** Tối đa xấp xỉ `12 từ` trên một dòng chữ hiển thị.

## 4. Khu vực an toàn (Safe Zone) & Bố cục
- Luôn giữ padding an toàn tối thiểu `80px – 96px` từ các cạnh màn hình (tránh bị che khuất bởi giao diện các nền tảng video như YouTube/TikTok).
- Tỷ lệ tương phản màu sắc (Contrast Ratio) giữa chữ và nền tối thiểu 4.5:1.

## 5. Bản quyền & Tài nguyên hình ảnh
- 100% hình ảnh, đồ họa và animation được sinh từ code (SVG, Canvas, CSS, Lucide icons).
- Không sử dụng hình ảnh, video clip hoặc tài sản chưa rõ bản quyền từ bên ngoài.

## 6. Tiêu chuẩn âm thanh
- **Giọng đọc Voiceover:** Sử dụng Edge-TTS (`vi-VN-HoaiMyNeural`), volume = `1.0` (âm lượng rõ ràng, không rè, không méo tiếng).
- **Nhạc nền (BGM nếu có):** Volume tối đa `<= 0.12` để tuyệt đối không lấn át lời thuyết minh.
