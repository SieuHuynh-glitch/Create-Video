# CREATE-VIDEO: AUTOMATED VIDEO PRODUCTION FACTORY (V3.0)
> **Nhà máy sản xuất video tự động hóa bằng Remotion, Microsoft Edge-TTS và Continuous Motion Pipeline.**

Hệ thống cho phép tạo video Full HD 1080p @ 30fps chuyển động liên tục, kết hợp giọng đọc tiếng Việt mượt mà, chuyển cảnh tan chảy hữu cơ (Melting Dissolve), lớp hạt bụi khí quyển `<ParticleField />` và âm thanh môi trường Master Drone 120s.

---

## 💻 YÊU CẦU TIÊN QUYẾT (PREREQUISITES)

Trước khi bắt đầu, máy tính của bạn cần cài đặt sẵn:

1. **Node.js:** Phiên bản **v18+** hoặc **v20+ LTS** (Khuyến nghị Node.js 20 hoặc 22). Kiểm tra bằng: `node -v`.
2. **Git:** Để tải và cập nhật mã nguồn.
3. **Python 3.8+:** Cần thiết nếu bạn muốn chạy tính năng sinh giọng đọc thuyết minh tự động bằng Microsoft Edge-TTS.

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT & SỬ DỤNG (QUICK START)

### Bước 1: Clone kho mã nguồn về máy
```bash
git clone <URL_REPO_CUA_BAN>
cd Create-Video
```

### Bước 2: Cài đặt các thư viện Node.js
```bash
npm install
```

### Bước 3: Cài đặt công cụ tạo giọng đọc Edge-TTS (Python)
```bash
pip install edge-tts
```

### Bước 4 (Tùy chọn): Cấu hình API sinh Clip tự động
Nếu bạn muốn sử dụng tính năng tự động sinh video clip bằng Pollinations AI:
1. Sao chép file cấu hình mẫu:
   ```bash
   cp .env.example .env
   # Hoặc trên Windows PowerShell:
   copy .env.example .env
   ```
2. Mở file `.env` và điền khóa API của bạn:
   ```env
   POLLINATIONS_API_KEY=sk_...
   ```
*(Lưu ý: Nếu bạn chỉ xem trước trên trình duyệt hoặc tự ghép video bằng tay qua Google Veo thì KHÔNG cần bước này).*

---

## ☁️ TỰ ĐỘNG SINH 12 CLIP AI MIỄN PHÍ BẰNG GOOGLE COLAB (0đ)

Dùng GPU Tesla T4 (15GB VRAM) miễn phí của Google, không cần cài gì trên máy:

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/SieuHuynh-glitch/Create-Video/blob/master/notebooks/colab_worker.ipynb)

1. Bấm **Open in Colab**, chọn **Runtime → Change runtime type → T4 GPU**.
2. Chạy lần lượt các ô **1 → 6** (không dùng "Run all" ở lần đầu).
3. **Lần đầu nên chạy thử 1 shot:** ở ô 5 điền `ONLY = "shot_01"`. Thấy OK thì để trống để chạy cả hàng đợi.
4. Ô 6 tự kiểm tra từng clip, nén `<slug>-clips.zip` và tải về máy. Giải nén rồi thả file vào `runs/<slug>/media/`.

Worker (`scripts/colab_worker.py`, mô hình **LTX-Video**) được thiết kế để tự phục hồi:

- Ghi MP4 bằng imageio-ffmpeg (có dự phòng OpenCV), **đọc lại để kiểm tra** và phát hiện video đen/hỏng.
- Gặp lỗi thì thử lại với seed khác; hết bộ nhớ (OOM) thì tự hạ số khung hình 49 → 33 → 25 và ghi rõ trong báo cáo.
- Một shot lỗi không làm dừng cả hàng đợi. Lý do lỗi nằm trong `jobs/failed/<slug>/shot_xx.json`; báo cáo tổng hợp ở `jobs/report-<slug>.json`.
- Shot đã xong được bỏ qua khi chạy lại; nếu gắn Google Drive (ô 3), mỗi clip xong được chép sang Drive ngay.
- Cache prompt embeddings có hash: sửa prompt thì tự mã hóa lại.

Chạy trực tiếp từ dòng lệnh trên Colab:
```bash
python scripts/colab_worker.py --slug natural-cycle --only shot_01      # chạy thử 1 shot
python scripts/colab_worker.py --slug natural-cycle                      # chạy cả hàng đợi
python scripts/colab_worker.py --slug natural-cycle --only shot_03 --force   # sinh lại 1 shot
```

---

## 🎬 CÁC LỆNH VẬN HÀNH CHÍNH

### 1. Mở giao diện tương tác Remotion Studio (Xem trước trên Web)
```bash
npm run dev
```
Trình duyệt sẽ tự động mở `http://localhost:3000`. Bạn có thể kéo thanh timeline, xem trước chuyển động, âm thanh và hiệu ứng tan chảy trực tiếp.

### 2. Sinh giọng đọc thuyết minh tiếng Việt
```bash
npm run voiceover -- runs/natural-cycle-v2/storyboard.json
```

### 3. Tự động sinh video clip bằng AI
```bash
# Chạy thử nghiệm Pilot 1 shot:
npm run generate:clip -- --run natural-cycle-v2 --pilot

# Sinh toàn bộ 12 shot:
npm run generate:clip -- --run natural-cycle-v2
```

### 4. Xuất file video MP4 hoàn chỉnh (Render)
```bash
npm run render -- natural-cycle-v2
```
File video hoàn chỉnh sẽ được lưu tại: `runs/natural-cycle-v2/out/natural-cycle-v2.mp4`.

---

## 📁 CẤU TRÚC THƯ MỤC DỰ ÁN

- **`src/`:** Mã nguồn React/Remotion (Scenes, Audio, Transitions, ParticleField).
- **`scripts/`:** Bộ công cụ kỹ thuật tự động hóa:
  - `generate_clip.ts`: Resolver nguồn clip (Veo cục bộ $\rightarrow$ Pollinations API $\rightarrow$ Pending).
  - `check_clip.ts` & `check_motion.ts`: Kiểm định kỹ thuật, đo độ phân giải, quét đơ tĩnh và crop 4 góc soi watermark.
  - `extract_last_frame.ts`: Trích xuất khung hình cuối làm bàn đạp cho cảnh tiếp theo.
  - `generate_voiceover.ts`: Sinh audio & subtitle tiếng Việt qua Edge-TTS.
- **`runs/natural-cycle-v2/`:** Thư mục dữ liệu sản xuất dự án:
  - `shot-list.md`: Danh mục 12 shot kèm Prompt chuẩn Google Veo / AI Video.
  - `timeline.json`: Nguồn chân lý điều khiển toàn bộ timeline video.
  - `media/anchors/`: Bộ ảnh gốc chất lượng cao chống trôi phong cách.
- **`docs/`:** Tài liệu kỹ thuật:
  - [docs/b-workflow.md](docs/b-workflow.md): Sổ tay hướng dẫn người điều hành tự sinh clip bằng Google Veo.
  - [docs/system-report.md](docs/system-report.md): Báo cáo kiến trúc hệ thống toàn diện.
  - [docs/video-api-benchmark.md](docs/video-api-benchmark.md): Báo cáo đo lường chất lượng và quota API.

---

## 🔒 LƯU Ý BẢO MẬT KHI ĐẨY LÊN GITHUB
- File `.env` chứa secret key đã được cấu hình trong `.gitignore` để không bao giờ bị đẩy lên GitHub.
- Thư mục bộ nhớ cache tạm thời và media xuất ra ngoài cũng được bảo vệ tự động.
