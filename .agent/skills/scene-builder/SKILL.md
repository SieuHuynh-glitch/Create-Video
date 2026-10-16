---
name: scene-builder
description: Lựa chọn template cảnh tái sử dụng từ thư viện 5 cảnh có sẵn và map dữ liệu props từ storyboard/timeline. Chỉ tạo component cảnh mới khi thư viện 5 template hiện tại không đáp ứng được yêu cầu thị giác đặc thù của kịch bản. Sử dụng trong quá trình dựng cảnh Remotion hoặc sửa đổi phân cảnh.
---

# Kỹ Năng: Scene Builder & Composition Mapping

Kỹ năng này chịu trách nhiệm ghép nối dữ liệu từ `timeline.json` với thư viện component cảnh tái sử dụng trong `src/scenes/`.

## 1. Thư viện 5 Cảnh mẫu tham số hóa

| Cảnh | File component | Khi nào nên dùng | Các props chính trong `onScreenText` |
| :--- | :--- | :--- | :--- |
| **TitleScene** | `src/scenes/TitleScene.tsx` | Mở đầu video (Hook), chuyển phần, chương mới | `title`, `subtitle` |
| **BulletsScene** | `src/scenes/BulletsScene.tsx` | Liệt kê 3-4 ý chính, tính năng, giải pháp | `title`, `subtitle`, `bulletPoints` (mảng string) |
| **StatScene** | `src/scenes/StatScene.tsx` | Làm nổi bật số liệu, % tăng trưởng, thời gian | `title`, `statNumber` (ví dụ: `85%`, `2X`), `statLabel` |
| **QuoteScene** | `src/scenes/QuoteScene.tsx` | Câu trích dẫn, lời khuyên, insight đắt giá | `quoteText`, `author` |
| **OutroScene** | `src/scenes/OutroScene.tsx` | Cảnh kết video, kêu gọi hành động (CTA) | `title`, `subtitle`, `callToAction` |

## 2. Nguyên tắc sử dụng Template
- **Ưu tiên tái sử dụng 100%:** Luôn tận dụng 5 template trên bằng cách định hình dữ liệu trong `onScreenText` khớp với template.
- **Chỉ viết cảnh mới khi:** Kịch bản yêu cầu một cấu trúc thị giác hoàn toàn khác biệt (ví dụ: bảng so sánh đa cột, sơ đồ luồng dữ liệu) mà 5 template trên không thể biểu diễn được.
- **Mọi cảnh mới tạo ra:** Phải đặt trong `src/scenes/`, sử dụng bảng màu và font chữ từ `src/theme.ts`, có component `Subtitles` đi kèm, và xuất qua `src/scenes/index.ts`.

## 3. Quy tắc Props & Animation
- Toàn bộ chuyển động trong cảnh sử dụng `spring` hoặc `interpolate` của Remotion.
- Không dùng animation CSS tĩnh (như `@keyframes` không đồng bộ với frame Remotion).
- Đảm bảo phụ đề tự động `Subtitles` luôn nhận đúng `voiceoverText` của cảnh hiện tại.
