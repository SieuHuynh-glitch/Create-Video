# DANH MỤC CẢNH QUAY THỊ GIÁC & PROMPT GOOGLE VEO (SHOT-LIST V3.0)
## Dự án: NATURAL CYCLE (Phiên bản V3.0 - Continuous Motion)

- **Mã dự án (Slug):** `natural-cycle-v2`
- **Mô hình AI Video:** Google Veo (hoặc Kling / Runway Gen-3)
- **Thời lượng tổng:** 120.0 giây (3.600 frames @ 30fps)
- **Cấu hình clip gốc:** 8.0 giây / clip, định dạng 16:9 (1920x1080), 24fps hoặc 30fps
- **Hệ số làm chậm (Slow-Motion):** $k \approx 1/0.75 \approx 1.33\times$ (phù hợp nhịp điệu thiền định, chiêm nghiệm)
- **Chồng lấn chuyển cảnh (Overlap):** $o = 1.0$ giây (30 frames) tan chảy hữu cơ (melting dissolve)
- **Khóa phong cách bắt buộc (Style Lock Directive):**
  > *"monochrome black-and-white ink style, pure white background, no color, no text, no logos, no music, slow and meditative, 8 seconds"*
- **Quy tắc neo phong cách (Re-anchoring Rule):** Mỗi 4 shot, hệ thống tái sử dụng ảnh gốc chất lượng cao từ thư mục `media/anchors/` để chống hiện tượng trôi dạt phong cách (style drift) của AI.

---

## BẢNG PHÂN BỔ 12 SHOT CHI TIẾT

| Shot ID | Tên File Đích | Thời lượng gốc | Thời lượng timeline | Mốc bắt đầu | Khung hình đầu vào (Start Frame) | Loại Shot |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **shot_01** | `media/shot_01.mp4` | 8.0s | 10.0s (300f) | 00:00 (f0) | `anchors/scene_02_skull.jpg` | **Anchor 1 (Awakening)** |
| **shot_02** | `media/shot_02.mp4` | 8.0s | 10.5s (315f) | 00:09 (f270) | `frame_start_for_shot_02.jpg` (từ shot_01) | Continuous Motion |
| **shot_03** | `media/shot_03.mp4` | 8.0s | 11.0s (330f) | 00:18.5 (f555) | `frame_start_for_shot_03.jpg` (từ shot_02) | Continuous Motion |
| **shot_04** | `media/shot_04.mp4` | 8.0s | 10.5s (315f) | 00:28.5 (f855) | `frame_start_for_shot_04.jpg` (từ shot_03) | Continuous Motion |
| **shot_05** | `media/shot_05.mp4` | 8.0s | 10.5s (315f) | 00:38.0 (f1140) | `anchors/scene_04_soil.jpg` | **Anchor 2 (Soil Rise)** |
| **shot_06** | `media/shot_06.mp4` | 8.0s | 10.5s (315f) | 00:47.5 (f1425) | `frame_start_for_shot_06.jpg` (từ shot_05) | Continuous Motion |
| **shot_07** | `media/shot_07.mp4` | 8.0s | 10.0s (300f) | 00:57.0 (f1710) | `anchors/scene_06_seedling_zoom.jpg` | **Anchor 3 (Sprout Macro)** |
| **shot_08** | `media/shot_08.mp4` | 8.0s | 11.0s (330f) | 01:06.0 (f1980) | `frame_start_for_shot_08.jpg` (từ shot_07) | Continuous Motion |
| **shot_09** | `media/shot_09.mp4` | 8.0s | 11.5s (345f) | 01:16.0 (f2280) | `anchors/scene_08_tree_fruits.jpg` | **Anchor 4 (4 Fruits)** |
| **shot_10** | `media/shot_10.mp4` | 8.0s | 11.0s (330f) | 01:26.5 (f2595) | `frame_start_for_shot_10.jpg` (từ shot_09) | Continuous Motion |
| **shot_11** | `media/shot_11.mp4` | 8.0s | 11.5s (345f) | 01:36.5 (f2895) | `anchors/scene_09_fruit_falling.jpg` | **Anchor 5 (Falling Fruit)** |
| **shot_12** | `media/shot_12.mp4` | 8.0s | 13.0s (390f) | 01:47.0 (f3210) | `frame_start_for_shot_12.jpg` (từ shot_11) | **Loop Re-anchor (Return)** |

