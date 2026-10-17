# BÁO CÁO KIỂM TOÁN THỰC THỰC V4.2-LITE (EMPIRICAL AUDIT REPORT)
**Mã kiểm toán:** AUDIT-V4.2-LITE-EMPIRICAL  
**Nhánh:** `v4.2-lite` | **Tag mốc:** `pre-v4.2`  
**Thời gian đo lường:** 17/10/2026  
**Nguyên tắc:** Chỉ ghi nhận con số ĐÃ ĐO THẬT bằng lệnh/code, loại bỏ toàn bộ từ ngữ phóng đại.

---

## 1. KIỂM TOÁN FFMPEG FILTERS & CƠ CHẾ QA THỰC TẾ

### 1.1. Lệnh kiểm tra và Kết quả bộ lọc FFmpeg nhúng Remotion
- **Lệnh thực thi:** `npx remotion ffmpeg -filters` (Remotion bundled FFmpeg v7.1.0-win32-x64-msvc).
- **Cờ biên dịch gốc:** `--disable-filters --enable-filter=aformat,atrim,acopy,adelay,anullsrc,atempo,apad,amerge,amix,asetrate,asetpts,aresample,concat,loudnorm,colorspace,tinterlace,fieldorder,pan,volume,scale,sine,split,nullsrc,silencedetect,palettegen,paletteuse,zscale,tonemap,copy`.
- **Bảng đối soát bộ lọc thực tế:**

| Bộ lọc (Filter) | Có trong Remotion FFmpeg? | Mục đích sử dụng khai báo trong tài liệu | Cơ chế thực tế đang chạy trong mã nguồn |
| :--- | :---: | :--- | :--- |
| `loudnorm` | **CÓ** | Đo LUFS, True Peak, LRA | Chạy 2-pass phân tích và mastering audio trong `scripts/check_audio.ts`. |
| `silencedetect` | **CÓ** | Phát hiện khoảng lặng dài (> 1.5s) | Chạy regex `silence_start:` trong `scripts/check_audio.ts`. |
| `scale` | **CÓ** | Nâng độ phân giải, scale Lanczos | Sử dụng trong `scripts/normalize_visuals.ts` cho video. |
| `crop` | **CÓ** | Cắt góc ảnh 1:1 kiểm tra watermark | Sử dụng trong `scripts/generate_contact_sheet.ts`. |
| `freezedetect` | **KHÔNG** | Phát hiện video đứng hình | `scripts/check_clip.ts` gọi lệnh bị lỗi, bị khối `catch` nuốt lỗi; trả về 0 phát hiện freeze (giả định PASS sai lệch). |
| `minterpolate` | **KHÔNG** | Nội suy chuyển động mượt 30fps | `scripts/check_clip.ts` ghi log "kéo giãn minterpolate" nhưng lệnh thực tế chỉ chạy `-vf "setpts=PTS*...,fps=30"` (nhân đôi frame). |
| `ebur128` | **KHÔNG** | Đo âm thanh chuẩn EBU R128 đồ thị | Hệ thống chỉ dùng `loudnorm` để trích xuất số liệu. |
| `signalstats` | **KHÔNG** | Đo độ sáng YAVG và độ bão hòa SAT | Đã chuyển sang chạy script Python (`PIL + NumPy`) trong `scripts/expand_references.ts`. |
| `xstack` / `tile` | **KHÔNG** | Ghép lưới ảnh Contact Sheet | Đã chuyển sang chạy Python PIL (`scripts/render_contact_sheet.py`). |

---

## 2. KIỂM TRA NGUỒN GỐC TẦNG 2 (`jobs/done/natural-cycle-v2/shot_01.mp4`)

- **Lệnh thực thi:** `npx remotion ffprobe -v error -show_format -show_streams -of json "jobs/done/natural-cycle-v2/shot_01.mp4"`
- **Dữ liệu đo đạc thực nghiệm:**
  - Dung lượng file: **11,403 bytes** (~11.1 KB).
  - Thời lượng: 4.000 giây (100 frames).
  - Tốc độ khung hình (Frame Rate): **25 fps** (không phải 24 fps chuẩn LTX-Video).
  - Độ phân giải: 704 × 384 (tỷ lệ 16:9).
  - Bitrate: **18,658 bps** (~18.6 kbps, cực kỳ thấp).
  - Encoder Tag: `Lavc61.19.100 libx264` / `Lavf61.7.100` (Remotion FFmpeg build trên máy local).
- **Kết luận:** File này là **file mock (clip mẫu cục bộ)** được sinh bằng lệnh thử nghiệm test script, **KHÔNG PHẢI** là clip LTX-Video thật sinh từ Colab GPU (clip LTX-Video thật có 49 frames @ 24fps ≈ 2.04s và dung lượng nhiều MB).
- **Trạng thái ghi nhận:** **TẦNG 2: CHƯA KIỂM CHỨNG THỰC NGHIỆM** (không được tính là PASS).

---

## 3. ĐÁNH GIÁ THỰC NGHIỆM VIDEO TẦNG 0 & ĐỘ ĐỘNG KHUNG HÌNH (A.5)

- **Lệnh thực thi:** Phân tích từng frame bằng OpenCV & NumPy (`scratch/measure_video_dynamics.py`) trên cả 2 bản video:
  - Bản 1 (Cũ - Tầng 0 `LumaParallaxScene`): `out/natural-cycle-v2.mp4`
  - Bản 2 (Mới - Tầng 0 `ContinuousMetamorphosisScene`): `runs/natural-cycle/out/natural-cycle.mp4`

