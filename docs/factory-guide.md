# CẨM NANG VẬN HÀNH NHÀ MÁY SẢN XUẤT VIDEO (FACTORY GUIDE)
### *(Phiên Bản 2.4 - Enterprise Precision & Production Hardened)*

Chào mừng bạn đến với Hệ thống Nhà máy Sản xuất Video tự động hoàn toàn bằng dữ liệu. Dưới đây là hướng dẫn rút gọn giúp bạn vận hành trơn tru pipeline từ brief đến video MP4 và tài liệu xuất bản đa kênh.

---

## 1. Cách Tạo Video Mới Từ Brief
- **Lệnh tạo run mới:**
  Mở terminal hoặc yêu cầu Agent: `/new-video <slug>` (Ví dụ: `/new-video ai-trends-2026`).
- Hệ thống sẽ tự động tạo thư mục `runs/<slug>/` và sao chép mẫu `brief.template.md` vào `runs/<slug>/brief.md`.
- **Điền brief:** Mở `runs/<slug>/brief.md`, điền các thông tin: Chủ đề, đối tượng, mục tiêu, tông giọng, từ khóa bắt buộc/cấm, thời lượng mục tiêu (~120s cho video 2 phút). Lưu ý: Mọi số liệu thống kê phải cung cấp nguồn gốc rõ ràng trong brief, agent không được phép bịa số.

---

## 2. Các Lệnh Vận Hành Pipeline Chính

| Tác vụ | Lệnh thực thi | Mô tả chức năng |
| :--- | :--- | :--- |
| **Sản xuất toàn diện (Zero-Touch)** | `/produce <slug>` | Tự động chạy từ brief $\to$ kịch bản $\to$ tải ảnh AI $\to$ audio $\to$ timeline $\to$ render $\to$ xuất bản SEO. |
| **Tự động sinh/tải media AI** | `npm run fetch:media -- runs/<slug>/storyboard.json` | Gọi Pollinations FLUX.1 tải ảnh 16:9 Full HD 1080p, làm sạch prompt, buffer > 30KB. |
| **Tạo bảng tổng hợp ảnh (Contact Sheet)** | `npm run contact-sheet -- runs/<slug>/storyboard.json` | Ghép toàn bộ ảnh thành lưới `runs/<slug>/out/contact_sheet.png` để duyệt lỗi tại Chốt 1.5. |
| **Hiệu chuẩn tốc độ đọc tiếng Việt** | `npm run calibrate` | Phân tích kho audio thực tế, tính số từ/giây lưu vào `config/calibration.json`. |
| **Kiểm định âm thanh Cổng 4** | `npx tsx scripts/check_audio.ts runs/<slug>/out/<slug>.mp4` | Đo độ ồn EBU R128 (-16 đến -14 LUFS) và True Peak $\le -1.0$ dBFS. |
| **Render MP4 an toàn** | `npm run render -- <slug> --clean` | Tự động kiểm tra & re-sync media từ `runs/` sang `public/`, render MP4 và tự động dọn rác. |
| **Kiểm thử khép kín nhà máy** | `npm run test:factory` | Chạy smoke test 3 cảnh kiểm tra tính toàn vẹn hệ thống. |
| **Xuất bản SEO & Chapters** | `npm run social -- runs/<slug>/timeline.json` | Sinh `runs/<slug>/social.md` với YouTube Chapters ($\ge 10$s/chapter), tiêu đề CTR cao, tags. |
| **Chỉnh sửa nhanh một cảnh** | `/revise-scene <slug> <scene_id> "nội dung"` | Thay đổi text, template hoặc lời đọc của riêng 1 cảnh. |
| **Thay thế ảnh/clip thủ công** | `/replace-media <slug> <scene_id> <path>` | Thay thế tệp hình ảnh/video riêng lẻ của một cảnh sau khi xem contact sheet. |
| **Dọn dẹp giải phóng ổ cứng** | `/clean-run <slug>` | Xóa thư mục tạm thời trong `public/runs/<slug>/` sau khi hoàn tất. |

---