---

## CHI TIẾT PROMPT GOOGLE VEO TỪNG SHOT

### 🎬 Shot 01: Hộp sọ thức tỉnh (Skull Awakening)
- **Đầu vào:** `runs/natural-cycle-v2/media/anchors/scene_02_skull.jpg`
- **Tên file xuất:** `runs/natural-cycle-v2/media/shot_01.mp4`
- **Mô tả hành động:** Camera tĩnh nhìn thẳng. Hộp sọ đen kết cấu lông vũ nằm đơn độc trên nền trắng tinh khiết. Các sợi lông tơ hữu cơ khẽ lay động rất nhẹ trong làn gió vô hình.
- **Prompt Veo:**
  > `Cinematic slow motion, static camera eye-level centered shot. The surreal black feather-textured skull on pure stark white background gently breathes. Ultra-fine feather filigree delicately ripples and sways in a subtle imperceptible cold breeze. Organic living texture, high contrast ink aesthetic, monochrome black-and-white ink style, pure white background, no color, no text, no logos, no music, slow and meditative, 8 seconds.`

### 🎬 Shot 02: Rạn nứt hữu cơ (Organic Fractures)
- **Đầu vào:** `runs/natural-cycle-v2/media/frame_start_for_shot_02.jpg` (Trích xuất từ khung cuối của shot_01)
- **Tên file xuất:** `runs/natural-cycle-v2/media/shot_02.mp4`
- **Mô tả hành động:** Camera zoom cực chậm vào trán và hốc mắt của hộp sọ. Những đường nứt zigzag màu đen sắc nét từ từ mở rộng và rạn vỡ tự nhiên như băng vỡ hoặc đất nứt.
- **Prompt Veo:**
  > `Extreme slow smooth push-in camera. Intricate hairline zigzag cracks slowly spread across the forehead and eye sockets of the black feather skull. The cracks expand organically like dried earth fracturing, shedding microscopic ink dust. Surreal minimalist art, monochrome black-and-white ink style, pure white background, no color, no text, no logos, no music, slow and meditative, 8 seconds.`

### 🎬 Shot 03: Vụn vỡ thành hạt giống (Dissolution into Seeds)
- **Đầu vào:** `runs/natural-cycle-v2/media/frame_start_for_shot_03.jpg` (Trích xuất từ shot_02)
- **Tên file xuất:** `runs/natural-cycle-v2/media/shot_03.mp4`
- **Mô tả hành động:** Cấu trúc hộp sọ bắt đầu tan rã từ đỉnh đầu xuống. Các mảnh vỡ biến thành những hạt mầm đen hình elip rơi chầm chậm xuống đáy khung hình.
- **Prompt Veo:**
  > `Medium shot, slow descending camera tilt. The fractured black skull gracefully collapses and dissolves into dozens of organic black tear-drop seeds. The seeds drift downward in slow-motion zero gravity through pure white space like falling feathers. Ethereal transformation, monochrome black-and-white ink style, pure white background, no color, no text, no logos, no music, slow and meditative, 8 seconds.`

### 🎬 Shot 04: Hạt mầm tiếp đất (Seeds Reaching Earth)
- **Đầu vào:** `runs/natural-cycle-v2/media/frame_start_for_shot_04.jpg` (Trích xuất từ shot_03)
- **Tên file xuất:** `runs/natural-cycle-v2/media/shot_04.mp4`
- **Mô tả hành động:** Ống kính theo chân các hạt giống đang rơi xuống phía chân trời. Một vệt đen của lớp đất bắt đầu lộ ra ở 20% cạnh dưới khung hình đón nhận hạt giống.
- **Prompt Veo:**
  > `Slow tracking shot following black seeds landing softly into the bottom of the frame. A dark horizon of fertile porous earth begins to emerge at the lower boundary, absorbing the falling seeds. High contrast surreal atmosphere, monochrome black-and-white ink style, pure white background, no color, no text, no logos, no music, slow and meditative, 8 seconds.`

