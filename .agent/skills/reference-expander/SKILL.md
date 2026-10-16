---
name: reference-expander
description: Đánh giá số lượng và Visual DNA của ảnh đầu vào trong inputs/<slug>/images/. Đo lường độ sáng và độ bão hòa bằng FFmpeg signalstats, xác định phong cách (HIGH_KEY_MONOCHROME_WHITE_BG vs COLOR_DYNAMIC). Tự động sinh bù ảnh neo thiếu qua Pollinations Image FLUX.1 miễn phí và lưu vào runs/<slug>/media/generated_anchors/. Sử dụng ở Bước 0 khi thư mục ảnh đầu vào có ít hơn 10 ảnh cho video 120s.
---

# Reference Expander Skill

Cổng phân tích đặc trưng thị giác (Visual DNA) và tự động sinh bù ảnh neo (Anchor Expansion) khi người dùng cung cấp không đủ ảnh cho thời lượng yêu cầu.

## 1. Mục tiêu và Nguyên tắc Cốt lõi

1. **Đảm bảo Mật độ Khung hình:**
   - Để video 120s không bị lặp ảnh hoặc nghèo nàn chuyển động, số lượng ảnh neo tối thiểu cần đạt $N_{\text{min}} = 10$ ảnh (tương đương mỗi ảnh đảm nhiệm ~8–11 giây).
2. **Khóa cứng Visual DNA bằng Phép Đo Thực tế:**
   - Tuyệt đối không phỏng đoán phong cách; sử dụng trực tiếp bộ lọc `signalstats` của FFmpeg để đo:
     - Độ sáng trung bình `YAVG` và độ sáng 4 góc `cornerYAVG`.
     - Độ bão hòa màu trung bình `SATAVG`.
3. **Sinh bù Miễn phí 100%:**
   - Sử dụng **Pollinations Image FLUX.1** (`https://image.pollinations.ai/prompt/...`), mô hình ảnh tĩnh 1080p hoàn toàn miễn phí 0 Pollen (tránh bẫy `paid_only: true` của Video API theo `docs/video-api-benchmark.md`).
4. **Bảo toàn Thư mục Gốc:**
   - Ảnh sinh bù được lưu vào `runs/<slug>/media/generated_anchors/anchor_XX.jpg`.
   - Tuyệt đối không ghi đè vào `inputs/<slug>/images/`.

---

## 2. Quy trình 3 Bước Thực thi

### Bước A: Đo Visual DNA bằng FFmpeg `signalstats` Thật
Chạy lệnh FFmpeg đo lường thông số trên mẫu ảnh đầu vào:
```bash
npx remotion ffmpeg -i "<sample_image>" -vf "signalstats" -f null -
```
Và đo độ sáng 4 góc (crop 100x100 góc trên bên trái):
```bash
npx remotion ffmpeg -i "<sample_image>" -vf "crop=100:100:0:0,signalstats" -f null -
```

**Tiêu chí phân loại Visual DNA:**
- Nếu `SATAVG <= 15` và `cornerYAVG >= 235`:
  - **Định danh:** `HIGH_KEY_MONOCHROME_WHITE_BG`
  - **Khóa chuỗi Prompt:** *"monochrome black-and-white ink style, isolated on pure solid white #FFFFFF background, high contrast, no color, no grey background, no text, no logos, clean edges"*
- Nếu `SATAVG > 15` hoặc `cornerYAVG < 235`:
  - **Định danh:** `COLOR_DYNAMIC`
  - **Khóa chuỗi Prompt:** Sử dụng bảng màu và mức độ ánh sáng tương ứng trích xuất từ `brief.md`.

### Bước B: Sinh bù Ảnh qua Pollinations Image FLUX.1 (0đ)
1. Xác định số lượng ảnh cần sinh bù:
   $$\Delta N = \max(0, N_{\text{min}} - N_{\text{current}})$$
2. Với mỗi ảnh thiếu, kết hợp mô tả phân cảnh trong `enriched_brief.md` cùng chuỗi khóa Visual DNA:
   - Làm sạch prompt: xóa bỏ các tag Midjourney rác (`--ar`, `--v`, `--style`).
   - Gọi endpoint HTTP:
     ```text
     https://image.pollinations.ai/prompt/<encoded_prompt>?width=1920&height=1080&model=flux&seed=<deterministic_seed>&nologo=true
     ```
   - Tải về và lưu vào: `runs/<slug>/media/generated_anchors/anchor_XX.jpg`.
3. Ghi nhận minh bạch vào `runs/<slug>/manifest.json`:
   - Ảnh từ `inputs/`: ghi nhãn `"user-provided"`.
   - Ảnh sinh bù: ghi nhãn `"ai-generated-anchor (FLUX.1), unverified"`.

### Bước C: Hậu kiểm & Chuyển giao
1. Dùng `ffprobe` xác nhận từng ảnh sinh bù:
   - Dung lượng buffer $> 30\text{KB}$ (loại bỏ trang HTML lỗi).
   - Kích thước đạt chuẩn $1920\times 1080$.
2. Gộp danh sách ảnh:
   $$\text{AnchorList} = [\text{Ảnh từ } inputs/<slug>/images/] + [\text{Ảnh từ } runs/<slug>/media/generated_anchors/]$$
3. Chuyển giao danh sách hoàn chỉnh sang `scripts/auto_plan.ts` để lập kế hoạch khớp 3600 frames và xuất jobs worker.
