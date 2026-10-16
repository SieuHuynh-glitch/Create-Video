# QUY TẮC VẬN HÀNH NHÀ MÁY (FACTORY RULES)

Quy tắc này bắt buộc áp dụng đối với tất cả các tác vụ chạy trong pipeline:

## 1. Ràng buộc miễn phí 100%
- Tuyệt đối không sử dụng API trả phí, không yêu cầu tạo tài khoản mới, không sử dụng API keys của bên thứ ba.
- Giọng nói sử dụng trực tiếp Microsoft Edge TTS miễn phí (`edge-tts`).

## 2. Kiến trúc Agent đơn & Chạy tuần tự
- Toàn bộ pipeline do một agent duy nhất điều phối tuần tự từng bước.
- **Không dựa vào trí nhớ hội thoại:** Mọi thông tin trạng thái, tiến độ, kết quả trung gian đều phải được ghi trực tiếp vào các file trong thư mục `runs/<slug>/` (`status.md`, `storyboard.json`, `timeline.json`).

## 3. Điều khiển bằng dữ liệu (Data-Driven First)
- File `timeline.json` là nguồn chân lý duy nhất (Single Source of Truth).
- **Cấm hard-code:** Tuyệt đối không ghi cứng số frame, thời lượng hoặc nội dung văn bản trong source code React (`src/`). Mọi thay đổi về thời lượng phải xuất phát từ dữ liệu âm thanh thực tế ghi trong `timeline.json`.

## 4. Kiểm soát Cổng chất lượng (Quality Gates)
- Luôn chạy script kiểm tra qua từng Cổng chất lượng trước khi chuyển sang giai đoạn kế tiếp.
- Nếu một cổng không đạt: cho phép agent tự động sửa lỗi và kiểm tra lại tối đa 2 lần. Nếu sau 2 lần vẫn không đạt, **DỪNG LẠI NGAY** và báo cáo chi tiết cho người dùng.

## 5. Xử lý lỗi công cụ
- Khi gặp lỗi phát sinh từ công cụ bên ngoài (ví dụ: `edge-tts` mất kết nối mạng, Remotion render lỗi vì thiếu ffmpeg...), agent phải **DỪNG LẠI VÀ BÁO LỖI**, tuyệt đối không tự ý âm thầm đổi sang dịch vụ hoặc công cụ khác.

## 6. Phạm vi can thiệp file
- Agent chỉ được phép tạo và sửa đổi các file nằm trong thư mục `runs/<slug>/` và thư mục `src/`.
- Không tự ý thay đổi cấu trúc hệ thống hoặc các file ngoài phạm vi run hiện tại.

## 7. Nhật ký trạng thái liên tục
- Sau mỗi giai đoạn (phân tích brief, sinh kịch bản, tạo audio, dựng timeline, kiểm định visual, render), agent phải cập nhật trạng thái chi tiết, thời gian và kết quả vào file `runs/<slug>/status.md`.

## 8. Quy tắc Bản quyền & Quản lý Tài nguyên Media (Media & Licensing Policy)
- **Không dùng media thiếu thông tin giấy phép:** Mọi hình ảnh và cảnh quay video thật đưa vào hệ thống bắt buộc phải có thông tin nguồn gốc (`source`), giấy phép (`license`) và tác giả ghi công (`attribution`). Tất cả phải được kiểm định và lập hồ sơ minh bạch trong `runs/<slug>/manifest.json`.
- **Cảnh chưa có media bắt buộc dùng Placeholder:** Nếu một cảnh yêu cầu media nhưng chưa có file thực tế, hệ thống bắt buộc hiển thị visual placeholder chuẩn và ghi rõ cảnh báo trong `status.md`.
- **Tuyệt đối không tự ý tải media từ nguồn khác:** Agent không được phép tự động cào, tải ảnh hoặc clip ngầm từ các website hoặc dịch vụ thứ ba khi chưa có sự kiểm duyệt và phê duyệt của người dùng.