### 🎬 Shot 05: Đất mẹ dâng tràn (Rising Earth Horizon - Anchor 2)
- **Đầu vào:** `runs/natural-cycle-v2/media/anchors/scene_04_soil.jpg`
- **Tên file xuất:** `runs/natural-cycle-v2/media/shot_05.mp4`
- **Mô tả hành động:** Lớp đất đen hữu cơ dâng nhẹ lên cao khoảng 25% chiều cao khung hình. Các hạt đất chuyển động vi mô, xốp mịn, chuẩn bị cho sự nảy mầm.
- **Prompt Veo:**
  > `Low-angle wide shot. The deep black rich mineral soil horizon at the lower quarter of the frame subtly pulses and shifts. Tiny organic soil particles breathe and settle under stark pure white sky. Zen minimalist nature documentary feel, monochrome black-and-white ink style, pure white background, no color, no text, no logos, no music, slow and meditative, 8 seconds.`

### 🎬 Shot 06: Mầm sống trỗi dậy (Sprout Emergence)
- **Đầu vào:** `runs/natural-cycle-v2/media/frame_start_for_shot_06.jpg` (Trích xuất từ shot_05)
- **Tên file xuất:** `runs/natural-cycle-v2/media/shot_06.mp4`
- **Mô tả hành động:** Tại chính giữa mặt đất, một chồi non màu đen uốn mình vươn lên chầm chậm. Hai lá mầm hình lông vũ nhẹ nhàng bung nở ra hai bên.
- **Prompt Veo:**
  > `Time-lapse style ultra-slow cinematic growth. A slender jet-black seedling pierces through the dark soil bed, gently unfurling two delicate feather-like cotyledon leaves towards the empty white sky. Tender organic vitality, monochrome black-and-white ink style, pure white background, no color, no text, no logos, no music, slow and meditative, 8 seconds.`

### 🎬 Shot 07: Cận cảnh lá lông vũ (Macro Leaf Breathing - Anchor 3)
- **Đầu vào:** `runs/natural-cycle-v2/media/anchors/scene_06_seedling_zoom.jpg`
- **Tên file xuất:** `runs/natural-cycle-v2/media/shot_07.mp4`
- **Mô tả hành động:** Cận cảnh macro 1.7x mầm cây non. Gân lá kết cấu xương và phiến lá kết cấu lông vũ khẽ rập rình theo nhịp hô hấp của tự nhiên.
- **Prompt Veo:**
  > `Cinematic macro close-up of the delicate seedling. The intricate bone-like spine of the stem and soft feathery leaf fronds oscillate in a slow hypnotic breathing rhythm against pure white void. High fidelity ink texture, monochrome black-and-white ink style, pure white background, no color, no text, no logos, no music, slow and meditative, 8 seconds.`

### 🎬 Shot 08: Cây đại ngàn vươn cành (Surreal Tree Expansion)
- **Đầu vào:** `runs/natural-cycle-v2/media/frame_start_for_shot_08.jpg` (Trích xuất từ shot_07)
- **Tên file xuất:** `runs/natural-cycle-v2/media/shot_08.mp4`
- **Mô tả hành động:** Camera lùi dần ra xa (pull-back). Thân cây lớn vươn cao, các cành nhánh uốn lượn như xương khô bung xòe các chùm lá lông vũ sang hai bên.
- **Prompt Veo:**
  > `Slow smooth camera pull-back. The seedling grows and transforms into a majestic surreal dead-wood tree with winding bone-like branches and dark feathery foliage. Branches organically divide and reach out into the negative white space. Mythological nature, monochrome black-and-white ink style, pure white background, no color, no text, no logos, no music, slow and meditative, 8 seconds.`

