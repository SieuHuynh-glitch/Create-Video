# Thang Cấu Hình Chống OOM 4 Cấp Độ (Memory Fallback Ladder)

Tài liệu này cung cấp mã nguồn chuẩn xác cho 4 cấp độ cấu hình bộ nhớ khi chạy Diffusion Video trên GPU 15GB Colab.

---

## Cấp độ 1: Model CPU Offloading (Khuyến nghị chuẩn)
Áp dụng cho mọi model video khi vừa nạp vào Colab T4:
```python
import torch
from diffusers import StableVideoDiffusionPipeline

pipe = StableVideoDiffusionPipeline.from_pretrained(
    "stabilityai/stable-video-diffusion-img2vid-xt-1-1",
    torch_dtype=torch.float16,
    variant="fp16",
    low_cpu_mem_usage=True,
)
# TUYỆT ĐỐI KHÔNG DÙNG pipe.to("cuda")
pipe.enable_model_cpu_offload()
```
* **Mức tiêu thụ VRAM:** ~4.5 GB - 6.5 GB.
* **Tốc độ:** Tốt nhất (~1x).

---

## Cấp độ 2: Sequential CPU Offload + VAE Slicing/Tiling + Decode Chunk
Sử dụng khi mô hình có kiến trúc 3D lớn hoặc VRAM khả dụng dưới 5GB:
```python
# Luân chuyển theo từng lớp mạng (layer-by-layer)
pipe.enable_sequential_cpu_offload()

# Tối ưu hóa VAE spatial & temporal
if hasattr(pipe, "vae"):
    if hasattr(pipe.vae, "enable_tiling"):
        pipe.vae.enable_tiling()
    if hasattr(pipe.vae, "enable_slicing"):
        pipe.vae.enable_slicing()

# Giải mã video từng cụm nhỏ (tránh VRAM spike cuối chu kỳ)
result = pipe(
    image=input_image,
    decode_chunk_size=2,  # Chỉ decode 2 frame/lần
    num_frames=25,
).frames[0]
```
* **Mức tiêu thụ VRAM:** ~2.5 GB - 3.8 GB.
* **Tốc độ:** Chậm hơn Cấp 1 khoảng 20-30%, nhưng gần như không thể OOM.

---

## Cấp độ 3: Lượng tử hóa Int8 bằng torchao
Dành cho các mô hình Transformer 10B+ (như CogVideoX, LTX, HunyuanVideo):
```python
import torch
from torchao.quantization import quantize_, int8_weight_only

# Nạp transformer ở fp16 vào CPU
transformer = pipe.transformer
# Lượng tử hóa trọng số về int8 (giảm 50% dung lượng)
quantize_(transformer, int8_weight_only())

# Bật offload sau khi lượng tử hóa
pipe.enable_model_cpu_offload()
```
* **Mức tiêu thụ VRAM:** Giảm thêm 40-50% dung lượng tĩnh.

---

## Cấp độ 4: Hạ cấp độ phân giải và số khung hình (Last Resort)
Khi cả 3 cấp trên vẫn bị OOM do prompt hoặc kích thước ảnh quá lớn:
* Giảm độ phân giải ảnh đầu vào từ `1024x576` xuống `768x432` hoặc `512x288`.
* Giảm `num_frames` từ `25` xuống `14` (hoặc từ `49` xuống `25`).
* Giảm `num_inference_steps` từ `30` xuống `20`.
