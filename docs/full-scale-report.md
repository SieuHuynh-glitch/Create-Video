# Báo Cáo Đo Lường Kiểm Thử Quy Mô Lớn 2 Phút (Full-Scale Production Benchmark Report)

*Phiên bản hệ thống: 2.5 (Design Refinement & Zero-Flaw Hardening)*  
*Thời gian thiết lập: 2026-10-16*  
*Trạng thái: Sẵn sàng thực thi với Brief 2 phút do người dùng cung cấp (Tất cả ô chỉ số chưa chạy đều ghi "chưa đo")*

Tài liệu này là hồ sơ đo lường thực nghiệm cho đợt kiểm thử quy mô lớn 2 phút (~120 giây, 8–15 cảnh), thu thập toàn bộ các chỉ số vận hành thực tế không qua phóng đại hay quảng bá.

---

## 1. Thông Tin Đợt Chạy (Run Metadata)

- **Mã dự án (Slug):** `<slug>` *(chờ người dùng khởi tạo)*
- **Chủ đề brief:** `<chủ đề do người dùng cung cấp>`
- **Thời lượng mục tiêu:** 120 giây (3.600 frames @ 30fps)
- **Số cảnh dự kiến:** 8 – 15 cảnh (khuyến nghị: 10 cảnh)
- **Tốc độ đọc hiệu chuẩn chuẩn hóa:** 3.34 từ/giây (200.4 từ/phút) theo `config/calibration.json`
- **Số từ mục tiêu lý thuyết:**
  $$\text{Từ mục tiêu} \approx 380\text{ từ (dải an toàn: } 360 - 390\text{ từ cho 120s)}$$

---

## 2. Bảng Chỉ Số Thực Nghiệm (Actual Metrics)

| Chỉ số đo lường | Tiêu chuẩn v2.5 | Kết quả thực tế | Đánh giá |
| :--- | :--- | :--- | :--- |
| **Tổng số từ thuyết minh** | 360 – 390 từ (mục tiêu ~380) | `chưa đo` | `chưa đo` |
| **Tốc độ đọc thực tế (WPS)** | $3.20 - 3.50$ từ/giây | `chưa đo` | `chưa đo` |
| **Tổng thời lượng video** | 115s – 125s (3.450 – 3.750 frames) | `chưa đo` | `chưa đo` |
| **Số cảnh thực tế** | 8 – 15 cảnh | `chưa đo` | `chưa đo` |
| **Mức tiêu thụ RAM đỉnh (Task Manager)** | Theo dõi trực tiếp RAM máy trong khi render | `chưa đo` | `chưa đo` |
| **Thời gian render MP4** | $\le 10$ phút (máy trạm/laptop cá nhân) | `chưa đo` | `chưa đo` |
| **Số lần tự sửa (Auto-heal)** | Ghi nhận trung thực mọi lỗi phát sinh | `chưa đo` | `chưa đo` |
| **Số ảnh lỗi / watermark bị phát hiện** | Rà soát qua Contact Sheet ($\le 6$ ảnh/trang) & Corner Crops 1:1 | `chưa đo` | `chưa đo` |

---

## 3. Nhật Ký 5 Cổng Kiểm Soát Chất Lượng (Quality Gates Audit)

### 3.1. Cổng 1: Storyboard Fact-Check & WPM (`scripts/validate_storyboard.ts`)
- **Kết quả:** `chưa đo`
- **Số từ kịch bản:** `chưa đo` từ (ngưỡng tính động: `chưa đo`)
- **Đối soát số liệu Fact-Check:**
  - Mọi con số (số nguyên, số thập phân, %, năm) trong lời đọc, chữ hiển thị, `StatScene`: `chưa đo`.
  - Đối chiếu nguyên văn trong `brief.md` (mục "Dữ kiện / Số liệu"): `chưa đo`.
  - Trường `source` của `StatScene` trỏ tới mục trong brief: `chưa đo`.

### 3.2. Cổng Media: Độ phân giải & Upscale (`scripts/check_media.ts`)
- **Kết quả:** `chưa đo`
- **Kiểm định độ phân giải thực tế (`ffprobe`):**
  - Số ảnh đạt chuẩn 1920x1080 (16:9): `chưa đo`.
  - Công thức Upscale:
    - Chế độ `cover`: $\max(1920/w, 1080/h) \times 1.08 \le 1.5\times$: `chưa đo`.
    - Chế độ `contain-blur`: $\min(1920/w, 1080/h) \times 1.08 \le 1.5\times$: `chưa đo`.
