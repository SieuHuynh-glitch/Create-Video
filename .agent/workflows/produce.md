# Workflow: /produce <slug> (Phiên Bản 2.3 - Hybrid Zero-Touch)

Quy trình sản xuất video hoàn chỉnh tự động hóa từ brief đến file MP4 xuất xưởng và bộ tài liệu xuất bản đa kênh, tích hợp cơ chế nạp media tự động (Zero-Touch) và 4 cổng chất lượng nghiêm ngặt.

---

## GIAI ĐOẠN 1: Brief → Script & Storyboard Điện Ảnh
1. Đọc nội dung file `runs/<slug>/brief.md`.
2. Kích hoạt kỹ năng `script-to-storyboard`:
   - Ứng dụng công thức **Viral Hook 3 giây đầu** và phân bổ nhịp điệu **Storybeat 5 chặng**.
   - Soạn kịch bản `runs/<slug>/script.md`.
   - Sinh file `runs/<slug>/storyboard.json` tuân thủ Zod schema (tích hợp sẵn prompt 5 lớp cho các cảnh visual).
3. Thực thi **CỔNG 1 (validate_storyboard)**:
   ```bash
   npx tsx scripts/validate_storyboard.ts runs/<slug>/storyboard.json
   ```
   *(Nếu không đạt: tự động sửa tối đa 2 lần. Nếu vẫn fail thì dừng báo lỗi).*
4. Cập nhật `runs/<slug>/status.md`.
5. ⛔ **[ĐIỂM DỪNG DUYỆT 1 - Phê duyệt Kịch bản]**:
   - Trình bày tóm tắt kịch bản, số cảnh, tổng số từ và thời lượng dự kiến.
   - Chờ người dùng phản hồi duyệt trước khi tiếp tục.

---

## GIAI ĐOẠN 1.5: Shot List & Tự Động Hóa Nạp Media (Zero-Touch)
1. Sau khi người dùng duyệt Giai đoạn 1 (Kịch bản):
2. Kích hoạt kỹ năng `shot-list`:
   - Xây dựng Style Bible đồng nhất (Documentary, Anime Shinkai, Cyberpunk, hoặc Glassmorphism).
   - Sinh file `runs/<slug>/shot-list.md` chi tiết với công thức Prompt 5 lớp điện ảnh chuẩn `--ar 16:9`.
3. ⚡ **Tự động sinh và tải media miễn phí (Pollinations FLUX.1 16:9 1080p):**
   ```bash
   npx tsx scripts/fetch_ai_media.ts runs/<slug>/storyboard.json
   ```
   - Tự động tải toàn bộ ảnh minh họa về `runs/<slug>/media/`.
   - Tự động cập nhật metadata bản quyền vào `storyboard.json`.
4. Thực thi kiểm định chất lượng và bản quyền media (**CỔNG MEDIA**):
   ```bash
   npx tsx scripts/check_media.ts runs/<slug>/storyboard.json
   ```
   - Xác thực kích thước $\ge 1920\times 1080$, tỉ lệ 16:9 và lập hồ sơ bản quyền `runs/<slug>/manifest.json`.
5. ℹ️ **[ĐIỂM XÁC NHẬN NHANH 1.5 - Xem Trước Media]**:
   - Trình bày danh sách ảnh đã tự động tải xong.
   - Người dùng có thể nhấn xác nhận ngay (Zero-Touch) hoặc thay thế file tùy thích qua `/replace-media`.
6. Cập nhật `runs/<slug>/status.md`.

---

## GIAI ĐOẠN 2: Sinh Audio & Xây dựng Timeline
1. Sau khi Cổng Media đã PASSED:
2. Kích hoạt kỹ năng `edge-tts-voiceover`:
   - Sinh file âm thanh `.mp3` và phụ đề `.vtt` tự động cho từng cảnh:
     ```bash
     npx tsx scripts/generate_voiceover.ts runs/<slug>/storyboard.json
     ```
3. Đo thời lượng thực tế và thực thi **CỔNG 2 (build_timeline)**:
   ```bash
   npx tsx scripts/build_timeline.ts runs/<slug>/storyboard.json runs/<slug>/audio/ runs/<slug>/timeline.json
   ```
   *(Cổng 2 tự động bù trừ Pre-roll 0.2s / Post-roll 0.4s và kích hoạt Auto-Tune `--rate` nếu lệch nhẹ để tự chữa lành thời lượng về 110s – 130s).*
4. Cập nhật `runs/<slug>/status.md`.

---

## GIAI ĐOẠN 3: Dựng & Kiểm duyệt Cảnh Mẫu 1
1. Kích hoạt kỹ năng `scene-builder` để dựng cảnh đầu tiên (`scene_01`).
2. Render frame still của Cảnh 1 để xem trước phong cách thị giác:
   ```bash
   npx tsx scripts/check_video.ts runs/<slug>/timeline.json --single-scene=scene_01
   ```
3. ⛔ **[ĐIỂM DỪNG DUYỆT 2 - Phê duyệt Phong cách Cảnh 1]**:
   - Gửi ảnh still frame của Cảnh 1 cho người dùng đánh giá màu sắc, font chữ, bố cục.
   - Chờ người dùng phản hồi duyệt trước khi tiếp tục dựng các cảnh còn lại.

---

## GIAI ĐOẠN 4: Dựng Toàn bộ Cảnh & Cổng QA Visual
1. Sau khi người dùng duyệt Giai đoạn 3:
2. Áp dụng template cho toàn bộ các cảnh còn lại trong `timeline.json`.
3. Thực thi **CỔNG 3 (check_video QA với Adaptive 85% Sampling)**:
   ```bash
   npx tsx scripts/check_video.ts runs/<slug>/timeline.json
   ```
   - Chụp still tại 85% cho các cảnh animation (bullets, stat, quote, outro) và 50% cho cảnh tĩnh.
   - Kiểm tra an toàn viền chữ, phụ đề đồng bộ, cảnh rỗng.
   - Xuất bảng kết quả chi tiết vào `runs/<slug>/status.md`.

---

## GIAI ĐOẠN 5: Render Video An Toàn
1. Kích hoạt Render An Toàn (Tự động Re-sync Media, Concurrency 2, và Chống Bẫy Xóa Nhầm):
   ```bash
   npx tsx scripts/render_video.ts <slug> --clean
   ```
2. Kiểm tra file MP4 xuất xưởng tại `runs/<slug>/out/<slug>.mp4`.
3. Cập nhật trạng thái vào `runs/<slug>/status.md`.

---

## GIAI ĐOẠN 6: Xuất Bản Marketing Hậu Kỳ & SEO Social
1. Kích hoạt kỹ năng `social-publisher`:
   ```bash
   npx tsx scripts/generate_social.ts runs/<slug>/timeline.json
   ```
2. Tự động sinh file `runs/<slug>/social.md` với:
   - 3 phong cách tiêu đề giật tít CTR cao (Tò mò, Lợi ích, Cảnh báo).
   - Đoạn mô tả chuẩn SEO có nhúng YouTube Chapters / Timestamps tự động.
   - Bộ 15–20 hashtags thịnh hành phân tầng.
   - Bản đăng micro-post cho Facebook Fanpage và LinkedIn.
3. Báo cáo hoàn tất toàn bộ quy trình và bàn giao video MP4 + file tài liệu marketing cho người dùng.
