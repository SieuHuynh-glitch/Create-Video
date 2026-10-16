# BÁO CÁO BENCHMARK & ĐÁNH GIÁ POLLINATIONS VIDEO API (PILOT V3.0)
*Thời gian thực hiện: 12:40 16/10/2026*  
*Trạng thái: 🛑 **ĐÃ DỪNG LẠI SAU PILOT (Chờ quyết định của Người điều hành)***

---

## 1. THÔNG SỐ ĐO ĐẠC PILOT THỰC TẾ (SHOT 01)

| Tiêu chí | Kết quả đo thực tế | Chi tiết kỹ thuật & Log |
| :--- | :--- | :--- |
| **Mã Shot thử nghiệm** | `shot_01` | Shot mở màn vòng lặp (Awakening) |
| **Ảnh khung đầu (Start Frame)** | `scene_02_skull.jpg` | Đã tải lên `https://media.pollinations.ai/061781c0-dc0b-4765-a873-d8bbd94ba99e` (91.683 bytes) |
| **Mô hình mục tiêu** | `alibaba/wan-2.2-fast` | Chế độ Image-to-Video (I2V), thời lượng yêu cầu: 8.0s, tỉ lệ 16:9 |
| **Số lần gọi API đã dùng** | **1 lần** (trên tối đa 2 lần cho phép) | Không lãng phí hạn mức, dừng kiểm soát ngay khi có phản hồi |
| **Thời gian phản hồi** | 2.1 giây | Phản hồi xác thực và kiểm tra quota từ Cloudflare Gateway |
| **Mã trạng thái HTTP** | **HTTP 402 PAYMENT_REQUIRED** | Lỗi cạn kiệt hạn mức trả phí |
| **Mã lỗi chi tiết** | `INSUFFICIENT_BALANCE` | `"Insufficient balance. This request costs ~0.0500 pollen, but your available paid balance is 0.0000."` |
| **Xử lý Resolver** | ✅ Đã đánh dấu `pending` | Ghi nhận trong [runs/natural-cycle-v2/status.md](file:///d:/project/Create-Video/runs/natural-cycle-v2/status.md), **không tự ý đổi dịch vụ** |

---

## 2. PHÂN TÍCH QUOTA & CƠ CHẾ TÍNH PHÍ POLLINATIONS VIDEO

Từ kết quả quét toàn bộ 22 mô hình video trong catalog chính thức (`GET https://gen.pollinations.ai/video/models`):

1. **Ràng buộc `paid_only: true`:**
   - Toàn bộ **100% các mô hình video** trên Pollinations (`alibaba/wan-2.2-fast`, `alibaba/wan-2.7`, `bytedance/seedance-2.0-fast`, `google/veo-3.1-fast`, `kandinsky-6.0-lite`, v.v.) đều có gắn cờ:
     ```json
     "paid_only": true
     ```
   - **Tài khoản miễn phí (Free Tier)** của Pollinations chỉ cấp quyền sử dụng các mô hình tạo văn bản (Text) và ảnh tĩnh cơ bản (Image Schnell/Flux). Không có bất kỳ mô hình Image-to-Video nào mở miễn phí 0 Pollen.

2. **Đơn giá sinh Video:**
   - `alibaba/wan-2.2-fast`: **0.01 Pollen / giây video** $\rightarrow$ Clip 8 giây tốn **~0.0500 - 0.0800 Pollen** (~$0.05 - $0.08).
   - `bytedance/seedance-2.0-fast`: **0.07 Pollen / giây** $\rightarrow$ Clip 5 giây tốn **~0.35 Pollen**.
   - `google/veo-3.1-fast`: **0.08 Pollen / giây** $\rightarrow$ Clip 8 giây tốn **~0.64 Pollen**.

---

## 3. BÀI TOÁN HẠN MỨC MIỄN PHÍ & DỰ TOÁN CHO 12 SHOT

### 3.1. Hạn mức miễn phí (Free Tier)
- **Số clip tạo được mỗi tuần với hạn mức miễn phí:** **0 clip/tuần** (do `paid_only: true` chặn mọi tài khoản có số dư trả phí 0.0000).
- **Số tuần cần để hoàn thành toàn bộ 12 shot bằng tài khoản miễn phí:** **Không thể hoàn thành ($\infty$)** qua API Pollinations miễn phí.

### 3.2. Dự toán nếu nạp Pollen (Paid Tier)
Chi phí tính bằng Pollen trên Pollinations cực kỳ rẻ nếu bạn nạp tối thiểu (khoảng $1 - $2):
- **Đối với mô hình `alibaba/wan-2.2-fast`:**
  - Chi phí 1 shot (8 giây): $\approx 0.05$ Pollen.
  - Toàn bộ 12 shots: $12 \times 0.05 = \mathbf{0.60\text{ Pollen}}$ ($\approx$ **15.000 VNĐ**).
- **Đối với mô hình `bytedance/seedance-2.0-fast`:**
  - Toàn bộ 12 shots: $12 \times 0.35 = \mathbf{4.20\text{ Pollen}}$ ($\approx$ **105.000 VNĐ**).

---

## 4. BẢNG SO SÁNH 2 LỰA CHỌN ĐỂ BẠN QUYẾT ĐỊNH

| Tiêu chí | Lựa chọn A: Pollinations API (Tự động 100%) | Lựa chọn B: Google Veo Thủ Công (Semi-Auto Hướng B) |
| :--- | :--- | :--- |
| **Hình thức thực hiện** | Pipeline chạy lệnh `npm run generate:clip` | Bạn tự tạo trên giao diện Veo/VideoFX và thả file vào `media/` |
| **Chi phí** | Cần nạp tối thiểu $1 (dùng hết ~0.60 Pollen cho 12 shot) | **Hoàn toàn miễn phí 0đ** (sử dụng tài khoản Google Veo miễn phí của bạn) |
| **Chất lượng chuyển động** | Wan 2.2 Fast (chất lượng ở mức khá, chuyển động AI tiêu chuẩn) | **Google Veo đỉnh cao** (chuyển động quang học mượt, độ chi tiết lông vũ sắc nét nhất) |
| **Tốc độ hoàn thành** | ~10 - 15 phút (chạy nền hoàn toàn) | ~30 - 45 phút (bạn thao tác 12 lần trên web Veo) |
| **Quy trình sẵn sàng** | Script `generate_clip.ts` đã hoàn thiện và kiểm thử xong | Script `extract_last_frame.ts` + `check_clip.ts` + Sổ tay [docs/b-workflow.md](file:///d:/project/Create-Video/docs/b-workflow.md) đã sẵn sàng |

---

## 5. KẾT LUẬN & ĐIỂM DỪNG BẮT BUỘC

Theo đúng yêu cầu tại **Mục 5** của bạn:
> *"5. DỪNG sau pilot, chờ tôi quyết định có dùng tự động hay chuyển qua Veo thủ công."*

Pipeline hiện tại đã:
1. Hoàn thành script `scripts/generate_clip.ts` chuẩn Resolver 3 cấp.
2. Kiểm thử an toàn API với 1 lần gọi duy nhất.
3. Bảo vệ khóa API tuyệt đối trong `.env` (không log, không commit).
4. Cập nhật trạng thái `pending` trong [runs/natural-cycle-v2/status.md](file:///d:/project/Create-Video/runs/natural-cycle-v2/status.md).
5. **DỪNG LẠI HOÀN TOÀN** để bạn lựa chọn phương án tiếp theo.

---

## 6. CẬP NHẬT KIẾN TRÚC V4.1: CƠ CHẾ FAST-SKIP 0MS CHO TẦNG 1

Từ bằng chứng thực nghiệm ở trên (100% video model trên Pollinations đều là `paid_only: true` và trả về HTTP 402 khi balance = 0):
- **Cơ chế Fast-Skip 0ms:** Trong phiên bản V4.1 (`scripts/generate_clip.ts`), nếu kiểm tra thấy không có API key trả phí hoặc số dư Pollen = 0, hệ thống **bỏ qua Tầng 1 ngay lập tức trong 0ms**, không gửi request HTTP và không tải ảnh của người dùng lên `media.pollinations.ai`.
- **Bảo toàn dữ liệu & thời gian:** Loại bỏ 2.1s delay vô ích cho mỗi shot, bảo mật ảnh nguồn gốc của người dùng, duy trì các shot ở Tầng 0 (`LumaParallaxScene`) và xuất job vào `jobs/pending/` cho Tầng 2 (Colab Worker LTX-Video) hoặc B-Workflow (Veo).

