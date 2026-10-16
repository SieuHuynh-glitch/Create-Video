# Workflow: /revise-scene <slug> <id>

Quy trình chỉnh sửa nhanh một cảnh đơn lẻ và render xem thử chỉ riêng cảnh đó để feedback tức thì mà không cần render lại toàn bộ video.

## Các bước thực hiện:

1. **Xác định cảnh cần sửa:**
   - Đọc dữ liệu của cảnh `<id>` (ví dụ: `scene_03`) từ `runs/<slug>/timeline.json`.
2. **Cập nhật nội dung:**
   - Sửa lời thoại (`voiceoverText`) hoặc chữ hiển thị (`onScreenText`) theo yêu cầu.
3. **Sinh lại audio (nếu lời thoại thay đổi):**
   - Chạy lại lệnh `edge-tts` riêng cho cảnh đó:
     ```bash
     edge-tts --voice vi-VN-HoaiMyNeural --text "Lời thoại mới" --write-media runs/<slug>/audio/<id>.mp3
     ```
   - Đo lại thời lượng và cập nhật lại `durationSec`, `durationInFrames` cũng như dồn lại `startFrame` của các cảnh phía sau trong `timeline.json`.
4. **Render xem trước cảnh đơn lẻ:**
   - Chạy lệnh still hoặc render video ngắn của cảnh:
     ```bash
     npx tsx scripts/check_video.ts runs/<slug>/timeline.json --single-scene=<id>
     ```
5. **Cập nhật status:**
   - Ghi lại nhật ký chỉnh sửa vào `runs/<slug>/status.md`.
   - Hiển thị kết quả preview cho người dùng duyệt.