### 3.1. Bảng số liệu đo đạc vật lý thật
| Thông số đo đạc | Bản cũ (`natural-cycle-v2.mp4`) | Bản mới (`natural-cycle.mp4`) | Ghi chú kỹ thuật |
| :--- | :---: | :---: | :--- |
| **Độ phân giải** | 1920 × 1080 | 1920 × 1080 | Chuẩn Full HD 16:9 |
| **Tốc độ khung hình (FPS)** | 30.0 fps | 30.0 fps | Remotion native |
| **Tổng số frame / Thời lượng** | 3,600 frames / 120.00s | 3,600 frames / 120.00s | Khớp 100% timeline |
| **Dung lượng file** | 35,623,148 bytes (34.0 MB) | 48,809,990 bytes (46.6 MB) | Bản mới bitrate cao hơn do biến đổi liên tục |
| **Bitrate trung bình** | 2,374 kbps | 3,253 kbps | Remotion H.264 CRF 18 |
| **Độ chênh lệch sáng trung bình ($\text{Mean } \Delta Y$)** | **0.4984** | **0.7166** | **Tăng 43.8%** độ động khung hình |
| **Trung vị chênh lệch sáng ($\text{Median } \Delta Y$)** | **0.3157** | **0.5003** | **Tăng 58.5%** |
| **Tỷ lệ thời gian gần đứng yên ($\Delta Y < 0.3$)** | **45.35%** (54.4s / 120s) | **38.23%** (45.9s / 120s) | Giảm thời gian tĩnh |
| **Số điểm cắt cứng (Hard Cuts)** | **0** | **0** | Đều chuyển cảnh bằng Dissolve/Melt |

### 3.2. Đánh giá thị giác qua 3 khung hình chuyển tiếp (Transition Frames)
Đã xuất 3 still frame tại các điểm nối cảnh (frame 325, frame 605, frame 900) của `out/natural-cycle-v2.mp4`:
1. `scratch/v2_transition_shot1_to_2.jpg` (Điểm nối Shot 1 sang Shot 2): Hộp sọ nứt xuất hiện vết rạn, mép ngoài viền có lớp viền xám nhẹ (vignetting do luma threshold cắt chưa sạch).
2. `scratch/v2_transition_shot2_to_3.jpg` (Điểm nối Shot 2 sang Shot 3): Hộp sọ mờ dần (opacity 50%) chồng lên đường chân trời mặt đất đang mờ hiện lên. Đây là **hiệu ứng phơi sáng kép (Double Exposure / Cross-Dissolve) giữa 2 bức ảnh tĩnh**, không có sự biến đổi hạt hoặc dòng chảy morphing thực sự.
3. `scratch/v2_transition_shot3_to_4.jpg` (Điểm nối Shot 3 sang Shot 4): Bề mặt đất đen tĩnh lặng bị bóng mờ của cảnh kế tiếp đè lên.

---

## 4. XÁC MINH BẢO VỆ ẢNH GỐC TRONG MÃ NGUỒN

- **Kiểm tra mã nguồn:**
  - `scripts/normalize_visuals.ts`: Chỉ đọc file từ `inputPath` và xuất kết quả ra `outputPath` (`runs/<slug>/media/...`). Tuyệt đối không có lệnh ghi vào thư mục nguồn `inputs/`.
  - `scripts/expand_references.ts`:
    - Biến `imagesDir = path.join(inputDir, "images")` chỉ được dùng trong `fs.existsSync`, `fs.readdirSync`, và đọc đo màu.
    - Toàn bộ ảnh sinh bù (`downloadFluxImage`) được lưu trực tiếp vào `runs/<slug>/media/generated_anchors/`.
- **Kết luận:** Mã nguồn hiện tại bảo vệ thư mục gốc `inputs/<slug>/images/` ở mức chỉ đọc (Read-Only).

---

## 5. XÁC MINH CƠ CHẾ BẢO MẬT DỮ LIỆU & RÒ RỈ MẠNG (A.6)

- **Kiểm tra mã nguồn:**
  - Trong `scripts/generate_clip.ts`, hàm `uploadFrameToPollinationsMedia(imagePath, apiKey)` thực hiện HTTP POST `https://media.pollinations.ai/upload` đưa ảnh người dùng lên bộ lưu trữ công khai của bên thứ ba.
  - Hiện tại trong code **CHƯA CÓ** kiểm tra cờ `ALLOW_UPLOAD=1`.
- **Kết luận:** Nhận xét của chuyên gia là **hoàn toàn chính xác**. Nếu người dùng có `POLLINATIONS_API_KEY` và chạy script `generate_clip.ts`, hệ thống sẽ tự động gửi ảnh lên máy chủ mà không có chốt chặn xác nhận. Cần bổ sung ngay chốt chặn `ALLOW_UPLOAD=1` ở Phần C.

---

## 6. KIỂM TOÁN CƠ CHẾ FACT-CHECK CONTRACT (`allowedNumbers`)

- **Kiểm tra mã nguồn:**
  - Trong `scripts/audit_input.ts` dòng 66:
    `const numbersFound = briefContent.match(/\b\d+(\.\d+)?\b/g) || [];`
- **Kết quả thực tế:** Biểu thức regex này quét toàn bộ các con số trong brief, bao gồm cả số thứ tự đầu mục ("1.", "2.", "3.", "Shot 01", "Shot 12"). Kết quả làm cho danh sách `allowedNumbers` chứa gần như đầy đủ các chữ số từ 0 đến 9, vô hiệu hóa khả năng bắt lỗi số lạ (Fact-Check) của Cổng 1.
- **Kết luận:** Nhận xét của chuyên gia là **hoàn toàn chính xác**. Cần cấu trúc lại để chỉ trích xuất số trong phần dữ kiện của brief.
