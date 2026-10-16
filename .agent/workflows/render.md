# Workflow: /render <slug>

Lệnh kích hoạt render hoàn thiện video từ file dữ liệu `timeline.json` ra file MP4 chuẩn 1080p.

## Các bước thực hiện:

1. **Kiểm tra điều kiện tiên quyết:**
   - Đảm bảo `runs/<slug>/timeline.json` tồn tại và đã vượt qua Cổng 2 & Cổng 3.
   - Đảm bảo tất cả file audio trong `runs/<slug>/audio/` đầy đủ.
   - Đảm bảo thư mục đích `runs/<slug>/out/` đã sẵn sàng.

2. **Thực thi lệnh Render An Toàn (Tự động Re-sync Media & Chống Bẫy Xóa Nhầm):**
   ```bash
   npx tsx scripts/render_video.ts <slug>
   # Hoặc tự động dọn dẹp sạch public/ ngay sau khi xuất video:
   npx tsx scripts/render_video.ts <slug> --clean
   ```

3. **Kiểm tra kết quả:**
   - Xác thực file `runs/<slug>/out/<slug>.mp4` được tạo thành công, dung lượng > 0 bytes.
   - Đo thời lượng video thực tế so sánh với `totalDurationSec` trong `timeline.json`.

4. **Ghi nhận trạng thái:**
   - Cập nhật thông tin file xuất, kích thước, thời gian render vào `runs/<slug>/status.md`.

