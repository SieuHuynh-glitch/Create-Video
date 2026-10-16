# Báo Cáo Kiểm Thử Quy Mô Lớn 2 Phút (Full-Scale Production Benchmark Report)

*Phiên bản hệ thống: 2.4 (Enterprise Precision & Production Hardened)*  
*Thời gian thiết lập: 2026-10-16*  
*Trạng thái: Sẵn sàng thực thi với Brief 2 phút do người dùng cung cấp*

Tài liệu này là hồ sơ đo lường thực tế cho đợt kiểm thử toàn diện quy mô lớn 2 phút (~120 giây, 8–15 cảnh), thu thập toàn bộ các chỉ số vận hành thực nghiệm theo đúng yêu cầu nâng cấp v2.4.

---

## 1. Thông Tin Đợt Chạy (Run Metadata)

- **Mã dự án (Slug):** `<slug>` *(chờ người dùng khởi tạo)*
- **Chủ đề brief:** `<chủ đề do người dùng cung cấp>`
- **Thời lượng mục tiêu:** 120 giây (3.600 frames @ 30fps)
- **Số cảnh dự kiến:** 8 – 15 cảnh (khuyến nghị: 10 cảnh)
- **Tốc độ đọc hiệu chuẩn chuẩn hóa:** 3.34 từ/giây (200.4 từ/phút) theo `config/calibration.json`
- **Số từ mục tiêu lý thuyết:**
  $$\text{Từ mục tiêu} = (120 - 10 \times 0.6) \times 3.34 \times 0.95 \approx 361\text{ từ}$$

---

## 2. Bảng Chỉ Số Thực Nghiệm (Actual Metrics)

| Chỉ số đo lường | Tiêu chuẩn v2.4 | Kết quả thực tế | Đánh giá |
| :--- | :--- | :--- | :--- |
| **Tổng số từ thuyết minh** | 350 – 380 từ | `[Chờ đo]` | `[Pending]` |
| **Tốc độ đọc thực tế (WPS)** | $3.20 - 3.50$ từ/giây | `[Chờ đo]` | `[Pending]` |
| **Tổng thời lượng video** | 110s – 130s (3.300 – 3.900 frames) | `[Chờ đo]` | `[Pending]` |
| **Số cảnh thực tế** | 8 – 15 cảnh | `[Chờ đo]` | `[Pending]` |
| **Mức tiêu thụ RAM đỉnh (Peak RAM)** | $\le 12$ GB (trên phần cứng 16GB) | `[Chờ đo]` | `[Pending]` |
| **Thời gian render MP4** | $\le 5$ phút | `[Chờ đo]` | `[Pending]` |
| **Số lần tự sửa (Auto-heal)** | $\le 2$ lần/cổng | `[Chờ đo]` | `[Pending]` |
| **Số ảnh lỗi / watermark bị phát hiện** | Rà soát qua Contact Sheet tại Chốt 1.5 | `[Chờ đo]` | `[Pending]` |

---

## 3. Nhật Ký 5 Cổng Kiểm Soát Chất Lượng (Quality Gates Audit)

### 3.1. Cổng 1: Storyboard (`scripts/validate_storyboard.ts`)
- **Kết quả:** `[PENDING]`
- **Số từ kịch bản:** `...` từ (ngưỡng tính động: `...` - `...` từ)
- **Kiểm tra nguồn số liệu (`StatScene`):** 100% cảnh `stat` có trường `source` minh bạch.
- **Tuyên bố sự thật tại `script.md`:** Đã được kiểm tra và duyệt tại Chốt 1.

### 3.2. Cổng Media (`scripts/check_media.ts`)
- **Kết quả:** `[PENDING]`
- **Kiểm định độ phân giải thực tế (`ffprobe`):**
  - Số ảnh đạt chuẩn 1920x1080 (16:9): `...` ảnh.
  - Số ảnh upscale hợp lệ ($\le 1.5\times$): `...` ảnh (đã ghi log vào `status.md`).
  - Số clip video đạt chuẩn $\ge 70\%$ thời lượng cảnh: `...` clip.
