# Báo Cáo Môi Trường & Công Cụ (Environment Report)

*Thời điểm hoàn thành kiểm thử: 2026-10-16 (Phiên bản 2.5 - Design Refinement & Zero-Flaw Hardening)*

Tài liệu này ghi nhận phiên bản của tất cả các công cụ, thư viện và thành phần trong đường ống sản xuất video ("Nhà máy sản xuất video").

---

## 1. Môi trường Core Runtime

| Công cụ | Phiên bản | Trạng thái | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Hệ điều hành** | Windows 10/11 | Hoạt động | `d:\project\Create-Video` |
| **Node.js** | `v24.21.0` | Sẵn sàng | Node LTS runtime |
| **npm** | `11.19.0` | Sẵn sàng | Package manager cho Node |
| **Python** | `3.13.15` | Sẵn sàng | Python 3 runtime cho Edge-TTS & Helper scripts |
| **pip** | `26.2.1` | Sẵn sàng | Package installer cho Python |
| **tsx** | `4.23.15` | Sẵn sàng | TypeScript executor cho các script kiểm định |
| **Git** | `2.54.0.windows.1` | Sẵn sàng | Quản lý phiên bản mã nguồn & phòng ngừa mất dữ liệu |

---

## 2. Hệ sinh thái Remotion & Video Engine

| Thư viện / Package | Phiên bản | Mô tả |
| :--- | :--- | :--- |
| **remotion** | `4.0.535` | Core Video in React Framework |
| **@remotion/cli** | `4.0.535` | CLI chạy studio, still, preview, render |
| **@remotion/google-fonts** | `4.0.535` | Tải và nạp Google Fonts tiếng Việt an toàn |
| **@remotion/transitions** | `4.0.535` | Hiệu ứng chuyển cảnh giữa các Scene |
| **@remotion/media-utils** | `4.0.535` | Tiện ích phân tích độ dài audio/video |
| **@remotion/renderer** | `4.0.535` | Bộ render video Chromium & compositor |
| **@remotion/layout-utils** | `4.0.535` | Đo đạc kích thước văn bản DOM chính xác cấp subpixel |
| **zod** | `4.5.4` | Chuẩn dữ liệu được Remotion 4.0.535 hỗ trợ chính thức |
| **react** | `19.2.3` | React engine |
| **react-dom** | `19.2.3` | React DOM engine |
| **typescript** | `5.9.3` | Strict TypeScript types |

---

## 3. Công cụ Giọng đọc Voiceover (Edge-TTS & Đánh giá Dự phòng)

| Thành phần | Phiên bản / Giọng | Đánh giá |
| :--- | :--- | :--- |
| **edge-tts** | `7.3.1` | Đã cài đặt qua `pip` (Mặc định chính, 100% không trả phí) |
| **Giọng nữ chuẩn** | `vi-VN-HoaiMyNeural` | Friendly, Positive - Giọng đọc chính được hiệu chuẩn thực tế ($3.34$ từ/s) |
| **Giọng nam chuẩn** | `vi-VN-NamMinhNeural` | Friendly, Positive - Giọng đọc dự phòng |
| **Piper TTS (Dự phòng Local)** | `piper-tts` (Python/C++) | Nghiên cứu thử nghiệm chạy 100% offline (xem chi tiết tại `docs/tts-evaluation.md`) |

---

## 4. Công cụ Xử lý Đa phương tiện Hệ thống (FFmpeg / FFprobe & Python Companion)

| Công cụ | Phiên bản / Vị trí | Trạng thái |
| :--- | :--- | :--- |
| **Remotion Embedded FFmpeg** | `v7.1` (Tích hợp sẵn qua `@remotion/cli`) | ✅ **Hoạt động hoàn hảo**<br>- Biên dịch tối ưu với cờ `--disable-filters`, whitelist các bộ lọc thiết yếu: `scale`, `crop`, `loudnorm`, `colorspace`, `trim`, `concat`<br>- Đo kích thước thật bằng `ffprobe`<br>- Lưu ý: Các bộ lọc không có sẵn (`signalstats`, `unsharp`, `hue`, `colorlevels`) được ủy quyền cho module Python xử lý. |
| **Python Companion Module** | Python `3.13.15` + `PIL 12.3.0` + `NumPy` | ✅ **Hoạt động hoàn hảo**<br>- Thực hiện đo đạc Visual DNA ($Y_{\text{avg}}$, $cornerY_{\text{avg}}$, $SAT_{\text{avg}}$) siêu tốc (<40ms)<br>- Chuẩn hóa dải sáng (Colorlevel Clamping: ép xám $\ge 220$ lên `#FFFFFF`, nét mực về `#000000`, $SAT=0.00$) qua `scripts/normalize_image.py`. |
| **System FFmpeg (PATH)** | Chưa cài đặt trên hệ thống Windows | Không cần thiết vì đã có sự phối hợp giữa Remotion FFmpeg và Python. |

