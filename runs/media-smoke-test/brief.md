---
slug: "media-smoke-test"
topic: "Nâng Cấp Nhà Máy Video: Hỗ trợ Hình Ảnh & Cảnh Quay Thật"
target_audience: "Kỹ sư Remotion, đội ngũ sáng tạo video tự động"
goal: "Kiểm thử tích hợp ảnh tĩnh Ken Burns, clip video OffthreadVideo và xuất bản đa kênh"
tone: "Hiện đại, trực quan, điện ảnh"
visual_style: "Dark Mode kết hợp Scrim bảo vệ chữ và hiệu ứng chuyển động"
target_duration_sec: 15
language: "vi-VN"
voice_id: "vi-VN-HoaiMyNeural"
required_keywords:
  - "hình ảnh"
  - "cảnh quay"
  - "2.0"
forbidden_keywords:
  - "lỗi giật lag"
---

# TỔNG QUAN MEDIA SMOKE TEST

## Mục tiêu
Kiểm thử toàn diện đường ống xử lý đa phương tiện của Nhà máy Video Remotion:
1. Xác thực kịch bản phân cảnh hỗ trợ thẻ ảnh tĩnh và thẻ video chuyển động thật.
2. Kiểm tra bộ xử lý Cổng Media: nhận diện độ phân giải, kiểm soát upscale và lập hồ sơ bản quyền manifest.json.
3. Kiểm tra dựng hình Ken Burns (`contain-blur`) và `OffthreadVideo` tự động trim/loop.
4. Render MP4 và xuất bản trọn bộ SEO social.md.

## Dữ kiện / Số liệu
- Phiên bản thử nghiệm: Video Factory 2.0
- Thời lượng thử nghiệm: 15 giây
- Số lượng cảnh: 3 cảnh (title, image, video)
- Tỉ lệ khung hình: 16:9 Full HD (1920x1080)
- Tốc độ khung hình: 30 fps
