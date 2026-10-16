# Workflow: /replace-media <slug> <scene_id> <path_to_new_media>

Quy trình thay thế tệp tin hình ảnh hoặc video của một cảnh cụ thể trong dự án mà không làm xáo trộn kịch bản và dòng thời gian tổng thể.

---

## Các Bước Thực Hiện

1. **Kiểm tra thông số đầu vào:**
   - `<slug>`: Mã định danh dự án trong `runs/<slug>/`.
   - `<scene_id>`: ID cảnh cần thay thế (ví dụ: `scene_02`).
   - `<path_to_new_media>`: Đường dẫn tệp tin ảnh (`.png`, `.jpg`, `.webp`) hoặc clip (`.mp4`, `.mov`) mới.

2. **Cập nhật tệp tin media:**
   - Xác định phần mở rộng của file mới.
   - Sao chép file mới vào thư mục dự án: `runs/<slug>/media/<scene_id>.<ext>`.
   - Đồng bộ sang thư mục public: `public/runs/<slug>/media/<scene_id>.<ext>`.

3. **Cập nhật dữ liệu phân cảnh:**
   - Mở file `runs/<slug>/storyboard.json` và `runs/<slug>/timeline.json`.
   - Cập nhật cảnh `<scene_id>`:
     - `visual.file = "media/<scene_id>.<ext>"`
     - Cập nhật thông tin `license` và `attribution` nếu người dùng cung cấp.

4. **Kiểm định chất lượng qua Cổng Media:**
   ```bash
   npx tsx scripts/check_media.ts runs/<slug>/timeline.json
   ```
   - Xác minh độ phân giải, tỉ lệ khung hình và thời lượng clip mới.
   - Cập nhật hồ sơ `runs/<slug>/manifest.json`.

5. **Chụp Still Frame kiểm tra trực quan:**
   ```bash
   npx tsx scripts/check_video.ts runs/<slug>/timeline.json --single-scene=<scene_id>
   ```
   - Chụp ảnh still frame tại điểm giữa của cảnh vừa thay thế.
   - Gửi ảnh chụp still frame mới cho người dùng đánh giá.

6. **Ghi nhật ký:**
   - Cập nhật lịch sử thay đổi vào `runs/<slug>/status.md`.