### 🎬 Shot 09: Đơm 4 quả đầu lâu (Fruiting 4 Skulls - Anchor 4)
- **Đầu vào:** `runs/natural-cycle-v2/media/anchors/scene_08_tree_fruits.jpg`
- **Tên file xuất:** `runs/natural-cycle-v2/media/shot_09.mp4`
- **Mô tả hành động:** Trên các cành cây chính, 4 nụ quả tròn dần to ra và nở thành đúng 4 quả hình đầu lâu lông vũ đen treo lơ lửng trên cành.
- **Prompt Veo:**
  > `Wide cinematic shot centered on the ancient surreal tree. Exactly four distinct miniature feather-textured skull fruits bud and mature on the branches, swaying gently on thin natural tendrils. Symmetrical botanical wonder, monochrome black-and-white ink style, pure white background, no color, no text, no logos, no music, slow and meditative, 8 seconds.`

### 🎬 Shot 10: Quả đầu lâu đung đưa (Maturation & Stillness)
- **Đầu vào:** `runs/natural-cycle-v2/media/frame_start_for_shot_10.jpg` (Trích xuất từ shot_09)
- **Tên file xuất:** `runs/natural-cycle-v2/media/shot_10.mp4`
- **Mô tả hành động:** Gió nổi lên nhẹ. 4 quả đầu lâu đung đưa nhịp nhàng. Một quả ở cành bên phải bắt đầu nặng trĩu và nới lỏng cuống quả.
- **Prompt Veo:**
  > `Slow pan and subtle push toward the tree canopy. The four skull fruits sway in harmonious rhythm under wind. One specific skull fruit on the right branch sways more heavily as its fibrous stem begins to weaken. Tense poetic stillness, monochrome black-and-white ink style, pure white background, no color, no text, no logos, no music, slow and meditative, 8 seconds.`

### 🎬 Shot 11: Một quả tách cành rơi rụng (Fruit Detachment - Anchor 5)
- **Đầu vào:** `runs/natural-cycle-v2/media/anchors/scene_09_fruit_falling.jpg`
- **Tên file xuất:** `runs/natural-cycle-v2/media/shot_11.mp4`
- **Mô tả hành động:** Cuống quả đứt đoạn dứt khoát. 1 quả đầu lâu tách khỏi cành và rơi chầm chậm thẳng đứng theo đường bay đầy trọng lực xuống đáy khung hình.
- **Prompt Veo:**
  > `Dramatic slow-motion tracking shot. Exactly one skull fruit snaps from its twig and plummets downward through the stark white void in graceful slow motion, rotating ever so slightly as it falls towards the bottom. Existential gravity, monochrome black-and-white ink style, pure white background, no color, no text, no logos, no music, slow and meditative, 8 seconds.`

### 🎬 Shot 12: Chạm đất & Tái sinh thành hộp sọ nguyên bản (Return & Loop - Anchor 6)
- **Đầu vào:** `runs/natural-cycle-v2/media/anchors/scene_10_skull_return.jpg`
- **Tên file xuất:** `runs/natural-cycle-v2/media/shot_12.mp4`
- **Mô tả hành động:** Quả đầu lâu chạm xuống điểm giữa màn hình, các tán cây mờ dần biến mất, trả lại không gian trắng xóa chỉ còn đúng hộp sọ lông vũ nguyên bản ban đầu, khép lại vòng tuần hoàn bất tận.
- **Prompt Veo:**
  > `Centered eye-level cinematic shot. The falling skull fruit settles perfectly into the center of the frame as all background ground dissolves away into pure white void. The skull fruit stabilizes, identical to the opening original feather skull silhouette, perfectly completing the eternal natural cycle. Final meditative resolution, monochrome black-and-white ink style, pure white background, no color, no text, no logos, no music, slow and meditative, 8 seconds.`
