---
name: script-to-storyboard
description: Chuyển đổi yêu cầu từ brief.md thành kịch bản phân cảnh script.md và storyboard.json chuẩn Zod schema. Ứng dụng cấu trúc Storybeat 5 chặng và công thức Viral Hook 3 giây đầu, tối ưu hóa nhịp điệu cho video ~2 phút (260–320 từ tiếng Việt).
---

# Kỹ Năng: Script to Storyboard (Phiên Bản 2.3)

Kỹ năng này chịu trách nhiệm phân tích yêu cầu sáng tạo từ file brief (`brief.md`) và biến thành kịch bản phân cảnh có cấu trúc máy đọc được (`storyboard.json`) và người đọc được (`script.md`), ứng dụng kỹ thuật nhịp điệu Storybeat điện ảnh và công thức Hook giữ chân người xem.

---

## 1. Công Thức Viral Hook 3 Giây Đầu

Khán giả quyết định ở lại hay lướt qua video trong 3 đến 5 giây đầu tiên. Cảnh mở đầu (`scene_01`) bắt buộc phải áp dụng một trong ba mô thức Hook sau:

1. **Nghịch lý thách thức (The Paradox):** Nêu bật một sự thật trái ngược với số đông.
   - *Ví dụ:* "Càng cố gắng làm việc chăm chỉ, bạn càng kiếm được ít tiền hơn nếu không biết điều này."
2. **Con số gây sốc (The Shocking Stat):** Dùng dữ liệu áp đảo kích thích sự tò mò.
   - *Ví dụ:* "Chín mươi hai phần trăm những người khởi nghiệp thất bại ngay trong năm đầu vì đúng một sai lầm."
3. **Cảnh báo nguy cơ tức thì (The Urgency Warning):** Đặt người xem vào tình thế phải hành động.
   - *Ví dụ:* "Dừng ngay việc tự làm video thủ công nếu bạn không muốn tụt hậu sau đối thủ ngay hôm nay."

---

## 2. Cấu Trúc Nhịp Điệu Storybeat 5 Chặng (Video Chuẩn 2 Phút)

Một kịch bản 2 phút (từ 110s đến 130s, dung lượng từ 260 đến 320 từ tiếng Việt) cần phân bổ nhịp điệu qua 5 chặng liên hoàn:

```text
[Chặng 1: Hook 0-5s] ──> [Chặng 2: Vấn đề 5-25s] ──> [Chặng 3: Giải pháp 25-75s] ──> [Chặng 4: Số liệu 75-100s] ──> [Chặng 5: CTA 100-120s]
```

1. **Chặng 1: Hook Bắt Mắt (0 – 5s) | Cảnh `title`**
   - Lời đọc: 12 – 18 từ giật tít, khơi gợi tò mò.
   - Hình ảnh: Tiêu đề lớn phát sáng, nhịp điệu dứt khoát.
2. **Chặng 2: Nêu Bật Nỗi Đau & Vấn Đề (5 – 25s) | Cảnh `bullets`**
   - Lời đọc: 40 – 60 từ phơi bày thực trạng khó khăn, các sai lầm thường gặp.
   - Hình ảnh: 3 luận điểm tuần tự với hiệu ứng spring stagger.
3. **Chặng 3: Mở Rộng Giải Pháp & Khám Phá (25 – 75s) | Cảnh `image` / `video`**
   - Lời đọc: 100 – 140 từ chia làm 3–4 cảnh trực quan.
   - Hình ảnh: Cảnh quay thực tế Ken Burns pan/zoom hoặc clip video sinh động minh họa cách thức giải quyết vấn đề.
4. **Chặng 4: Đỉnh Cao Bằng Chứng & Số Liệu (75 – 100s) | Cảnh `stat` / `quote`**
   - **Quy tắc Kiểm Soát Dữ Liệu Sự Thật (Data Truthfulness):** 
     - Chỉ sử dụng template `stat` khi trong `brief.md` người dùng có cung cấp số liệu thực tế kèm nguồn trích dẫn rõ ràng. Bắt buộc điền trường `onScreenText.source`.
     - Nếu `brief.md` không cung cấp số liệu, **TUYỆT ĐỐI NGHIÊM CẤM TỰ BỊA SỐ LIỆU**. Thay thế chặng này bằng chặng "Thông Điệp Then Chốt" (`quote`) hoặc "Luận Điểm Chuyên Sâu" (`bullets`).
   - Lời đọc: 50 – 70 từ chứng thực kết quả hoặc câu nói của chuyên gia uy tín.
   - Hình ảnh: Số liệu phóng to 128px kèm dòng trích dẫn nguồn ở dưới, hoặc thẻ trích dẫn nổi bật.
5. **Chặng 5: Đúc Kết & Kêu Gọi Hành Động (100 – 120s) | Cảnh `outro`**
   - Lời đọc: 25 – 35 từ tổng kết giá trị cốt lõi và hướng dẫn bước tiếp theo rõ ràng.
   - Hình ảnh: Nút Call To Action nổi bật, thông tin liên hệ.

