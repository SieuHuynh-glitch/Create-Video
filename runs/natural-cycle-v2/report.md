# BÁO CÁO SẢN XUẤT TỰ ĐỘNG (AUTO MODE): natural-cycle-v2

*Thời điểm hoàn thành: 17:58:26 16/10/2026 | Thời gian xử lý: 1270.7s*

## 1. Kết Quả Xuất Xưởng
- **Tệp xuất xưởng:** [out/natural-cycle-v2.mp4](file:///D:/project/Create-Video/out/natural-cycle-v2.mp4)
- **Độ phân giải:** 1920x1080 (Full HD) @ 30fps
- **Thời lượng:** 120 giây (3600 frames)
- **Dung lượng file:** 34.31 MB
- **Chi phí phát sinh:** **0 VND / 0 USD** (100% tài nguyên miễn phí)

## 2. Phân Bổ Tầng Kỹ Thuật (Tier Breakdown)
| Shot ID | Tầng Đang Dùng | Kiểu Cảnh | Chuyển Động Camera | Prompt AI Chuẩn Bị |
| :--- | :--- | :--- | :--- | :--- |
| **shot_01** | `Tầng 0 (Luma Parallax)` | luma-parallax | `zoom_in` | Surreal monochrome black ink drawing on pure ... |
| **shot_02** | `Tầng 0 (Luma Parallax)` | luma-parallax | `pan_left` | Surreal monochrome black ink art on pure whit... |
| **shot_03** | `Tầng 0 (Luma Parallax)` | luma-parallax | `breathing` | Surreal monochrome ink illustration on pure w... |
| **shot_04** | `Tầng 0 (Luma Parallax)` | luma-parallax | `zoom_out` | Surreal black ink painting on pure white back... |
| **shot_05** | `Tầng 0 (Luma Parallax)` | luma-parallax | `pan_right` | Surreal black ink painting on pure white back... |
| **shot_06** | `Tầng 0 (Luma Parallax)` | luma-parallax | `breathing` | Surreal monochrome ink drawing on pure white ... |
| **shot_07** | `Tầng 0 (Luma Parallax)` | luma-parallax | `zoom_in` | Surreal monochrome ink painting on pure white... |
| **shot_08** | `Tầng 0 (Luma Parallax)` | luma-parallax | `pan_left` | Surreal black ink art on pure white backgroun... |
| **shot_09** | `Tầng 0 (Luma Parallax)` | luma-parallax | `breathing` | Surreal monochrome black ink drawing on pure ... |
| **shot_10** | `Tầng 0 (Luma Parallax)` | luma-parallax | `zoom_out` | Surreal monochrome black ink drawing on pure ... |
| **shot_11** | `Tầng 0 (Luma Parallax)` | luma-parallax | `pan_right` | Surreal monochrome black ink drawing on pure ... |
| **shot_12** | `Tầng 0 (Luma Parallax)` | luma-parallax | `breathing` | Surreal monochrome black ink art on pure whit... |

- **Số shot hiện tại ở Tầng 0 (Local CPU):** 12 / 12
- **Số shot đã nâng cấp lên Tầng 2 (Colab AI):** 0 / 12
- **Hàng đợi Colab Worker:** 12 jobs đang chờ xử lý trong `jobs/pending/natural-cycle-v2/`
- **Clip AI đã hoàn thành:** 0 clips trong `jobs/done/natural-cycle-v2/`

## 3. Kết Quả Kiểm Định Chất Lượng Tự Động (QA Gates)
- **Cổng 1 (Media & Licensing):** `PASSED` (Nguồn ảnh: User Provided / Bản quyền: Original Art)
- **Cổng 2 (Motion & DOM Text):** `PASSED` (An toàn tuyệt đối trong Safe Margin 96px)
- **Cổng 3 (Audio EBU R128):** `PASSED` (Mastering -15 LUFS, True Peak <= -1.0 dBFS, BGM Ambient Drone 432Hz)

## 4. Hướng Dẫn Nâng Cấp Lên Tầng 2 (Clip AI Không Sập RAM)
Nếu muốn chuyển các shot từ Tầng 0 lên Tầng 2 (Sinh clip động AI bằng LTX-Video trên Colab T4 miễn phí):
1. Mở [notebooks/colab_worker.ipynb](file:///D:/project/Create-Video/notebooks/colab_worker.ipynb) trên Google Colab.
2. Chạy cell để Worker tự động mã hóa prompt qua T5 8-bit và sinh clip video 704x384 @ 24fps.
3. Khi clip hoàn tất lưu vào `jobs/done/natural-cycle-v2/`, chạy lệnh:
   ```bash
   npm run upgrade:video -- natural-cycle-v2
   ```
   Hệ thống sẽ tự động upscale Lanczos 1080p @ 30fps và xuất bản bản nâng cấp hoàn hảo!