---

## 5. Tầng AI Đám Mây Miễn Phí (Free Hybrid Cloud Tier)

| Nhà cung cấp | Mô hình | Kích thước / Tỉ lệ | Chi phí & Hạn mức | Ứng dụng & Lưu ý |
| :--- | :--- | :--- | :--- | :--- |
| **Pollinations.ai (Image)** | `FLUX.1` / `SDXL` | `1920x1080` (16:9) | Miễn phí không cần API Key | Sinh ảnh neo thiếu tự động tại Bước 0 (`reference-expander`) và Giai đoạn 1.5. Giới hạn ẩn danh $\approx 1$ req/15s. |
| **Pollinations.ai (Video)** | 22 Video Models | 16:9 Video | **Chặn 100% (`paid_only: true`)** | Đã kích hoạt **Fast-Skip 0ms** để chuyển sang Tầng 2 (Colab Worker LTX-Video) hoặc B-Workflow (Veo). |
| **Google AI Studio** *(Tùy chọn)* | `Gemini 2.5 Flash / Pro` | Text / Multimodal | Free tier (Yêu cầu API Key cá nhân miễn phí) | Hỗ trợ phân tích kịch bản mở rộng khi người dùng cấu hình key riêng. Mặc định nhà máy không phụ thuộc key này. |

---

## 6. Danh sách Agent Skills đã tích hợp (Phiên Bản V4.1)

Cả hai nguồn thư mục kỹ năng đều được môi trường Antigravity nhận diện và kích hoạt đồng thời:
- **Kỹ năng chuẩn Remotion (`.agents/skills/`):** 12 kỹ năng chuyên sâu (`remotion-create`, `remotion-render`, `remotion-studio`, `remotion-markup`, v.v.).
- **8 Kỹ năng Pipeline cốt lõi (`.agent/skills/`):**
  1. `input-auditor` (MỚI V4.1): Thẩm định brief đầu vào, tự động nhận diện chế độ âm thanh (`audioMode: "ambient-only" | "voiceover"`), trích xuất Hợp đồng Dữ kiện (`allowedNumbers`), và mở rộng kịch bản đạt chuẩn không phát sinh số lạ.
  2. `reference-expander` (MỚI V4.1): Đánh giá số lượng và Visual DNA ảnh gốc (`HIGH_KEY_MONOCHROME_WHITE_BG` vs `COLOR_DYNAMIC`). Tự động sinh bù ảnh neo thiếu bằng Pollinations Image FLUX.1 miễn phí vào `runs/<slug>/media/generated_anchors/`.
  3. `script-to-storyboard`: Chuyển đổi brief thành kịch bản tiếng Việt và storyboard.json (Viral Hook 3s đầu, Storybeat 5 chặng, Fact-Check số liệu & nguồn bắt buộc).
  4. `shot-list`: Phân tích kịch bản tạo danh mục cảnh quay, Style Bible và prompt 5 lớp điện ảnh (lọc sạch tag rác, Contact Sheet phân trang $\le 6$ ảnh/trang và crop 1:1 góc dưới phải bắt watermark).
  5. `edge-tts-voiceover`: Tự động sinh giọng đọc Edge-TTS tiếng Việt và phụ đề .vtt với tham số điều tốc `--rate`.
  6. `scene-builder`: Áp dụng thư viện 7 mẫu cảnh chuẩn (`Title`, `Bullets`, `Stat` có nguồn đối soát, `Quote`, `Outro`, `ImageScene` contain-blur/cover, `VideoScene` kèm dynamic camera ease).
  7. `video-qa`: Quy trình 5 cổng kiểm soát chất lượng tự động: Cổng 1 Fact-Check số liệu & WPM; Cổng 2 Media Upscale tách biệt Cover/Contain-blur; Cổng 3 Timeline Auto-tune; Cổng 4 Visual QA đo DOM subpixel thật (`@remotion/layout-utils`); Cổng 5 Audio QA EBU R128 kèm kỹ thuật Post-Render Audio Mastering 2 giây.
  8. `social-publisher`: Tự động hóa xuất bản bộ tài liệu marketing và SEO `social.md` (YouTube Chapters/Timestamps, CTR titles, tags).