## 3. Quy Trình Kiểm Duyệt Định Hướng (3 Bước Duyệt)
1. **[DỪNG DUYỆT 1] Phê duyệt Kịch bản & Nguồn Số Liệu:**
   - Sau khi phân tích brief và vượt qua **Cổng 1**, agent dừng lại để bạn duyệt kịch bản (`script.md`) và storyboard (`storyboard.json`). Mọi số liệu và tuyên bố sự thật đều được liệt kê tại `script.md` để bạn đối soát.
   - Bạn phản hồi "Đồng ý" để tiếp tục.
2. **[DỪNG DUYỆT 1.5] Duyệt Bảng Tổng Hợp Ảnh (Contact Sheet):**
   - Sau khi hệ thống tự động tải ảnh qua Pollinations FLUX.1, script `generate_contact_sheet.ts` tạo ra file ảnh lưới `runs/<slug>/out/contact_sheet.png` có đánh số từng cảnh.
   - Bạn mở ảnh xem lướt để tìm watermark ẩn danh, dị tật ngón tay, hoặc chữ rác. Nếu cảnh nào bị lỗi, gõ `/replace-media <slug> <scene_id> <file_mới>` trước khi nhấn tiếp tục.
3. **[DỪNG DUYỆT 2] Phê duyệt Cảnh Mẫu 1:**
   - Sau khi sinh audio và vượt qua **Cổng 2**, agent chụp still frame Cảnh 1 gửi bạn đánh giá phong cách đồ họa, font chữ, bố cục.
   - Bạn phản hồi "Đồng ý" để pipeline áp dụng cho các cảnh còn lại và render hoàn thiện.

---

## 4. Năm Cổng Kiểm Soát Chất Lượng (Quality Gates)
| Cổng | Script thực thi | Tiêu chí kiểm tra nghiêm ngặt |
| :--- | :--- | :--- |
| **Cổng 1: Storyboard** | `npx tsx scripts/validate_storyboard.ts` | Đúng Zod schema, 8–15 cảnh; số từ tính động theo tốc độ thực nghiệm $3.34$ từ/giây; bắt buộc có trường `source` cho cảnh `stat`. |
| **Cổng Media** | `npx tsx scripts/check_media.ts` | Đọc phân giải thật qua `ffprobe`, khống chế upscale tối đa $\le 1.5\times$ (ghi cảnh báo vào `status.md`); nhãn bản quyền `"ai-generated, unverified"`. |
| **Cổng 2: Timeline** | `npx tsx scripts/build_timeline.ts` | Đo audio thực tế @ 30fps, đệm nhịp thở Pre-roll 0.2s / Post-roll 0.4s, Auto-Tune `--rate` trong dải 100s–145s đưa thời lượng về 110s–130s. |
| **Cổng 3: Visual QA** | `npx tsx scripts/check_video.ts` | Adaptive 85% Sampling; safe margin 96px (vùng an toàn 1728px), tính toán tràn chữ theo kích thước pixel thực tế (Outfit 72px / Inter 40px). |
| **Cổng 4: Audio QA** | `npx tsx scripts/check_audio.ts` | Đo độ ồn chuẩn EBU R128 (-16 đến -14 LUFS), True Peak $\le -1.0$ dBFS, cảnh báo khoảng im lặng $> 2.5$s. |

*Mỗi cổng nếu thất bại sẽ tự động kích hoạt cơ chế tự sửa tối đa 2 lần. Nếu vẫn không đạt, hệ thống sẽ dừng và thông báo rõ nguyên nhân.*

---

## 5. Khắc Phục Sự Cố Thường Gặp (Troubleshooting)
- **Lỗi timeout / buffer < 30KB khi tải ảnh AI Pollinations:** Máy chủ FLUX.1 quá tải tạm thời. Chạy lại `npm run fetch:media -- runs/<slug>/storyboard.json --force` (tự động đổi seed mới và thử lại).
- **Lỗi mạng Edge-TTS:** Kiểm tra kết nối internet. Chạy lại lệnh sinh audio riêng cho cảnh đó.
- **Lỗi tràn RAM trên Laptop 16GB:** Hệ thống đã mặc định cấu hình `Config.setConcurrency(2)` và cache video `512MB` trong `remotion.config.ts`. Đảm bảo luôn render qua wrapper an toàn `npm run render -- <slug> --clean`.
- **Xem trước trực tiếp (Interactive Preview):**
  Chạy `npm run dev` để mở Remotion Studio trực quan trên trình duyệt tại `http://localhost:3000`.
