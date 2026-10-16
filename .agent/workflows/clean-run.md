# Workflow: /clean-run <slug> [--clean-stills]

Dọn dẹp các tệp tin tạm và bản sao media trùng lặp sau khi hoàn tất render video để chống đầy ổ cứng (Disk Bloat Prevention).

## Mục tiêu:
Khi một video dài 2 phút được sản xuất với 10-15 cảnh media, `scripts/build_timeline.ts` sẽ đồng bộ toàn bộ file âm thanh, video clip và ảnh từ `runs/<slug>/` sang `public/runs/<slug>/` để Remotion preview/render truy cập.
Sau khi file MP4 cuối cùng đã được xuất tại `runs/<slug>/out/<slug>.mp4`, việc giữ lại các file nhân bản trong `public/` và hàng chục ảnh still frame QA sẽ gây phình ổ đĩa không cần thiết.

## Các bước thực hiện:

1. **Xác nhận Video đã xuất thành công:**
   - Kiểm tra `runs/<slug>/out/<slug>.mp4` tồn tại và có dung lượng hợp lệ (> 1MB).

2. **Chạy script dọn dẹp:**
   ```bash
   npx tsx scripts/clean_run.ts <slug>
   ```
   *Nếu muốn dọn luôn cả ảnh still frame tạm của Cổng 3:*
   ```bash
   npx tsx scripts/clean_run.ts <slug> --clean-stills
   ```

3. **Xác nhận tính toàn vẹn dữ liệu gốc:**
   - Thư mục nguồn `runs/<slug>/media/`, `runs/<slug>/audio/`, `runs/<slug>/storyboard.json`, `runs/<slug>/timeline.json` và file kết quả `runs/<slug>/out/<slug>.mp4` luôn được bảo vệ an toàn 100%.
   - Thư mục trùng lặp `public/runs/<slug>/` được giải phóng hoàn toàn.
