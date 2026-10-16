# BÁO CÁO NGHIÊN CỨU & ĐÁNH GIÁ ENGINE TTS DỰ PHÒNG: PIPER TTS
*Thời điểm thực nghiệm: 16/10/2026*

## 1. Mục Tiêu Nghiên Cứu
Nhằm đánh giá phương án dự phòng khi Microsoft thay đổi điều khoản dịch vụ hoặc đóng WebSocket ẩn danh của Edge-TTS, hệ thống đã thực nghiệm so sánh chất lượng, tính năng và bản quyền giữa Microsoft Edge-TTS và Piper TTS Local.

---

## 2. Kết Quả Khảo Sát & So Sánh Kỹ Thuật

| Tiêu Chí Đánh Giá | Microsoft Edge-TTS (Mặc định hiện tại) | Piper TTS Local (Dự phòng khảo sát) |
| :--- | :--- | :--- |
| **Mô hình hoạt động** | WebSocket Cloud (`wss://speech.platform.bing.com`) | ONNX Runtime chạy trực tiếp trên CPU cục bộ |
| **Phụ thuộc mạng** | Bắt buộc có Internet | **100% Offline**, không cần Internet |
| **Tần số lấy mẫu** | **24.000 Hz** (Mono MP3) | **22.050 Hz** (Mono 16-bit WAV) |
| **Các giọng tiếng Việt** | `vi-VN-HoaiMyNeural`, `vi-VN-NamMinhNeural` | `vi_VN-25hours_single-low`, `vi_VN-vivos-x_low` |
| **Xuất phụ đề `.vtt`** | **Có sẵn** (Edge-TTS trả cues thời gian từng từ) | **KHÔNG CÓ**. Piper chỉ xuất audio thô, không có cue phụ đề |
| **Điều chỉnh tốc độ (`--rate`)**| **Hỗ trợ chuẩn** (`--rate=+5%`, Auto-Tune thời lượng) | **KHÔNG CÓ tham số tương đương**. Không thể Auto-Tune |
| **Chất lượng ngữ điệu** | **Rất tự nhiên, mượt mà, nhấn nhá cảm xúc tốt** | Đọc đều giọng, âm sắc robot, ngắt nghỉ thô |
| **Bản quyền & Giấy phép** | Miễn phí qua API Edge Client (rủi ro ToS Microsoft) | **Engine MIT, nhưng DATASET có điều kiện ràng buộc**:<br>• VIVOS: Giấy phép `CC BY-NC-SA 4.0` (Phi thương mại)<br>• 25hours: Dữ liệu nghiên cứu phi thương mại |
| **Khả năng thay thế** | Đang vận hành chính thức | **KHÔNG THAY THẾ TRỰC TIẾP ĐƯỢC** (sẽ làm hỏng phụ đề và Auto-Tune) |

---

## 3. Bằng Chứng File Mẫu Âm Thanh (Audio Samples)

Hai mẫu âm thanh thực tế đọc cùng một câu tiếng Việt:  
*"Trí tuệ nhân tạo đang thay đổi hoàn toàn cách chúng ta sáng tạo nội dung video tự động."*

- **Mẫu Microsoft Edge-TTS (`vi-VN-HoaiMyNeural`):**  
  [docs/tts-samples/sample_edge_tts.mp3](file:///d:/project/Create-Video/docs/tts-samples/sample_edge_tts.mp3)  
  *Nhận xét:* Ngữ điệu mềm mại, cao độ tự nhiên, phù hợp video triệu view.

- **Mẫu Piper TTS Local (`vi_VN-25hours_single-low`):**  
  [docs/tts-samples/sample_piper_local.wav](file:///d:/project/Create-Video/docs/tts-samples/sample_piper_local.wav)  
  *Nhận xét:* Chất âm 22.05kHz nghe phẳng, thiếu cảm xúc, không có metadata timestamp đồng bộ phụ đề.

---

## 4. Kết Luận Kỹ Thuật

> ⚠️ **Quyết định kiến trúc:**
> 1. **GIỮ NGUYÊN Microsoft Edge-TTS làm engine mặc định duy nhất** cho toàn bộ pipeline sản xuất video v2.5.
> 2. Piper TTS **KHÔNG THỂ thay thế trực tiếp** dạng 1-1 vì:
>    - Thiếu file `.vtt` cues thời gian chi tiết của từng từ (khiến hệ thống phụ đề chữ rơi / Highlight bị tê liệt).
>    - Không hỗ trợ `--rate` để Auto-Tune khớp chuẩn thời lượng cảnh tại Cổng 2.
>    - Bản quyền dữ liệu giọng nói tiếng Việt (VIVOS, 25hours) mang tính phi thương mại / nghiên cứu.
> 3. Nếu trong tương lai cần một giải pháp Offline thay thế hoàn chỉnh, phải bổ sung Whisper để sinh ngược phụ đề `.vtt` từ WAV và dùng SoundStretch/Rubberband để co dãn thời lượng. Hiện tại không triển khai thêm để tránh phình to hệ thống.
