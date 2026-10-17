# Báo Cáo Đo Lường Kiểm Thử Quy Mô Lớn 2 Phút (Full-Scale Production Benchmark Report)

> [!WARNING]
> **TÀI LIỆU NÀY ĐÃ HẾT HIỆU LỰC / SUPERSEDED (v2.5, slideshow architecture).**  
> Báo cáo này ghi nhận kết quả đợt chạy trên phiên bản cũ v2.5 sử dụng kiến trúc slideshow Ken Burns 2.5D tĩnh. Đối với báo cáo đo lường thực nghiệm hiện tại và bảng đối soát bằng chứng vật lý, vui lòng tham khảo [docs/audit-v4.2.md](file:///d:/project/Create-Video/docs/audit-v4.2.md) và [docs/STATUS.md](file:///d:/project/Create-Video/docs/STATUS.md).

*Phiên bản hệ thống: 2.5 (Design Refinement & Zero-Flaw Hardening)*  
*Thời gian chạy thực tế: 16/10/2026 (11:10 – 11:48)*  
*Trạng thái: Đã lưu trữ (Archived / Superseded)*

Tài liệu này là hồ sơ đo lường thực nghiệm cho đợt kiểm thử quy mô lớn 2 phút (chính xác 120,0 giây = đúng 3.600 frames @ 30fps, 10 phân cảnh), thu thập toàn bộ các chỉ số vận hành thực tế được đo đạc trực tiếp từ file MP4 và hệ thống Remotion.

---

## 1. Thông Tin Đợt Chạy (Run Metadata)

- **Mã dự án (Slug):** `natural-cycle`
- **Chủ đề brief:** Phim nghệ thuật siêu thực điện ảnh "NATURAL CYCLE" (Vòng tuần hoàn tự nhiên của sự sống - cái chết - tái sinh từ hộp sọ lông vũ nguyên bản)
- **Hình thức thể hiện:** Phim thơ thị giác đen trắng trên nền trắng tinh khiết (`#FFFFFF`), kết hợp âm thanh Sound Design & Drone Atmosphere (không thoại)
- **Thời lượng mục tiêu:** 120 giây (3.600 frames @ 30fps)
- **Thời lượng thực tế xuất xưởng:** **120.0 giây (3.600 frames @ 30fps)**
- **Số cảnh thực tế:** 10 cảnh
- **Độ phân giải:** 1920x1080 (Full HD 16:9)

---

## 2. Bảng Chỉ Số Thực Nghiệm (Actual Metrics)

| Chỉ số đo lường | Tiêu chuẩn v2.5 | Kết quả thực tế | Đánh giá |
| :--- | :--- | :--- | :--- |
| **Tổng thời lượng video** | 115s – 125s (3.450 – 3.750 frames) | **120.0s (3.600 frames)** | 🎯 **Khớp 100% tuyệt đối** |
| **Số cảnh thực tế** | 8 – 15 cảnh | **10 cảnh** | ✅ Đạt chuẩn kịch bản |
| **Fact-Check số liệu Brief** | Khớp 100% mọi số liệu trong Brief | **4 quả đầu lâu trên cây, 1 quả rơi** | ✅ **Passed Fact-Check** |
| **Độ phân giải & Upscale Media** | 1920x1080, Upscale $\le 1.5\times$ | **1920x1080 (Base Scale $1.0\times$)** | ✅ **Passed Cổng Media** |
| **Rà soát Watermark & Contact Sheet** | Contact Sheet $\le 6$ ảnh/trang & corner crop | **2 trang Contact Sheet, 10 crop 1:1 góc BR (0 watermark)** | ✅ **Sạch 100%** |
| **Đo lường DOM Subpixel layout** | Safe-padding $\ge 96$px, không tràn chữ | **0 lỗi tràn chữ trên Chromium Headless** | ✅ **Passed Cổng 3** |
| **Integrated Loudness (Độ ồn)** | -16.0 đến -14.0 LUFS | **-16.0 LUFS** | 🎯 **Chuẩn Web/YouTube** |
| **True Peak (Độ đỉnh âm)** | $\le -1.0$ dBFS | **-1.0 dBFS** | 🎯 **Chống clipping tuyệt đối** |
| **Dải động âm thanh (LRA)** | $\ge 4.0$ LU | **5.0 LU** | ✅ Đạt chuẩn điện ảnh |
| **Mức tiêu thụ RAM đỉnh** | Quản lý an toàn $\le 16$ GB RAM | **~9.9 GB tổng hệ thống (RAM trống $\approx 6.0$ GB)** | ✅ Không swap, rất mượt |
| **Thời gian render MP4 (3.600 frames)** | $\le 10$ phút (máy 4 lõi) | **7 phút 58 giây** | ⚡ **Nhanh vượt kỳ vọng** |
| **Dung lượng file MP4 hoàn thiện** | $30 - 80$ MB | **46.71 MB** | 📦 Tối ưu nén H.264 |

---

## 3. Nhật Ký 5 Cổng Kiểm Soát Chất Lượng (Quality Gates Audit)

### 3.1. Cổng 1: Storyboard Fact-Check & Duration (`scripts/validate_storyboard.ts`)
- **Kết quả:** `PASSED`
- **Fact-Check Contract:** Đối soát số quả đầu lâu kết trái trên cây đại ngàn (đúng 4 quả tại Scene 8), số quả đầu lâu rụng (đúng 1 quả tại Scene 9), khớp nguyên văn với `runs/natural-cycle/brief.md`.
- **Tổng thời lượng phân cảnh:** $8 + 12 + 18 + 12 + 12 + 10 + 18 + 14 + 10 + 6 = 120.0$ giây.

### 3.2. Cổng Media: Độ phân giải & Upscale (`scripts/check_media.ts`)
- **Kết quả:** `PASSED`
- **10/10 file ảnh media:** Đạt đúng kích thước 1920x1080 pixel chuẩn 16:9, tỷ lệ phóng đại `baseScale = 1.0` (ngưỡng tối đa cho phép là 1.5).
- **Hồ sơ bản quyền `manifest.json`:** Khởi tạo thành công với nhãn `User Reference` cho ảnh gốc của người dùng và `ai-generated, unverified` cho các cảnh sinh thêm.
- **Contact Sheet & Corner Crops:**
  - Trang 1: `runs/natural-cycle/out/contact_sheet_p1.png` (806.7 KB, 6 ảnh).
  - Trang 2: `runs/natural-cycle/out/contact_sheet_p2.png` (259.2 KB, 4 ảnh).
  - Crops 1:1: 10 file PNG tại `runs/natural-cycle/out/crops/` rà soát góc dưới cùng bên phải, xác nhận không có watermark.

### 3.3. Cổng 2: Timeline Validation (`scripts/build_timeline.ts`)
- **Kết quả:** `PASSED`
- **Âm thanh cảnh:** Tìm thấy và đồng bộ 10 track âm thanh `.wav` tương ứng 10 cảnh.
- **BGM Master Track:** Tự động đồng bộ `bgm_natural_cycle.wav` vào `public/runs/natural-cycle/audio/`.
- **Tổng frames:** Đúng 3.600 frames (@ 30fps), xuất file `runs/natural-cycle/timeline.json`.

### 3.4. Cổng 3: Visual QA Đo DOM Thật (`scripts/check_video.ts`)
- **Kết quả:** `PASSED`
- **Đo DOM thực tế:** Sử dụng Chromium Headless đo kích thước chữ Subpixel. Mọi phân cảnh đều an toàn tuyệt đối, không có hiện tượng tràn khung hay che khuất.
- **Still Frames QA:** Xuất thành công 10 ảnh tĩnh tại 50% thời lượng mỗi cảnh vào `runs/natural-cycle/out/stills/`:
  - `scene_01_frame_120.png`
  - `scene_02_frame_420.png`
  - `scene_03_frame_870.png`
  - `scene_04_frame_1320.png`
  - `scene_05_frame_1680.png`
  - `scene_06_frame_2010.png`
  - `scene_07_frame_2430.png`
  - `scene_08_frame_2910.png`
  - `scene_09_frame_3270.png`
  - `scene_10_frame_3510.png`

### 3.5. Cổng 4: Audio QA & Post-Render Mastering (`scripts/check_audio.ts`)
- **Kết quả:** `PASSED HOÀN TOÀN`
- **Đo trực tiếp trên file MP4 xuất xưởng:**
  - Integrated Loudness: **-16.0 LUFS** (Nằm trong dải vàng chuẩn Web/YouTube -16 đến -14 LUFS).
  - True Peak: **-1.0 dBFS** (Đạt trần an toàn chống méo tiếng).
  - Loudness Range (LRA): **5.0 LU**.
  - Dead Silence: Không phát hiện khoảng lặng chết (> 1.5s).

---

## 4. Thời Gian Thực Thi Từng Công Đoạn (Pipeline Timing Breakdown)

| Công đoạn | Bắt đầu | Hoàn tất | Tổng thời gian |
| :--- | :--- | :--- | :--- |
| **Giai đoạn 1: Brief, Script & Cổng 1 (Fact-Check)** | 11:10 | 11:21 | ~11 phút |
| **Giai đoạn 1.5: Chuẩn bị Media, Upscale & Contact Sheet** | 11:21 | 11:29 | ~8 phút |
| **Giai đoạn 2: Tạo Master Audio 120s & Cổng 2 (Timeline)** | 11:29 | 11:35 | ~6 phút |
| **Giai đoạn 4: Visual QA & Still Frames Capture (Cổng 3)** | 11:35 | 11:39 | ~4 phút |
| **Giai đoạn 5: Render Video Full HD 2 Phút (3.600 frames)** | 11:39:34 | 11:47:32 | **7 phút 58 giây** |
| **Cổng 4: Audio QA (loudnorm & EBU R128)** | 11:47:38 | 11:47:50 | **12 giây** |
| **Xuất bản Social & SEO Chapters (`social.md`)** | 11:47:58 | 11:48:02 | **4 giây** |
| **TỔNG TOÀN TIẾN TRÌNH TỪ ĐẦU ĐẾN CUỐI** | **11:10** | **11:48** | **~38 phút** |

---

## 5. Kết Luận & Đánh Giá

1. **Hiệu năng xuất sắc:** Render trọn vẹn 2 phút video Full HD 1080p với 3.600 frames chỉ mất chưa đầy 8 phút trên phần cứng thông thường (CPU 4 nhân, 16GB RAM), tiết kiệm bộ nhớ với hơn 6GB RAM trống liên tục.
2. **Chất lượng âm thanh - hình ảnh đạt chuẩn:** Đạt chuẩn âm thanh Web/YouTube (-16 LUFS, -1.0 dBFS True Peak), hình ảnh siêu thực đen trắng trên nền trắng tinh khiết giữ nguyên độ phân giải Full HD không bị nén hay che mờ.
3. **Tự động hóa hoàn toàn:** Toàn bộ chu trình từ ảnh mẫu + brief thô của người dùng đến video MP4 cuối cùng và tài liệu marketing SEO đã vận hành thành công 100%.
