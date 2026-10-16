# Workflow: /new-video <slug>

Khởi tạo một dự án video mới từ brief mẫu chuẩn.

## Các bước thực hiện:

1. **Kiểm tra tham số slug:**
   - Xác định `<slug>` (ví dụ: `tech-trends-2026`, `ai-automation`).
   - Nếu thư mục `runs/<slug>/` đã tồn tại: cảnh báo người dùng trước khi ghi đè hoặc yêu cầu chọn slug khác.

2. **Khởi tạo cấu trúc thư mục:**
   Tạo các thư mục con cần thiết:
   ```bash
   mkdir -p runs/<slug>/audio runs/<slug>/out
   ```

3. **Sao chép template brief:**
   Sao chép `templates/brief.template.md` vào `runs/<slug>/brief.md`.

4. **Khởi tạo file trạng thái `status.md`:**
   Tạo file `runs/<slug>/status.md` với nội dung ban đầu:
   ```markdown
   # Trạng Thái Sản Xuất Video: <slug>
   - Thời gian khởi tạo: <timestamp>
   - Giai đoạn hiện tại: KHỞI TẠO (Chờ điền brief)
   - Cổng 1 (Storyboard): Chưa chạy
   - Cổng 2 (Timeline): Chưa chạy
   - Cổng 3 (Visual QA): Chưa chạy
   - Render MP4: Chưa chạy
   ```

5. **Phản hồi người dùng:**
   Thông báo đường dẫn file `runs/<slug>/brief.md` để người dùng điền thông tin hoặc hỗ trợ người dùng điền brief.
