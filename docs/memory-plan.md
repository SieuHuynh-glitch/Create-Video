# KẾ HOẠCH BỘ NHỚ COLAB (MEMORY PLAN - COLAB GPU GUARD)

## 1. Môi trường mục tiêu
- **Phần cứng:** Google Colab Free Tier (GPU Tesla T4 15GB VRAM, 12.7GB System RAM).
- **Mô hình AI:** `Lightricks/LTX-Video` (Image-to-Video).
- **Độ phân giải:** 704x384 @ 24fps (Tỉ lệ ~16:9, bội số 32).
- **Kiểu dữ liệu:** `torch.float16` (Tesla T4 kiến trúc Turing sm_75 không hỗ trợ phần cứng BF16, tránh tràn số NaN của CogVideoX).

---

## 2. Ước tính Bộ nhớ & Điểm nghẽn
1. **Điểm nghẽn System RAM (12.7GB):**
   - Text encoder `T5-v1_1-xxl` trong LTX-Video có kích thước ~9.5GB ở FP16.
   - Nếu nạp đồng thời cả Text Encoder và Transformer + VAE vào RAM thông qua `enable_model_cpu_offload()`, tổng dung lượng vượt quá **14.5GB** $\rightarrow$ Colab sập runtime ngay lập tức!
2. **Giải pháp: Quy trình 2 Pha (Two-Phase Pre-Encoding):**
   - **Pha 1 (Prompt Encoding):** Chỉ nạp `T5EncoderModel` lượng tử hóa 8-bit (`load_in_8bit=True` qua `bitsandbytes`). Đỉnh RAM chỉ tốn **~4.2GB**. Mã hóa toàn bộ prompt thành file tensor `prompt_embeds.pt` lưu ra đĩa, sau đó `del text_encoder; gc.collect(); torch.cuda.empty_cache()`.
   - **Pha 2 (Video Generation):** Nạp `LTXImageToVideoPipeline` với `text_encoder=None, tokenizer=None`. RAM hệ thống duy trì ở mức **~5.2GB / 12.7GB** (rất an toàn).
3. **Ước tính VRAM GPU (15GB Tesla T4):**
   - Transformer + VAE ở float16: ~6.2GB VRAM.
   - Kích hoạt `pipe.enable_model_cpu_offload()`.
   - Kích hoạt `pipe.vae.enable_tiling()` và `pipe.vae.enable_slicing()`.
   - Peak VRAM khi sinh 49 frames (704x384): **~8.8GB / 15.0GB** ($< 60\%$ ngưỡng nguy hiểm).

---

## 3. Thang hạ cấu hình khi gặp OOM (Fail-Safe Ladder)
Nếu xảy ra `torch.cuda.OutOfMemoryError`:
1. **Bậc 1:** `pipe.enable_model_cpu_offload()` $\rightarrow$ nếu lỗi: chuyển sang `pipe.enable_sequential_cpu_offload()`.
2. **Bậc 2:** Giảm số frames từ 49 frames xuống **25 frames** (~1 giây).
3. **Bậc 3:** Giảm số bước suy luận `num_inference_steps` từ 30 xuống **20**.
4. **Bậc 4:** Nếu vẫn không đủ tài nguyên, ghi nhận lỗi vào `jobs/failed/<slug>/`, tự động hạ shot về Tầng 0 (Luma Parallax CPU), **tuyệt đối không làm sập tiến trình sản xuất**.
