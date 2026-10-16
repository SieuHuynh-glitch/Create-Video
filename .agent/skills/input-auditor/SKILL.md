---
name: input-auditor
description: Thẩm định và làm giàu tài liệu brief đầu vào (inputs/<slug>/brief.md), nhận diện chế độ âm thanh (voiceover vs ambient-only), trích xuất Fact-Check contract (allowedNumbers), và tự động mở rộng kịch bản đạt chuẩn cho 120s mà không vi phạm số liệu. Bắt buộc kích hoạt ở Bước 0 trước khi chạy auto_plan.ts trong AUTO MODE.
---

# Input Auditor Skill

Cổng thẩm định chất lượng và tự động làm giàu nội dung đầu vào từ `inputs/<slug>/brief.md` trước khi hệ thống bước vào giai đoạn lập kế hoạch chi tiết (`auto_plan.ts`).

## 1. Mục tiêu và Nguyên tắc Cốt lõi

1. **Nhận diện đúng Chế độ Âm thanh (`audioMode`):**
   - Không được ép kịch bản phim thơ/nghệ thuật thiền định (`ambient-only`) phải sinh lời bình Edge-TTS làm mất đi tính thiền và không gian âm thanh.
   - Không được để kịch bản thuyết minh (`voiceover`) bị thiếu từ, dẫn đến video bị hụt thời lượng.
2. **Khóa chặt Hợp đồng Dữ kiện (Fact-Check Contract):**
   - Mọi số liệu trong kịch bản mở rộng phải thuộc mảng `allowedNumbers` trích xuất từ `brief.md` gốc.
   - Tuyệt đối không sinh số liệu lạ, ngày tháng hoặc tỷ lệ phần trăm tùy tiện.
3. **Độc lập và Bảo toàn Đầu vào (Input Immutability):**
   - Đọc từ `inputs/<slug>/brief.md`.
   - Kết quả làm giàu ghi ra `runs/<slug>/enriched_brief.md`. Tuyệt đối không ghi đè vào thư mục `inputs/`.

---

## 2. Quy trình Thẩm định & Làm giàu

### Bước 1: Nhận diện Chế độ Âm thanh (`audioMode`)
Quét nội dung `brief.md` tìm các dấu hiệu nhận biết:
- **`ambient-only`:** Nếu phát hiện các từ khóa: `drone`, `ambient`, `không lời`, `không thoại`, `instrumental`, `nhạc thiền`, `non-verbal`, `sound design`, `432Hz`, hoặc phần tóm tắt cốt truyện hoàn toàn mô tả biến đổi thị giác mà không có lời bình.
- **`voiceover`:** Nếu phát hiện các từ khóa: `thuyết minh`, `lời bình`, `giọng đọc`, `voiceover`, `Edge-TTS`, `kịch bản đọc`, hoặc nội dung có văn bản hội thoại/lời dẫn.

### Bước 2: Đánh giá Độ hoàn thiện của Brief
Một `brief.md` được xem là **ĐẠT (Ready)** khi thỏa mãn:
1. Độ dài nội dung thực chất $\ge 60$ từ.
2. Có cấu trúc diễn tiến phân cảnh rõ ràng (Mở đầu $\to$ Phát triển $\to$ Cao trào $\to$ Kết thúc).
3. Đã có gợi ý hướng chuyển động camera hoặc nhịp điệu thị giác.

Nếu không thỏa mãn các điều kiện trên $\rightarrow$ Đánh giá là **CHƯA ĐẠT (Needs Enrichment)** và kích hoạt làm giàu tự động.

### Bước 3: Trích xuất Hợp đồng Dữ kiện (`allowedNumbers`)
Quét toàn bộ văn bản `brief.md` để trích xuất danh sách các con số nguyên thủy:
- Ví dụ: `natural-cycle-v2` có các số `"120"` (thời lượng), `"432"` (tần số Hz), `"4"` (4 quả đầu lâu), `"1"` (1 quả rụng, 1.0s overlap).
- Lưu thành mảng `allowedNumbers: string[]`. Khi mở rộng kịch bản, chỉ sử dụng tính từ/trạng từ định tính (*"nhiều"*, *"đông đúc"*, *"vô số"*, *"dần dần"*), cấm tuyệt đối sinh thêm số mới (*"5"*, *"10"*, *"50%"*).

### Bước 4: Làm giàu Nội dung (`runs/<slug>/enriched_brief.md`)

#### Trường hợp A: Chế độ `ambient-only` (Phim thơ / Thị giác thuần túy)
- Mở rộng thành **Kịch bản Hành động Thị giác & Nhịp điệu Camera (Visual & Motion Beats)** cho đủ 12–18 shot:
  - **Mỗi shot phải có:** Trạng thái chủ thể, biến đổi hữu cơ, hướng camera easing (`zoom_in`, `zoom_out`, `pan_left`, `pan_right`, `breathing`), thời lượng ước tính (~8–11s) và Prompt tiếng Anh chuẩn cho AI Video (LTX-Video).
  - Khóa phong cách thị giác (Style Lock) đồng nhất xuyên suốt video.

#### Trường hợp B: Chế độ `voiceover` (Video thuyết minh)
- Mở rộng kịch bản theo công thức Storybeat 5 chặng:
  - **Chặng 1 (Hook 0-15s):** Giật tít, nêu vấn đề cốt lõi.
  - **Chặng 2 (Context 15-40s):** Bối cảnh và nguyên nhân.
  - **Chặng 3 (Deep-dive 40-80s):** Chi tiết then chốt, phân tích sâu.
  - **Chặng 4 (Resolution 80-105s):** Giải pháp hoặc bước ngoặt.
  - **Chặng 5 (Call-to-Action 105-120s):** Đúc kết và kêu gọi hành động.
- Tính toán số từ chuẩn: $T_{\text{target}} \times 3.34\text{ từ/giây} \approx 380\text{ từ}$ cho 120 giây (dựa trên thực nghiệm chuẩn của `config/calibration.json`).

### Bước 5: Hậu kiểm Fact-Check
Kiểm tra `runs/<slug>/enriched_brief.md`:
- Trích xuất tất cả số trong file mới.
- Nếu xuất hiện số không nằm trong `allowedNumbers` $\rightarrow$ Tự động thay thế bằng từ định tính tương đương trước khi hoàn tất.

---

## 3. Cấu trúc Output mẫu (`runs/<slug>/enriched_brief.md`)

```markdown
# ENRICHED BRIEF: [Tiêu đề Dự Án]
- **Slug:** natural-cycle-v2
- **Audio Mode:** ambient-only
- **Target Duration:** 120s (12 shots)
- **Allowed Numbers:** ["120", "432", "4", "1"]
- **Visual DNA:** HIGH_KEY_MONOCHROME_WHITE_BG

## Phân cảnh Thị giác & Hành động (Visual Beats)
### Shot 01: The Awakening (0s - 10.9s)
- **Chủ thể:** Hộp sọ phủ lông vũ tỉnh giấc trên nền trắng #FFFFFF.
- **Chuyển động:** Các sợi lông tơ khẽ lay động trong luồng gió vô hình.
- **Camera:** zoom_in chậm rãi (easing).
- **AI Prompt:** Surreal monochrome black ink drawing on pure white background, feathery skull awakens...

[... các shot tiếp theo ...]
```
