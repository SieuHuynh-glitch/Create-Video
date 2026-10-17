# NHẬT KÝ THAY ĐỔI HỆ THỐNG (CHANGELOG)
Tài liệu này lưu trữ toàn bộ lịch sử các phiên bản của Nhà máy Sản xuất Video Remotion (Create-Video).

---

## [v4.2-Lite] - 2026-10-17 (Empirical Audit & Hardening)
- **Kiểm toán thực nghiệm (Phần A):** Đo lường trực tiếp bộ lọc FFmpeg, bóc tách lỗi ngầm `freezedetect` và `minterpolate` trong Remotion.
- **Xác nhận Tầng 2:** Ghi rõ trạng thái clip Tầng 2 hiện tại (`shot_01.mp4` 11.4 KB) là mock, hạ trạng thái về "Chưa kiểm chứng thực nghiệm".
- **Minh bạch hóa tài liệu (Phần B):** Tạo `docs/STATUS.md` đối soát bằng chứng thực nghiệm, chuyển lịch sử phiên bản sang `docs/CHANGELOG.md`, đánh dấu `docs/full-scale-report.md` là SUPERSEDED.
- **Cập nhật kỹ thuật (Phần C):**
  - Chuyển đổi chuẩn hóa ảnh sang Soft-Knee / S-Curve và Luma Key Alpha `smoothstep`.
  - Bổ sung cơ chế Checksum Guard và hàm cấm ghi đè thư mục `inputs/`.
  - Khóa luồng upload mạng bằng cờ `ALLOW_UPLOAD=1`.
  - Tinh chỉnh trích xuất `allowedNumbers` cho Fact-Check Contract.
  - Phân loại Watermark 3 trạng thái (`not_detected | suspected | unknown`).
  - Tích hợp `@remotion/eslint-plugin`, kiểm soát seed ngẫu nhiên tất định.

---

## [v4.1] - 2026-10-16 (Input Auditor & Granular Fallback)
- **Cổng 0.1 Input Auditor:** Tự động nhận diện `audioMode` (`voiceover` vs `ambient-only`), tự động mở rộng brief sơ sài.
- **Cổng 0.2 Reference Expander:** Đo Visual DNA (`HIGH_KEY_MONOCHROME_WHITE_BG` vs `COLOR_DYNAMIC`) qua Python PIL/NumPy. Sinh bù ảnh neo thiếu bằng Pollinations FLUX.1 vào `runs/<slug>/media/generated_anchors/`.
- **One-Pass Visual Normalization:** Chuẩn hóa ảnh/video về 1080p Lanczos và xử lý màu nền.
- **Per-Shot Granular Fallback:** Cơ chế tự sửa 2 lần cho clip lỗi trước khi hạ riêng shot đó về Tầng 0 (`LumaParallaxScene`), bảo toàn các shot AI khác.
- **Zero Unpaid API Leakage:** Fast-Skip 0ms cho Tầng 1 Direct Video API khi không có balance trả phí.

---

## [v3.0 - v3.5] - 2026-10-16 (Hybrid Cloud & Colab Worker)
- **Tách pha Text Encoder:** Đưa mã hóa prompt T5 sang luồng CPU độc lập để giảm tải RAM trên Colab GPU T4.
- **Colab GPU Guard:** Cơ chế giải phóng VRAM PyTorch, garbage collection và fail-safe chống tràn bộ nhớ T4 15GB VRAM.
- **Hàng đợi công việc (Job Queue):** Cấu trúc `jobs/pending/`, `jobs/done/`, `jobs/failed/` cho pipeline không đồng bộ.

---

## [v2.0 - v2.5] - 2026-10-16 (Design Refinement & Zero-Flaw Hardening)
- **Thư viện 5 Cảnh Mẫu:** Chuẩn hóa `TitleScene`, `BulletsScene`, `StatScene`, `QuoteScene`, `OutroScene` sử dụng Vanilla CSS Tokens và typography Outfit / Inter.
- **Tích hợp Edge-TTS:** Sinh giọng đọc tiếng Việt tự nhiên `vi-VN-HoaiMyNeural` chất lượng cao, tính toán WPM và đệm nhịp thở.
- **Kiểm định âm thanh Cổng 4:** Đo LUFS qua bộ lọc `loudnorm`, khống chế True Peak $\le -1.0$ dBFS, tự động mastering 2s bằng FFmpeg.
- **Tự động hóa xuất bản SEO:** Sinh file `social.md` với YouTube Chapters, tiêu đề CTR cao và thẻ hashtag.

---

## [v1.0] - 2026-10-15 (Initial Remotion Factory)
- Khởi tạo kiến trúc Remotion core, kết nối TypeScript và Zod schema.
