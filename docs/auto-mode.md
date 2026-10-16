# HƯỚNG DẪN VẬN HÀNH AUTO MODE (NHÀ MÁY SẢN XUẤT VIDEO TỰ ĐỘNG)

## 1. Giới thiệu tổng quan
**AUTO MODE** là kiến trúc vận hành tự động toàn diện của nhà máy sản xuất video Remotion. Chỉ với **MỘT lệnh duy nhất**, hệ thống sẽ xử lý từ tài liệu brief và tập ảnh đầu vào đến file MP4 hoàn chỉnh 1080p xuất xưởng, **hoàn toàn không có điểm dừng chờ duyệt thủ công**.

---

## 2. Hợp đồng dữ liệu đầu vào (Input Spec)
Mọi dự án AUTO MODE được đặt trong thư mục `inputs/<slug>/`:
```text
inputs/<slug>/
├── brief.md              # Bản mô tả yêu cầu, tiêu đề, phong cách nghệ thuật, nhịp điệu
└── images/               # Thư mục chứa ≥ 1 ảnh nguồn (được sắp xếp theo tên file A-Z)
    ├── scene_02_skull.jpg
    ├── scene_03_cracking.jpg
    └── ...
```

---

## 3. Kiến trúc Đa tầng Kỹ thuật (Tier Architecture)

| Tầng | Định danh | Môi trường | Mô tả kỹ thuật | Chi phí |
| :--- | :--- | :--- | :--- | :--- |
| **Tầng 0** | **Local CPU Motion** | Máy trạm nội bộ (Laptop/PC) | **Luminance Alpha Matting (Luma Key):** Tách lớp chủ thể mực đen trên nền trắng `#FFFFFF` thành 3 lớp 2.5D độc lập: bóng mờ (shadow aura), chủ thể mực đen có micro-breathing wobble, và lớp hạt bụi than bay lơ lửng. Kết hợp camera easing và dải âm thanh Drone Ambient 432Hz liên tục. | **0đ** (Không mạng, không GPU) |
| **Tầng 1** | **Direct API** | API Server | Tự động gọi API video (Pollinations/Runway) nếu có API key trong `.env` và nằm trong hạn mức. Nếu thiếu URL ảnh công khai, tự động bỏ qua và giữ ở Tầng 0. | **0đ** (hoặc hạn mức free) |
| **Tầng 2** | **Asynchronous Colab Worker** | Google Colab GPU (Tesla T4) | **Two-Phase Pre-Encoding:** <br>• **Pha 1:** Nạp T5-XXL 8-bit mã hóa prompt thành `prompt_embeds.pt` rồi giải phóng RAM (~5.2GB/12.7GB).<br>• **Pha 2:** LTX-Video (`text_encoder=None`) sinh video 704x384 @ 24fps chuẩn float16, lưu ra Google Drive.<br>• Khi hoàn tất, lệnh `npm run upgrade:video` tự động upscale Lanczos 1080p @ 30fps. | **0đ** (Colab T4 Free) |

---

## 4. Danh mục Lệnh Vận Hành

### 4.1. Lệnh Sản Xuất Tự Động (Make)
Chạy toàn bộ pipeline từ đầu vào đến MP4 xuất xưởng:
```bash
npm run make -- <slug> [--duration 120]
```
*Ví dụ:*
```bash
npm run make -- natural-cycle-v2 --duration 120
```
**Quy trình thực thi:**
1. **Auto Planner (`scripts/auto_plan.ts`):** Quét ảnh, tính toán phân bổ khung hình (khớp chuẩn 3600 frames @ 30fps với overlap 1.0s), sinh `inputs/<slug>/plan.json`, `runs/<slug>/timeline.json`, và xuất hàng đợi `jobs/pending/<slug>/*.json`.
2. **Remotion Render (`scripts/render_video.ts`):** Render video Tầng 0 chất lượng cao với component `LumaParallaxScene`.
3. **QA Gates:** Tự động kiểm định qua 3 cổng: Media Check, Motion QA (Safe margin 96px), Audio QA (EBU R128 Loudnorm -15 LUFS, True Peak <= -1.0 dBFS).
4. **Báo cáo & Xuất xưởng:** Xuất tệp `out/<slug>.mp4`, `out/report.md`, và `status.json`.

---

### 4.2. Lệnh Nâng Cấp Video AI (Upgrade)
Sau khi Colab Worker hoàn thành sinh các clip video AI và đồng bộ về `jobs/done/<slug>/`:
```bash
npm run upgrade:video -- <slug>
```
*Ví dụ:*
```bash
npm run upgrade:video -- natural-cycle-v2
```
**Quy trình thực thi:**
1. Nhặt toàn bộ clip AI từ `jobs/done/<slug>/`.
2. Chạy FFmpeg Lanczos Upscale + Unsharp Mask để nâng độ phân giải từ 704x384 @ 24fps lên **1920x1080 @ 30fps sắc nét**.
3. Cập nhật `runs/<slug>/timeline.json` chuyển các shot tương ứng sang `VideoScene`.
4. Render lại video xuất xưởng và cập nhật `out/report.md`.

---

## 5. Quy trình Colab Headless Worker (Tầng 2)
1. Mở notebook [notebooks/colab_worker.ipynb](file:///d:/project/Create-Video/notebooks/colab_worker.ipynb) trên Google Colab với GPU T4 miễn phí.
2. Gắn kết Google Drive (`drive.mount('/content/drive')`).
3. Chạy lệnh:
   ```bash
   python scripts/colab_worker.py --slug natural-cycle-v2
   ```
4. Worker sẽ:
   - Đọc các job trong `jobs/pending/natural-cycle-v2/`.
   - Chạy **Pha 1**: Mã hóa toàn bộ prompt với T5 8-bit và lưu `prompt_embeds.pt`, sau đó xóa text encoder khỏi RAM.
   - Chạy **Pha 2**: Sinh clip video với mô hình `Lightricks/LTX-Video` trên Tesla T4.
   - Ghi clip hoàn thành vào `jobs/done/natural-cycle-v2/`.
