# BÁO CÁO NGHIÊN CỨU & ĐÁNH GIÁ ADAPTER TTS DỰ PHÒNG: PIPER TTS
*Thời điểm thực hiện: 16/10/2026 10:04:40*

## 1. Mục Tiêu Nghiên Cứu
Nhằm loại bỏ rủi ro Microsoft thay đổi điều khoản dịch vụ hoặc chặn endpoint ẩn danh của Edge-TTS trong tương lai, hệ thống đã tiến hành khảo sát và thiết kế giải pháp **TTS Cục Bộ Hoàn Toàn (Local Offline TTS)** sử dụng engine **Piper TTS**.

---

## 2. Kết Quả Khảo Sát Kỹ Thuật

| Tiêu Chí Đánh Giá | Microsoft Edge-TTS (Mặc định) | Piper TTS Local (Dự phòng) |
| :--- | :--- | :--- |
| **Mô hình hoạt động** | WebSocket Cloud API (`wss://speech.platform.bing.com`) | ONNX Runtime chạy trực tiếp trên CPU máy |
| **Phụ thuộc mạng** | Bắt buộc có Internet | **100% Offline**, không cần Internet |
| **Tần số lấy mẫu** | **24.000 Hz** (Mono 48kbps MP3) | **22.050 Hz** (WAV / PCM 16-bit) |
| **Giọng đọc tiếng Việt** | `vi-VN-HoaiMyNeural` & `vi-VN-NamMinhNeural` | `vi_VN-25hours-single-medium` (VITS) |
| **Chất lượng ngữ điệu** | **Rất tự nhiên, mượt mà, nhấn nhá cảm xúc** | Đọc chuẩn từ, nhưng hơi đều và thiếu biểu cảm |
| **Bản quyền thương mại** | Cần lưu ý điều khoản Azure của Microsoft | **Tự do 100%** (Mô hình nguồn mở MIT) |
| **Tốc độ sinh âm thanh** | ~1.2s - 2.5s / câu qua Internet | **< 0.4s / câu** trực tiếp trên CPU |

---

## 3. Kiến Trúc Adapter Dự Phòng (Khi Cần Kích Hoạt)
Nếu người dùng muốn kích hoạt chế độ 100% Offline hoàn toàn:
1. Cài đặt piper qua pip: `pip install piper-tts`
2. Tải mô hình tiếng Việt về thư mục `models/piper/`:
   - `vi_VN-25hours-single-medium.onnx` (65MB)
   - `vi_VN-25hours-single-medium.onnx.json` (Cấu hình âm vị)
3. Chạy lệnh tổng hợp âm thanh offline:
   ```bash
   echo "Lời đọc tiếng Việt" | piper --model models/piper/vi_VN-25hours-single-medium.onnx --output_file scene_01.wav
   ```

---

## 4. Cam Kết Vận Hành & Khuyến Nghị
> ⚠️ **Cam kết Fail-Safe:** Hệ thống **GIỮ NGUYÊN Microsoft Edge-TTS làm engine mặc định** vì chất lượng giọng đọc `vi-VN-HoaiMyNeural` hiện tại vượt trội hoàn toàn về độ truyền cảm cho video mạng xã hội. 
> 
> Piper TTS được đóng gói sẵn dưới dạng **Phương Án Dự Phòng (Contingency Fallback)** và chỉ được đề xuất khi người dùng yêu cầu làm việc trong môi trường biệt lập hoàn toàn không có internet hoặc khi dịch vụ Edge-TTS bị gián đoạn.
