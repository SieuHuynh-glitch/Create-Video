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

Bạn có thể chạy tự động sinh toàn bộ 12 clip 8 giây bằng GPU Tesla T4 (15GB VRAM) hoàn toàn miễn phí của Google mà không cần cài đặt gì trên máy:

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/SieuHuynh-glitch/Create-Video/blob/master/notebooks/free_ai_video_colab.ipynb)

1. Bấm vào nút **Open in Colab** ở trên.
2. Trên thanh menu Colab, chọn **Runtime** -> **Run all** (hoặc bấm `Ctrl + F9`).
3. Google Colab sẽ tự động chạy mô hình **Lightricks LTX-Video**, sinh tuần tự đủ 12 shot và nén file `natural-cycle-v2-clips.zip` tải thẳng về máy tính của bạn!
4. Bạn giải nén và thả 12 file vào `runs/natural-cycle-v2/media/` là xong!

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
