---
name: video-qa
description: Quy trình kiểm soát chất lượng video tự động qua 3 cổng kiểm tra nghiêm ngặt (kiểm tra storyboard, kiểm tra timeline, kiểm tra hình ảnh tĩnh still frame, âm thanh và tràn chữ). Sử dụng trước khi chuyển qua các giai đoạn tiếp theo hoặc trước khi render video hoàn chỉnh.
---

# Kỹ Năng: Video Quality Assurance (Video QA)

Kỹ năng này bảo đảm chất lượng thành phẩm video từ khâu kịch bản đến khâu render cuối, phát hiện sớm các lỗi kỹ thuật và thị giác.

## 1. Hệ thống 3 Cổng Chất lượng (Quality Gates)

### Cổng 1: Kiểm định Kịch bản (`validate_storyboard`)
- **Lệnh thực thi:** `npx tsx scripts/validate_storyboard.ts runs/<slug>/storyboard.json`
- **Tiêu chí đánh giá:**
  1. Dữ liệu hợp lệ 100% với `StoryboardSchema` (Zod).
  2. Số lượng cảnh: Từ `8 đến 15 cảnh` (cho video 2 phút tiêu chuẩn).
  3. Tổng số từ lời thoại thuyết minh: Nằm trong khoảng `260 – 320 từ` (tương ứng 110s – 130s nói).
  4. Không chứa từ khóa cấm đã quy định trong brief.

### Cổng 2: Kiểm định Dòng thời gian (`build_timeline`)
- **Lệnh thực thi:** `npx tsx scripts/build_timeline.ts runs/<slug>/storyboard.json runs/<slug>/audio/ runs/<slug>/timeline.json`
- **Tiêu chí đánh giá:**
  1. Mọi file audio được chỉ định đều tồn tại thực tế và có dung lượng > 0 bytes.
  2. Thời lượng từng cảnh được quy đổi chính xác từ giây sang frames (`fps = 30`).
  3. Tổng thời lượng toàn bộ video: Nằm trong dải mục tiêu `110s – 130s` (3300 – 3900 frames).

### Cổng 3: Kiểm định Thị giác & Still Frame (`check_video`)
- **Lệnh thực thi:** `npx tsx scripts/check_video.ts runs/<slug>/timeline.json`
- **Tiêu chí đánh giá:**
  1. Chụp ảnh tĩnh (Still image frame) tại điểm chính giữa (`midpoint frame`) của từng cảnh.
  2. Kiểm tra không bị cảnh trống (black screen / empty scene).
  3. Kiểm tra chữ không tràn ra ngoài vùng an toàn (Safe margin 96px).
  4. Đảm bảo subtitle xuất hiện đúng lúc giọng đọc vang lên.

## 2. Cơ chế Tự sửa lỗi (Self-Healing Rule)
- Khi một cổng kiểm tra trả về trạng thái **FAIL**:
  - Agent đọc thông báo lỗi chi tiết.
  - Tự động điều chỉnh lại file nguồn (ví dụ: rút ngắn câu thoại nếu quá dài, chỉnh lại template nếu text tràn...).
  - Chạy lại cổng kiểm định.
- **Giới hạn số lần thử:** Tối đa `2 lần sửa tự động`. Nếu sau 2 lần cổng vẫn thất bại, **DỪNG LẠI NGAY LẬP TỨC** và báo cáo nguyên nhân cho người dùng.

## 3. Ghi chép trạng thái bắt buộc
- Mọi kết quả kiểm tra (Pass/Fail, metrics, danh sách ảnh chụp still) đều phải được ghi lại thành bảng trực quan vào file `runs/<slug>/status.md`.