---

## 3. Quy Trình Sản Xuất Kịch Bản

1. **Đọc và phân tích `brief.md`:**
   - Xác định mục tiêu, đối tượng người xem, tông giọng, các từ khóa bắt buộc và từ cấm.
2. **Soạn thảo kịch bản đối thoại (`script.md`):**
   - Bắt buộc tạo mục `## DANH MỤC SỐ LIỆU & TUYÊN BỐ SỰ THẬT` ở đầu file `script.md` liệt kê mọi con số và nguồn kiểm chứng để người dùng thẩm định ở Chốt 1.
   - Bố cục bảng 2 cột: Cột 1 (Số thứ tự cảnh, loại cảnh, thời lượng ước tính) và Cột 2 (Lời đọc thuyết minh tiếng Việt kèm mô tả hình ảnh).
3. **Sinh cấu trúc JSON chuẩn máy đọc (`storyboard.json`):**
   - Tuân thủ 100% Zod Schema tại `src/schema.ts`.
   - **Quy tắc Chế độ Mặc định Zero-Touch 100%:** Chỉ sử dụng 6 templates chuẩn (`title`, `bullets`, `stat`, `quote`, `outro`, `image` với hiệu ứng Ken Burns Pan/Zoom). Chỉ sinh template `video` khi người dùng yêu cầu rõ trong `brief.md` hoặc đã bỏ sẵn clip MP4 vào `runs/<slug>/media/`.
   - Với cảnh `stat`: Bắt buộc có trường `onScreenText.source`.
   - Với các cảnh `image`, chủ động nhúng trường `visual.prompt` tuân thủ công thức 5 lớp điện ảnh để hệ thống tự động tải ảnh qua Pollinations.ai FLUX.1.

---

## 4. Cấu Trúc Đầu Ra Mẫu (`storyboard.json`)

```json
{
  "slug": "ai-video-revolution",
  "title": "Cuộc Cách Mạng Sản Xuất Video Bằng Trí Tuệ Nhân Tạo",
  "targetDurationSec": 120,
  "scenes": [
    {
      "id": "scene_01",
      "type": "title",
      "voiceoverText": "Bạn có biết rằng chín mươi phần trăm doanh nghiệp đang lãng phí hàng nghìn giờ mỗi năm chỉ để sản xuất video thủ công?",
      "onScreenText": {
        "title": "ĐỘT PHÁ SẢN XUẤT VIDEO",
        "subtitle": "Kỷ nguyên tự động hóa 100% bằng Trí tuệ nhân tạo"
      },
      "transition": "fade",
      "estimatedDurationSec": 8
    },
    {
      "id": "scene_02",
      "type": "bullets",
      "voiceoverText": "Quy trình truyền thống luôn đối mặt với ba rào cản lớn: chi phí thuê ngoài đắt đỏ, thời gian dựng phim kéo dài nhiều tuần, và chất lượng không đồng đều giữa các tập.",
      "onScreenText": {
        "title": "3 RÀO CẢN TRUYỀN THỐNG",
        "bullets": [
          "Chi phí sản xuất đắt đỏ",
          "Thời gian kéo dài nhiều tuần",
          "Chất lượng thiếu đồng nhất"
        ]
      },
      "transition": "fade",
      "estimatedDurationSec": 14
    },
    {
      "id": "scene_03",
      "type": "image",
      "voiceoverText": "Nhưng giờ đây, một nhà máy tự động có thể biến một trang tài liệu brief đơn giản thành video Full HD hoàn chỉnh chỉ trong vài phút.",
      "onScreenText": {
        "title": "NHÀ MÁY TỰ ĐỘNG HÓA",
        "subtitle": "Từ Brief ngắn gọn đến Video hoàn chỉnh"
      },
      "visual": {
        "type": "image",
        "file": "media/scene_03.jpg",
        "prompt": "Photorealistic medium shot of a high-tech automated creative workspace, glowing holographic screens displaying video timelines and data pipelines, sleek modern minimalist studio, 85mm prime lens, volumetric lighting, shallow depth of field, 8k resolution --ar 16:9",
        "fitMode": "cover"
      },
      "transition": "slide",
      "estimatedDurationSec": 12
    }
  ]
}
```

---

## 5. Tiêu Chuẩn Nghiệm Thu Kịch Bản
- **Độ dài tổng thể:** Từ 260 đến 320 từ tiếng Việt.
- **Số lượng cảnh:** Từ 8 đến 15 cảnh (đạt chuẩn thời lượng ~2 phút).
- **Cảnh 1:** Đạt chuẩn Viral Hook 3 giây.
- **Kiểm định Cổng 1:** Vượt qua lệnh `npx tsx scripts/validate_storyboard.ts runs/<slug>/storyboard.json` với 0 lỗi.