- **Hồ sơ bản quyền `manifest.json`:** Gán nhãn `"ai-generated, unverified"` kèm timestamp và nguồn tạo: `chưa đo`.
- **Rà soát trực quan Contact Sheet (Chốt 1.5):**
  - File lưới Contact Sheet: `runs/<slug>/out/contact_sheet.png` (phân trang $\le 6$ ảnh/trang): `chưa đo`.
  - Ảnh crop 1:1 góc dưới phải: `runs/<slug>/out/crops/scene_*_corner_br.png`: `chưa đo`.
  - Phát hiện watermark: `chưa đo`.
  - Phát hiện dị tật hình thể / text rác: `chưa đo`.

### 3.3. Cổng 2: Timeline Auto-Tune (`scripts/build_timeline.ts`)
- **Kết quả:** `chưa đo`
- **Thời lượng giọng đọc thô (Raw Edge-TTS):** `chưa đo` giây.
- **Auto-Tune bù trừ:** `--rate = chưa đo %` (nếu kích hoạt điều tốc).
- **Đệm nhịp thở:** Pre-roll 0.2s + Post-roll 0.4s từng cảnh.
- **Tổng thời lượng timeline hoàn thiện:** `chưa đo` frames (`chưa đo` giây).

### 3.4. Cổng 3: Visual QA Đo DOM Thật (`scripts/check_video.ts`)
- **Kết quả:** `chưa đo`
- **Phương pháp lấy mẫu:** Adaptive 85% sampling cho animation và 50% cho cảnh tĩnh.
- **Đo tràn chữ cấp Subpixel bằng DOM Chromium (`@remotion/layout-utils`):**
  - Tiêu đề (`Outfit 72px 700`): max pixel width = `chưa đo` px / 1728px.
  - Phụ đề / Nội dung (`Inter 48px 500`): max pixel width = `chưa đo` px / 1728px.
  - Cỡ chữ tối thiểu: $\ge 48$px.
- **Safe-margin kiểm định:** Đạt chuẩn $\ge 96$px toàn bộ 4 cạnh.

### 3.5. Cổng 4: Audio QA & Post-Render Mastering (`scripts/check_audio.ts`)
- **Kết quả:** `chưa đo`
- **Đo bản mix âm thanh EBU R128:**
  - Integrated Loudness: `chưa đo` LUFS (chuẩn: $-16.0$ đến $-14.0$ LUFS).
  - True Peak: `chưa đo` dBFS (chuẩn: $\le -1.0$ dBFS).
  - Khoảng lặng bất thường (> 2.5s): `chưa đo`.
  - Audio Ducking: BGM giảm 40% (volume $\approx 0.05$) khi có giọng đọc: `chưa đo`.
- **Post-Render Mastering 2s (nếu có lệch):** Chuẩn hóa 2-pass `loudnorm` (`-c:v copy`), không re-render video: `chưa đo`.

---

## 4. Thời Gian Thực Thi Từng Công Đoạn (Pipeline Timing Breakdown)

| Công đoạn | Thời gian bắt đầu | Thời gian hoàn tất | Tổng thời gian (giây) |
| :--- | :--- | :--- | :--- |
| **Giai đoạn 1: Kịch bản & Cổng 1 (Fact-Check)** | `--` | `--` | `chưa đo` |
| **Chốt duyệt 1: Duyệt kịch bản** | `--` | `--` | *(Thời gian người dùng phản hồi)* |
| **Giai đoạn 1.5: Tải media AI & Contact Sheet + Crops** | `--` | `--` | `chưa đo` |
| **Chốt duyệt 1.5: Soát Contact Sheet & Corner Crops** | `--` | `--` | *(Thời gian người dùng duyệt ảnh)* |
| **Giai đoạn 2: Voiceover & Cổng 2 (Timeline)** | `--` | `--` | `chưa đo` |
| **Giai đoạn 3: Dựng Cảnh 1 & Chốt duyệt 2** | `--` | `--` | `chưa đo` |
| **Giai đoạn 4: Dựng toàn bộ & Cổng 3 (Visual QA DOM)** | `--` | `--` | `chưa đo` |
| **Giai đoạn 5: Render MP4 an toàn** | `--` | `--` | `chưa đo` |
| **Cổng 4: Kiểm định âm thanh & Mastering 2s** | `--` | `--` | `chưa đo` |
| **Giai đoạn 6: Xuất bản SEO & Social** | `--` | `--` | `chưa đo` |
| **TỔNG THỜI GIAN MÁY CHẠY (Machine Time)** | | | **chưa đo** |

---

## 5. Kết Luận & Bàn Giao Thành Phẩm

- **File MP4 xuất xưởng:** `runs/<slug>/out/<slug>.mp4`
- **Dung lượng file:** `chưa đo` MB
- **Độ phân giải & Tốc độ khung hình:** 1920x1080 @ 30fps, Codec H.264 / AAC
- **Tài liệu SEO & Tiếp thị:** `runs/<slug>/social.md`
- **Tình trạng giải phóng bộ nhớ:** Dọn dẹp an toàn qua lệnh `--clean`.
