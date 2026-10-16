# BÁO CÁO TIẾN ĐỘ & TRẠNG THÁI SẢN XUẤT V3.0: NATURAL CYCLE (CONTINUOUS MOTION)

- **Dự án (Slug):** `natural-cycle-v2`
- **Phiên bản hệ thống:** V3.0 (Semi-Auto Human-in-the-Loop Veo & Continuous Motion Pipeline)
- **Trạng thái hiện tại:** 🛑 **ĐIỂM DỪNG BẮT BUỘC (MANDATORY MILESTONE CHECKPOINT)**
- **Cập nhật lúc:** 12:15 16/10/2026

---

## 1. Tổng Quan Tiến Độ & Kiến Trúc V3.0

Hệ thống đã chuyển đổi hoàn toàn từ mô hình slide tĩnh sang mô hình **Video Chuyển Động Liên Tục (Continuous Motion Video)**:
- **Thời lượng tổng thể:** 120.0 giây (3.600 frames @ 30fps) chia thành **12 shots**.
- **Chuyển cảnh chồng lấn:** 1.0 giây (30 frames) dạng tan chảy (Melting Cross-Dissolve), loại bỏ hoàn toàn cắt cứng và PowerPoint transitions.
- **Lớp khí quyển & hạt bụi:** `<ParticleField />` phủ kín toàn video với 36 vi hạt hữu cơ chuyển động trôi nổi tự nhiên.
- **Âm thanh:** Master Drone Atmosphere liền mạch 120s, không gián đoạn bởi tiếng whoosh hay ducking.

---

## 2. Trạng Thái 3 Shot Đầu Tiên (Khung Timeline Thử Nghiệm)

| Shot ID | Thời lượng timeline | Mốc bắt đầu | Trạng thái Media | Ghi chú kỹ thuật |
| :--- | :--- | :--- | :--- | :--- |
| **shot_01** | 10.0s (300f) | 00:00 (f0) | ⏳ `PENDING_MEDIA` (Placeholder đồ họa) | Đang chờ bạn sinh từ `anchors/scene_02_skull.jpg` |
| **shot_02** | 10.5s (315f) | 00:09 (f270) | ⏳ `PENDING_MEDIA` (Placeholder đồ họa) | Chồng lấn 1.0s (30f) tan chảy vào shot_01 |
| **shot_03** | 11.0s (330f) | 00:18.5 (f555) | ⏳ `PENDING_MEDIA` (Placeholder đồ họa) | Chồng lấn 1.0s (30f) tan chảy vào shot_02 |

*Tổng thời lượng khung thử 3 shot đầu:* **29.5 giây (885 frames @ 30fps)**.

---

## 3. Trạng Thái Các Công Cụ Kỹ Thuật V3.0

1. **`scripts/extract_last_frame.ts`:** ✅ Đã hoàn thành & sẵn sàng trích xuất khung cuối làm xuất phát điểm cho shot tiếp theo.
2. **`scripts/check_clip.ts`:** ✅ Đã hoàn thành (kiểm tra `ffprobe`, `freezedetect`, upscale $\le 1.5\times$, crop 4 góc soi watermark, cập nhật `manifest.json`).
3. **`scripts/check_motion.ts`:** ✅ Đã hoàn thành (Cổng Motion QA: phát hiện đơ tĩnh $> 1.0$s, đo độ biến thiên khung hình).
4. **Hồ sơ Prompt & Hướng dẫn:**
   - [runs/natural-cycle-v2/shot-list.md](file:///d:/project/Create-Video/runs/natural-cycle-v2/shot-list.md) (Toàn bộ 12 prompts chuẩn Veo kèm khóa phong cách và điểm neo).
   - [docs/b-workflow.md](file:///d:/project/Create-Video/docs/b-workflow.md) (Checklist từng bước cho người điều hành).
5. **Khảo sát Hugging Face:** Đã đo lường Wan 2.1 (A100 cần 3–5 phút/clip, ZeroGPU giới hạn 60-120s/ngày); khẳng định kiến trúc Google Veo Human-in-the-loop là tối ưu nhất.

---

## 🛑 4. ĐIỂM DỪNG CHỜ NGƯỜI ĐIỀU HÀNH (NEXT STEP)

Hệ thống đang **DỪNG LẠI TUYỆT ĐỐI** và chờ bạn:
1. Mở [docs/b-workflow.md](file:///d:/project/Create-Video/docs/b-workflow.md) và [runs/natural-cycle-v2/shot-list.md](file:///d:/project/Create-Video/runs/natural-cycle-v2/shot-list.md).
2. Lấy ảnh đầu tiên: [runs/natural-cycle-v2/media/anchors/scene_02_skull.jpg](file:///d:/project/Create-Video/runs/natural-cycle-v2/media/anchors/scene_02_skull.jpg).
3. Đưa vào Google Veo cùng Prompt Shot 01, sinh clip 8s và tải về lưu vào `runs/natural-cycle-v2/media/shot_01.mp4`.
4. Báo lại cho pipeline để chạy trích xuất khung cuối cho Shot 02 và kiểm định kỹ thuật!

## 4. Cổng Motion QA (Kiểm định Chuyển Động V3.0)
- **Trạng thái:** `PENDING_MEDIA` (Chưa quét - Đang chờ nhận file clip Google Veo thật)
- **Tiêu chí bắt buộc:** Không đơ tĩnh liên tục $\ge 1.0$s (`freezedetect`), sai phân khung hình $\ge 0.6\%$.

- [ ] **shot_01**: ⏳ PENDING (HẾT HẠN MỨC (HTTP 402): Số dư Pollen hoặc ngân sách key đã cạn kiệt.)