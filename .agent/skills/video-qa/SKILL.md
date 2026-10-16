---
name: video-qa
description: Quy trình kiểm soát chất lượng video tự động qua 5 cổng kiểm tra nghiêm ngặt (kiểm tra storyboard & fact-check, kiểm tra media upscale, kiểm tra timeline auto-tune, kiểm tra thị giác đo DOM thật, và kiểm tra âm thanh EBU R128 kèm mastering 2s). Sử dụng trước khi chuyển qua các giai đoạn tiếp theo hoặc trước khi render video hoàn chỉnh.
---

# Kỹ Năng: Video Quality Assurance (Video QA) - Phiên bản 2.5

Kỹ năng này bảo đảm chất lượng thành phẩm video từ khâu kịch bản đến khâu render cuối, loại bỏ hoàn toàn các lỗi kỹ thuật, sai lệch dữ kiện và điểm mù thị giác/âm thanh.

## 1. Hệ thống 5 Cổng Chất lượng Tự động (Quality Gates)

### Cổng 1: Kiểm định Kịch bản & Fact-Check (`validate_storyboard`)
- **Lệnh thực thi:** `npx tsx scripts/validate_storyboard.ts runs/<slug>/storyboard.json`
- **Tiêu chí đánh giá:**
  1. Hợp lệ 100% với `StoryboardSchema` (Zod).
  2. Số lượng cảnh: Từ `8 đến 15 cảnh` (cho video 2 phút tiêu chuẩn, smoke test: 3-5 cảnh).
  3. Tổng số từ tính động từ `config/calibration.json` ($3.34$ từ/s): $\sim 380$ từ cho 120s ($360 - 390$ từ).
  4. **Fact-Check:** 100% con số (số nguyên, số thập phân, %, năm) trong lời đọc, chữ hiển thị, `StatScene` phải xuất hiện nguyên văn trong mục `## Dữ kiện / Số liệu` của `brief.md`.
  5. Trường `source` của `StatScene` bắt buộc phải trỏ vào mục trong brief, không được tự nghĩ.

### Cổng Media: Độ phân giải & Upscale Media (`check_media`)
- **Lệnh thực thi:** `npx tsx scripts/check_media.ts runs/<slug>/storyboard.json`
- **Tiêu chí đánh giá:**
  1. Đọc kích thước thật bằng `ffprobe`.
  2. **Công thức Upscale:**
     - `cover`: $\max(1920/w, 1080/h) \times 1.08 \le 1.5\times$.
     - `contain-blur`: $\min(1920/w, 1080/h) \times 1.08 \le 1.5\times$.
     - Vượt quá $1.5\times \implies$ Báo FAIL dứt khoát.
  3. Gán nhãn bản quyền trung thực `"ai-generated, unverified"`, lưu `manifest.json`.

### Cổng 2: Kiểm định Dòng thời gian & Auto-Tune (`build_timeline`)
- **Lệnh thực thi:** `npx tsx scripts/build_timeline.ts runs/<slug>/storyboard.json runs/<slug>/audio/ runs/<slug>/timeline.json`
- **Tiêu chí đánh giá:**
  1. Đệm nhịp thở: Pre-roll 0.2s + Post-roll 0.4s từng cảnh.
  2. Tự động kích hoạt Auto-Tune `--rate` bù trừ $\pm 5\% - 8\%$ trong dải 100s–145s đưa thời lượng về `110s – 130s`.
  3. Tự động đồng bộ media sang `public/runs/<slug>/`.

### Cổng 3: Kiểm định Thị giác Đo DOM Thật (`check_video`)
- **Lệnh thực thi:** `npx tsx scripts/check_video.ts runs/<slug>/timeline.json`
- **Tiêu chí đánh giá:**
  1. Lấy mẫu thích ứng: Adaptive 85% sampling cho animation và 50% cho cảnh tĩnh.
  2. Đo đạc kích thước subpixel qua DOM headless Chromium (`@remotion/layout-utils`) với font Outfit 72px và Inter 48px.
  3. Chiều rộng tối đa không vượt quá vùng an toàn $1728\text{px}$ (khung hình 1920px trừ 2 lề 96px).
  4. Cỡ chữ luôn $\ge 48\text{px}$ bảo đảm quy tắc không có chữ quá nhỏ.

### Cổng 4: Kiểm định Âm thanh EBU R128 & Mastering 2s (`check_audio`)
- **Lệnh thực thi:** `npx tsx scripts/check_audio.ts runs/<slug>/out/<slug>.mp4`
- **Tiêu chí đánh giá:**
  1. Integrated Loudness: chuẩn $-16$ đến $-14$ LUFS.
  2. True Peak: $\le -1.0$ dBFS (tránh vỡ tiếng).
  3. Xác thực Audio Ducking: BGM giảm 40% (xuống $\approx 0.05$) khi có thoại.
  4. Không có khoảng im lặng bất thường $> 2.5$s.
  5. Nếu lệch chuẩn: Tự động chạy **Post-Render Mastering 2s** (`loudnorm` 2-pass, `-c:v copy`), không re-render video.

## 2. Cơ chế Tự sửa lỗi (Self-Healing Rule)
- Khi một cổng kiểm tra trả về trạng thái **FAIL**:
  - Agent đọc thông báo lỗi chi tiết.
  - Tự động điều chỉnh lại file nguồn (ví dụ: đối soát lại số liệu với brief, chỉnh lại template nếu text tràn...).
  - Chạy lại cổng kiểm định.
- **Giới hạn số lần thử:** Tối đa `2 lần sửa tự động`. Nếu sau 2 lần cổng vẫn thất bại, **DỪNG LẠI NGAY LẬP TỨC** và báo cáo nguyên nhân cho người dùng.

## 3. Ghi chép trạng thái bắt buộc
- Mọi kết quả kiểm tra (Pass/Fail, metrics, danh sách ảnh chụp still, hệ số upscale, loudness) đều phải được ghi lại thành bảng trực quan vào file `runs/<slug>/status.md`.