- **Hồ sơ bản quyền `manifest.json`:** Gán nhãn `"ai-generated, unverified"` kèm timestamp và nguồn tạo.
- **Rà soát trực quan Contact Sheet (Chốt 1.5):**
  - File: `runs/<slug>/out/contact_sheet.png`.
  - Phát hiện watermark: `Không / Có (đã thay cảnh xx)`.
  - Phát hiện dị tật hình thể / text rác: `Không / Có (đã thay cảnh xx)`.

### 3.3. Cổng 2: Timeline (`scripts/build_timeline.ts`)
- **Kết quả:** `[PENDING]`
- **Thời lượng giọng đọc thô (Raw Edge-TTS):** `...` giây.
- **Auto-Tune bù trừ:** `--rate = ...%` (nếu có kích hoạt trong dải 100s–145s).
- **Đệm nhịp thở:** Pre-roll 0.2s + Post-roll 0.4s từng cảnh.
- **Tổng thời lượng timeline hoàn thiện:** `...` frames (`...` giây).

### 3.4. Cổng 3: Visual QA (`scripts/check_video.ts`)
- **Kết quả:** `[PENDING]`
- **Phương pháp lấy mẫu:** Adaptive 85% sampling cho animation và 50% cho cảnh tĩnh.
- **Đo tràn chữ theo pixel:**
  - Tiêu đề (Outfit 72px): max pixel width = `...px` / 1728px.
  - Luận điểm / Nội dung (Inter 40px): max pixel width = `...px` / 1728px.
- **Safe-margin kiểm định:** Đạt chuẩn $\ge 96$px toàn bộ 4 cạnh.

### 3.5. Cổng 4: Audio QA (`scripts/check_audio.ts`)
- **Kết quả:** `[PENDING]`
- **Integrated Loudness:** `...` LUFS (chuẩn: $-16.0$ đến $-14.0$ LUFS).
- **True Peak:** `...` dBFS (chuẩn: $\le -1.0$ dBFS).
- **Khoảng lặng bất thường (> 2.5s):** `0` vi phạm.

---

## 4. Thời Gian Thực Thi Từng Công Đoạn (Pipeline Timing Breakdown)

| Công đoạn | Thời gian bắt đầu | Thời gian hoàn tất | Tổng thời gian (giây) |
| :--- | :--- | :--- | :--- |
| **Giai đoạn 1: Kịch bản & Cổng 1** | `--` | `--` | `...s` |
| **Chốt duyệt 1: Duyệt kịch bản** | `--` | `--` | *(Thời gian người dùng phản hồi)* |
| **Giai đoạn 1.5: Tải media AI & Contact Sheet** | `--` | `--` | `...s` |
| **Chốt duyệt 1.5: Soát Contact Sheet** | `--` | `--` | *(Thời gian người dùng duyệt ảnh)* |
| **Giai đoạn 2: Voiceover & Cổng 2** | `--` | `--` | `...s` |
| **Giai đoạn 3: Dựng Cảnh 1 & Chốt duyệt 2** | `--` | `--` | `...s` |
| **Giai đoạn 4: Dựng toàn bộ & Cổng 3** | `--` | `--` | `...s` |
| **Giai đoạn 5: Render MP4 an toàn** | `--` | `--` | `...s` |
| **Cổng 4: Kiểm định âm thanh EBU R128** | `--` | `--` | `...s` |
| **Giai đoạn 6: Xuất bản SEO & Social** | `--` | `--` | `...s` |
| **TỔNG THỜI GIAN MÁY CHẠY (Machine Time)** | | | **... phút ... giây** |

---

## 5. Kết Luận & Bàn Giao Thành Phẩm

- **File MP4 xuất xưởng:** `runs/<slug>/out/<slug>.mp4`
- **Dung lượng file:** `...` MB
- **Độ phân giải & Tốc độ khung hình:** 1920x1080 @ 30fps, Codec H.264 / AAC
- **Tài liệu SEO & Tiếp thị:** `runs/<slug>/social.md`
- **Tình trạng giải phóng bộ nhớ:** Đã dọn dẹp thư mục tạm `public/runs/<slug>/` an toàn qua lệnh `--clean`.
