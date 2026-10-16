---
name: edge-tts-voiceover
description: Sinh file âm thanh thuyết minh tiếng Việt tự động cho từng cảnh bằng Microsoft Edge-TTS (giọng vi-VN-HoaiMyNeural), đo thời lượng thực tế và tạo dữ liệu timeline.json. Sử dụng khi kịch bản storyboard.json đã được phê duyệt và cần tạo voiceover cho video.
---

# Kỹ Năng: Edge-TTS Voiceover & Audio Measurement

Kỹ năng này thực thi việc chuyển văn bản lời thoại (`voiceoverText`) của từng cảnh thành file audio `.mp3` chất lượng cao bằng `edge-tts` (100% miễn phí, không cần tài khoản, không cần API key).

## 1. Kiểm tra giọng đọc khả dụng trước khi sinh âm thanh

Trước khi chạy sinh audio, kiểm tra danh sách giọng đọc của hệ thống:
```bash
edge-tts --list-voices | grep "vi-VN"
```
Giọng đọc mặc định bắt buộc:
- Giọng nữ: `vi-VN-HoaiMyNeural` (Âm điệu tự nhiên, ấm áp, rõ ràng).
- Giọng nam dự phòng: `vi-VN-NamMinhNeural` (Dùng khi brief yêu cầu giọng nam).

## 2. Quy trình sinh file âm thanh theo từng cảnh

Sử dụng script chuyên trách tự động hóa sinh đồng thời file audio `.mp3` và phụ đề `.vtt`:
```bash
npx tsx scripts/generate_voiceover.ts runs/<slug>/storyboard.json [--rate=+0%] [--voice=vi-VN-HoaiMyNeural]
```
- Nếu muốn ép sinh lại toàn bộ: Thêm cờ `--overwrite`.
- Cơ chế an toàn (Fail-Safe): Nếu Edge-TTS gặp lỗi mạng hoặc lỗi hệ thống, script sẽ lập tức dừng quy trình và báo cáo chi tiết. Không tự ý đổi sang engine TTS khác.

### Tính năng Self-Healing Tự Điều Chỉnh Tốc Độ Đọc (--rate):
Khi Cổng 2 (`scripts/build_timeline.ts`) phát hiện tổng thời lượng lệch nhẹ khỏi dải 110s–130s:
- Hệ thống tự động tính toán tỷ lệ cần bù trừ trong khoảng $\pm 5\% - 8\%$.
- Tự động gọi lại `generate_voiceover.ts` với cờ `--rate=+X%` hoặc `--rate=-X%` để đưa video về đúng thời lượng mục tiêu mà không cần sửa lại kịch bản.

## 3. Đo lường thời lượng chính xác

Sau khi tất cả các file audio được sinh ra:
1. Chạy script đo độ dài audio và quy đổi ra số frame:
   ```bash
   npx tsx scripts/build_timeline.ts runs/<slug>/storyboard.json runs/<slug>/audio/ runs/<slug>/timeline.json
   ```
2. Công thức quy đổi:
   - `durationInFrames = Math.round(durationSec * fps)` (với fps = 30).
   - `startFrame` của cảnh sau = `startFrame` của cảnh trước + `durationInFrames` của cảnh trước.
3. Kiểm tra tổng thời lượng video:
   - Nếu video chính 2 phút: Phải đạt `110s – 130s` (3300 – 3900 frames).

## 4. Định dạng đầu ra timeline.json

File `timeline.json` lưu tại `runs/<slug>/timeline.json` tuân thủ nghiêm ngặt `src/schema.ts`:
```json
{
  "slug": "sample-slug",
  "fps": 30,
  "width": 1920,
  "height": 1080,
  "totalDurationSec": 122.4,
  "totalDurationInFrames": 3672,
  "scenes": [
    {
      "id": "scene_01",
      "type": "title",
      "voiceoverText": "Lời thoại cảnh 1...",
      "onScreenText": { "title": "TIÊU ĐỀ" },
      "transition": "fade",
      "audioFile": "runs/sample-slug/audio/scene_01.mp3",
      "durationSec": 8.2,
      "durationInFrames": 246,
      "startFrame": 0
    }
  ]
}
```
