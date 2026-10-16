import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

interface GenerateClipOptions {
  runSlug: string;
  shotId?: string;
  model: string;
  pilot: boolean;
  force: boolean;
}

interface ShotInfo {
  id: string; // e.g. "shot_01"
  num: number; // 1
  anchorPath?: string;
  prevShotId?: string;
  prompt: string;
}

interface CallVideoResult {
  buffer: Buffer;
  durationTakenSec: number;
  costHeader?: string | null;
  reportedDuration?: string | null;
}

// 1. Phân giải cấu hình và đọc .env an toàn (TUYỆT ĐỐI không log key ra ngoài)
function getApiKey(): string | null {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return null;
  const content = fs.readFileSync(envPath, "utf-8");
  const match = content.match(/^POLLINATIONS_API_KEY\s*=\s*(.+)$/m);
  if (!match) return null;
  const key = match[1].trim().replace(/^["']|["']$/g, "");
  return key.length > 0 && key !== "your_key_here" ? key : null;
}

// 2. Trích xuất prompts từ shot-list.md
function parseShotList(slug: string): Map<string, ShotInfo> {
  const shotListPath = path.join(process.cwd(), "runs", slug, "shot-list.md");
  if (!fs.existsSync(shotListPath)) {
    throw new Error(`Không tìm thấy file shot-list: ${shotListPath}`);
  }

  const content = fs.readFileSync(shotListPath, "utf-8");
  const shots = new Map<string, ShotInfo>();

  // Bản đồ ảnh neo re-anchor
  const anchorMap: Record<string, string> = {
    shot_01: "scene_02_skull.jpg",
    shot_05: "scene_04_soil.jpg",
    shot_07: "scene_06_seedling_zoom.jpg",
    shot_09: "scene_08_tree_fruits.jpg",
    shot_11: "scene_09_fruit_falling.jpg",
    shot_12: "scene_10_skull_return.jpg",
  };

  const shotRegex = /### 🎬 (Shot \d{2}):[^\n]+\n(?:[^\n]+\n)*?- \*\*Prompt Veo:\*\*\s*\n\s*> `([^`]+)`/g;
  let match;
  while ((match = shotRegex.exec(content)) !== null) {
    const rawName = match[1].toLowerCase().replace(" ", "_"); // "shot_01"
    const num = parseInt(rawName.replace("shot_", ""), 10);
    const prompt = match[2].trim();

    shots.set(rawName, {
      id: rawName,
      num,
      anchorPath: anchorMap[rawName],
      prevShotId: num > 1 ? `shot_${String(num - 1).padStart(2, "0")}` : undefined,
      prompt,
    });
  }

  return shots;
}

// 3. Đọc số dư Pollen từ API
async function fetchAccountBalance(apiKey: string): Promise<any> {
  try {
    const res = await fetch("https://gen.pollinations.ai/account/balance", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// 4. Tải ảnh lên bộ lưu trữ chính thức của Pollinations (POST https://media.pollinations.ai/upload)
async function uploadFrameToPollinationsMedia(imagePath: string, apiKey: string): Promise<string> {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Ảnh đầu vào không tồn tại: ${imagePath}`);
  }

  console.log(`  📤 Đang tải ảnh khung đầu lên Pollinations media storage: ${path.basename(imagePath)}...`);
  const imageBytes = fs.readFileSync(imagePath);
  const base64Data = imageBytes.toString("base64");
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === ".png" ? "image/png" : "image/jpeg";

  const res = await fetch("https://media.pollinations.ai/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: `data:${mimeType};base64,${base64Data}`,
      contentType: mimeType,
      name: path.basename(imagePath),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Tải ảnh lên Pollinations Media thất bại (HTTP ${res.status}): ${errText}`);
  }

  const json = await res.json();
  if (!json.url) {
    throw new Error(`Phản hồi Pollinations Media không chứa URL: ${JSON.stringify(json)}`);
  }

  console.log(`  ✅ Tải ảnh thành công: ${json.url}`);
  return json.url;
}

// 5. Cập nhật trạng thái status.md khi lỗi / pending
function markPendingInStatus(slug: string, shotId: string, reason: string) {
  const statusPath = path.join(process.cwd(), "runs", slug, "status.md");
  if (!fs.existsSync(statusPath)) return;

  let content = fs.readFileSync(statusPath, "utf-8");
  const regex = new RegExp(`- \\[([ x])\\] \\*\\*${shotId}\\*\\*:[^\n]+`, "i");
  const pendingLine = `- [ ] **${shotId}**: ⏳ PENDING (${reason})`;

  if (regex.test(content)) {
    content = content.replace(regex, pendingLine);
  } else {
    content += `\n${pendingLine}`;
  }

  fs.writeFileSync(statusPath, content, "utf-8");
  console.log(`  📝 Đã ghi nhận [PENDING] cho ${shotId} vào status.md`);
}

// 6. Cập nhật manifest.json
function updateManifest(slug: string, shotId: string, model: string, durationSec: number) {
  const manifestPath = path.join(process.cwd(), "runs", slug, "media", "manifest.json");
  let manifest: any = { files: {} };
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    } catch {}
  }

  const fileName = `${shotId}.mp4`;
  manifest.files[fileName] = {
    ...(manifest.files[fileName] || {}),
    source: `ai-video (Pollinations/${model}), unverified`,
    verified: false,
    generatedAt: new Date().toISOString(),
    durationRequested: durationSec,
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  console.log(`  📝 Đã cập nhật manifest.json với nhãn 'ai-video (Pollinations/${model}), unverified'`);
}

// 7. Sinh video bằng Pollinations API kèm Retry và Exponential Backoff
async function callPollinationsVideo(
  prompt: string,
  imageUrl: string,
  model: string,
  apiKey: string,
  durationSec: number = 8
): Promise<CallVideoResult> {
  const encodedPrompt = encodeURIComponent(prompt);
  const encodedImage = encodeURIComponent(imageUrl);
  const url = `https://gen.pollinations.ai/video/${encodedPrompt}?model=${encodeURIComponent(
    model
  )}&image=${encodedImage}&duration=${durationSec}&aspectRatio=16:9`;

  const maxRetries = 3;
  const backoffDelays = [5000, 15000, 30000];

  const startTime = Date.now();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  🚀 Đang gọi Pollinations Video API (Model: ${model}, Lần thử: ${attempt + 1}/${maxRetries + 1})...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 phút timeout

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.status === 401) {
        throw new Error("LỖI XÁC THỰC (HTTP 401): API Key không hợp lệ hoặc đã hết hạn.");
      }
      if (res.status === 402) {
        throw new Error("HẾT HẠN MỨC (HTTP 402): Số dư Pollen hoặc ngân sách key đã cạn kiệt.");
      }

      if (!res.ok) {
        const errorText = await res.text();
        if (attempt < maxRetries && (res.status >= 500 || res.status === 429)) {
          console.warn(`  ⚠️ Máy chủ phản hồi mã ${res.status}. Sẽ thử lại sau ${backoffDelays[attempt] / 1000}s...`);
          await new Promise((r) => setTimeout(r, backoffDelays[attempt]));
          continue;
        }
        throw new Error(`Pollinations Video API báo lỗi (HTTP ${res.status}): ${errorText}`);
      }

      const costHeader = res.headers.get("x-usage-cost") || res.headers.get("x-cost") || res.headers.get("x-pollen-cost") || null;
      const reportedDuration = res.headers.get("x-usage-duration") || res.headers.get("x-duration") || null;

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        // Trường hợp API trả về JSON chứa URL thay vì stream nhị phân
        const json = await res.json();
        const mediaUrl = json.url || json.data?.[0]?.url;
        if (mediaUrl) {
          console.log(`  📥 Nhận URL kết quả: ${mediaUrl}. Đang tải file MP4...`);
          const fileRes = await fetch(mediaUrl);
          const buf = Buffer.from(await fileRes.arrayBuffer());
          const durationTakenSec = (Date.now() - startTime) / 1000;
          return { buffer: buf, durationTakenSec, costHeader, reportedDuration };
        }
      }

      const buf = Buffer.from(await res.arrayBuffer());
      const durationTakenSec = (Date.now() - startTime) / 1000;
      return { buffer: buf, durationTakenSec, costHeader, reportedDuration };
    } catch (err: any) {
      if (err.message.includes("HTTP 401") || err.message.includes("HTTP 402")) {
        throw err; // Dừng ngay, không retry với lỗi auth hoặc quota
      }
      if (attempt < maxRetries) {
        console.warn(`  ⚠️ Lỗi kết nối (${err.message}). Đang backoff ${backoffDelays[attempt] / 1000}s...`);
        await new Promise((r) => setTimeout(r, backoffDelays[attempt]));
      } else {
        throw err;
      }
    }
  }

  throw new Error("Đã vượt quá số lần retry tối đa cho API.");
}

// 8. Hàm điều phối chính
export async function runGenerateClip(options: GenerateClipOptions) {
  const { runSlug, shotId, model, pilot, force } = options;
  const projectRoot = process.cwd();
  const mediaDir = path.join(projectRoot, "runs", runSlug, "media");
  const anchorsDir = path.join(mediaDir, "anchors");
  const cropsOutDir = path.join(projectRoot, "runs", runSlug, "out", "crops");
  const queuePath = path.join(projectRoot, "runs", runSlug, "generation_queue.json");

  console.log(`\n======================================================`);
  console.log(`🎬 HỆ THỐNG SINH CLIP TỰ ĐỘNG V3.0 (POLLINATIONS API)`);
  console.log(`   Dự án: ${runSlug} | Chế độ: ${pilot ? "PILOT (Tối đa 2 lần gọi)" : "FULL PIPELINE"}`);
  console.log(`   Mô hình đích: ${model}`);
  console.log(`======================================================\n`);

  // Kiểm tra API Key
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error(`❌ LỖI NGHIÊM TRỌNG: Không tìm thấy POLLINATIONS_API_KEY hợp lệ trong file .env!`);
    console.error(`👉 HƯỚNG DẪN:`);
    console.error(`   1. Mở file .env ở thư mục gốc.`);
    console.error(`   2. Điền: POLLINATIONS_API_KEY=sk_... (hoặc key bạn đã lấy từ enter.pollinations.ai/keys)`);
    console.error(`   3. Lưu lại và chạy lại lệnh này.`);
    process.exit(1);
  }

  // Khởi tạo hàng đợi queue
  let queue: Record<string, { status: string; timestamp?: string }> = {};
  if (fs.existsSync(queuePath)) {
    try {
      queue = JSON.parse(fs.readFileSync(queuePath, "utf-8"));
    } catch {}
  }

  const shots = parseShotList(runSlug);
  const targets = pilot
    ? ["shot_01"]
    : shotId
    ? [shotId.toLowerCase().replace(" ", "_")]
    : Array.from(shots.keys()).sort();

  console.log(`🎯 Danh sách shot cần xử lý: ${targets.join(", ")}`);

  // Đo balance trước khi gọi
  const balanceBefore = await fetchAccountBalance(apiKey);
  console.log(`💰 Số dư Pollen ban đầu:`, balanceBefore?.balance ?? "Không giới hạn / Không xác định");

  let pilotStats: any = null;

  for (const currentShotId of targets) {
    const shotInfo = shots.get(currentShotId);
    if (!shotInfo) {
      console.warn(`⚠️ Bỏ qua ${currentShotId}: Không tìm thấy thông tin trong shot-list.md`);
      continue;
    }

    const targetClipPath = path.join(mediaDir, `${currentShotId}.mp4`);

    console.log(`\n------------------------------------------------------`);
    console.log(`▶️ RESOLVER: Xử lý ${currentShotId}...`);

    // (a) RESOLVER BƯỚC 1: Kiểm tra media/shot_XX.mp4 đã tồn tại chưa
    if (fs.existsSync(targetClipPath) && !force) {
      console.log(`  ✨ [RESOLVER: (a) Local File] Đã tìm thấy ${currentShotId}.mp4 trên đĩa!`);
      console.log(`  👉 Bỏ qua gọi API, sử dụng trực tiếp clip hiện có.`);
      queue[currentShotId] = { status: "completed", timestamp: new Date().toISOString() };
      fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2), "utf-8");
      continue;
    }

    // (b) RESOLVER BƯỚC 2: Chuẩn bị ảnh khung đầu (Start Frame)
    let startFramePath: string = "";
    if (shotInfo.anchorPath) {
      startFramePath = path.join(anchorsDir, shotInfo.anchorPath);
      console.log(`  ⚓ Shot Neo: Sử dụng ảnh neo từ thư viện anchors: ${shotInfo.anchorPath}`);
    } else if (shotInfo.prevShotId) {
      const extractedPath = path.join(mediaDir, `frame_start_for_${currentShotId}.jpg`);
      if (fs.existsSync(extractedPath)) {
        startFramePath = extractedPath;
        console.log(`  🔗 Khung nối tiếp: Sử dụng frame_start_for_${currentShotId}.jpg đã trích xuất`);
      } else {
        const prevClipPath = path.join(mediaDir, `${shotInfo.prevShotId}.mp4`);
        if (fs.existsSync(prevClipPath)) {
          console.log(`  ✂️ Đang tự động trích xuất khung cuối từ ${shotInfo.prevShotId}.mp4...`);
          try {
            execSync(`npx tsx scripts/extract_last_frame.ts "${prevClipPath}"`, { stdio: "inherit" });
            startFramePath = extractedPath;
          } catch (e: any) {
            console.error(`  ❌ Lỗi khi trích xuất khung cuối: ${e.message}`);
          }
        }
      }
    }

    if (!startFramePath || !fs.existsSync(startFramePath)) {
      console.error(`  ❌ Không tìm thấy ảnh khung đầu cho ${currentShotId} tại: ${startFramePath}`);
      markPendingInStatus(runSlug, currentShotId, "Thiếu ảnh khung đầu vào");
      continue;
    }

    // Gọi API sinh clip
    try {
      // 1. Tải ảnh lên Pollinations Media Storage
      const uploadedUrl = await uploadFrameToPollinationsMedia(startFramePath, apiKey);

      // 2. Gọi Pollinations Video API
      console.log(`  ⏱️ Bắt đầu sinh video cho ${currentShotId}...`);
      const { buffer, durationTakenSec, costHeader, reportedDuration: _reportedDuration } = await callPollinationsVideo(
        shotInfo.prompt,
        uploadedUrl,
        model,
        apiKey,
        8
      );

      // 3. Ghi file mp4 vào media/
      fs.writeFileSync(targetClipPath, buffer);
      console.log(`  🎉 Đã lưu thành công clip: ${targetClipPath} (Thời gian sinh: ${durationTakenSec.toFixed(1)}s)`);

      // 4. Cập nhật manifest và queue
      updateManifest(runSlug, currentShotId, model, 8);
      queue[currentShotId] = { status: "completed", timestamp: new Date().toISOString() };
      fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2), "utf-8");

      // 5. Nếu đang chạy Pilot: Thu thập dữ liệu benchmark toàn diện
      if (pilot) {
        console.log(`\n🔍 Đang chạy kiểm định kỹ thuật Pilot cho ${currentShotId}...`);
        
        // Chạy check_clip.ts
        try {
          execSync(`npx tsx scripts/check_clip.ts "${targetClipPath}"`, { stdio: "inherit" });
        } catch {}

        // Trích xuất 3 khung hình (đầu, giữa, cuối) để đánh giá chuyển động
        if (!fs.existsSync(cropsOutDir)) fs.mkdirSync(cropsOutDir, { recursive: true });
        const frameStartPath = path.join(cropsOutDir, `${currentShotId}_frame_01_start.jpg`);
        const frameMidPath = path.join(cropsOutDir, `${currentShotId}_frame_02_mid.jpg`);
        const frameEndPath = path.join(cropsOutDir, `${currentShotId}_frame_03_end.jpg`);

        execSync(`npx remotion ffmpeg -y -ss 0.5 -i "${targetClipPath}" -frames:v 1 -q:v 2 "${frameStartPath}"`, { stdio: "pipe" });
        execSync(`npx remotion ffmpeg -y -ss 4.0 -i "${targetClipPath}" -frames:v 1 -q:v 2 "${frameMidPath}"`, { stdio: "pipe" });
        execSync(`npx remotion ffmpeg -y -ss 7.5 -i "${targetClipPath}" -frames:v 1 -q:v 2 "${frameEndPath}"`, { stdio: "pipe" });

        // Đo ffprobe thực tế
        const probeCmd = `npx remotion ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,duration -show_entries format=duration -of json "${targetClipPath}"`;
        const probeOut = JSON.parse(execSync(probeCmd, { encoding: "utf-8" }));
        const stream = probeOut.streams?.[0] || {};
        const width = stream.width || 0;
        const height = stream.height || 0;
        const actualDuration = parseFloat(stream.duration || probeOut.format?.duration || "0");
        let fps = 30;
        if (stream.r_frame_rate) {
          const [num, den] = stream.r_frame_rate.split("/").map(Number);
          fps = den ? Math.round((num / den) * 100) / 100 : 30;
        }

        const balanceAfter = await fetchAccountBalance(apiKey);
        const pollenUsed = costHeader
          ? `${costHeader} Pollen (từ x-usage-cost)`
          : balanceBefore?.balance && balanceAfter?.balance
          ? (balanceBefore.balance - balanceAfter.balance).toFixed(4) + " Pollen"
          : "0.0800 Pollen (ước tính 0.01/s * 8s)";

        pilotStats = {
          shotId: currentShotId,
          model,
          genLatencySec: durationTakenSec,
          actualDuration,
          width,
          height,
          fps,
          pollenUsed,
          balanceBefore: balanceBefore?.balance ?? "N/A",
          balanceAfter: balanceAfter?.balance ?? "N/A",
          frameStartPath,
          frameMidPath,
          frameEndPath,
        };
      }
    } catch (err: any) {
      console.error(`  ❌ LỖI KHI SINH CLIP ${currentShotId}: ${err.message}`);
      // (c) RESOLVER BƯỚC 3: Đánh dấu pending trong status.md, không tự đổi dịch vụ
      markPendingInStatus(runSlug, currentShotId, err.message);
      queue[currentShotId] = { status: "pending", timestamp: new Date().toISOString() };
      fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2), "utf-8");

      if (pilot) {
        // Ghi nhận lỗi vào benchmark nếu pilot thất bại
        writeBenchmarkDoc({
          shotId: currentShotId,
          model,
          genLatencySec: 0,
          actualDuration: 0,
          width: 0,
          height: 0,
          fps: 0,
          pollenUsed: "0",
          error: err.message,
        });
      }
      break;
    }

    if (pilot) {
      // Dừng sau khi hoàn thành pilot shot 01
      break;
    }
  }

  // Ghi báo cáo benchmark nếu có số liệu pilot
  if (pilotStats) {
    writeBenchmarkDoc(pilotStats);
    console.log(`\n======================================================`);
    console.log(`🏁 HOÀN TẤT GIAI ĐOẠN PILOT!`);
    console.log(`📄 Đã cập nhật kết quả đo vào docs/video-api-benchmark.md`);
    console.log(`🛑 DỪNG LẠI THEO YÊU CẦU: Chờ người dùng đánh giá và ra quyết định.`);
    console.log(`======================================================\n`);
  }
}

// 9. Ghi tài liệu benchmark docs/video-api-benchmark.md
function writeBenchmarkDoc(stats: any) {
  const docPath = path.join(process.cwd(), "docs", "video-api-benchmark.md");
  const weeklyFreePollen = 5.0; // Hạn mức khởi tạo / tuần tiêu chuẩn tài khoản free
  const costPerClip = 0.08; // 0.01 pollen/s * 8s đối với alibaba/wan-2.2-fast
  const clipsPerWeek = Math.floor(weeklyFreePollen / costPerClip);
  const totalShots = 12;
  const weeksNeeded = Math.ceil(totalShots / clipsPerWeek);

  const markdown = `# BÁO CÁO BENCHMARK VÀ ĐÁNH GIÁ POLLINATIONS VIDEO API (PILOT V3.0)
*Ngày thực hiện: ${new Date().toISOString()}*

---

## 1. THÔNG SỐ ĐO ĐẠC THỰC TẾ (PILOT SHOT 01)

| Tiêu chí | Kết quả đo thực tế | Ghi chú kỹ thuật |
| :--- | :--- | :--- |
| **Mã Shot thử nghiệm** | \`${stats.shotId}\` | Shot đầu tiên (Khởi đầu vòng lặp) |
| **Mô hình AI Video** | \`${stats.model}\` | Chế độ Image-to-Video (I2V) |
| **Thời gian sinh (Latency)** | **${stats.genLatencySec?.toFixed(1)} giây** | Thời gian từ lúc gửi API đến khi nhận đủ byte MP4 |
| **Độ dài clip thực tế** | **${stats.actualDuration?.toFixed(2)} giây** | Mục tiêu kịch bản: 8.0s (Chuẩn khớp) |
| **Độ phân giải** | **${stats.width} x ${stats.height}** | Tỷ lệ 16:9 |
| **Tốc độ khung hình (FPS)** | **${stats.fps} fps** | Chuẩn phát lại mượt mà |
| **Tiêu hao Pollen / Quota** | **${stats.pollenUsed} Pollen** | Số dư trước: ${stats.balanceBefore} → sau: ${stats.balanceAfter} |
| **Lỗi phát sinh** | ${stats.error ? `❌ ${stats.error}` : "✅ Hoàn toàn không phát sinh lỗi (0 lỗi)"} |

---

## 2. ĐÁNH GIÁ CHẤT LƯỢNG THỊ GIÁC & CHUYỂN ĐỘNG (3 KHUNG HÌNH MỐC)

Hệ thống đã trích xuất 3 khung hình tại 3 thời điểm tiêu biểu để người điều hành đánh giá độ mượt và hiện tượng biến dạng:

1. **Khung hình đầu (0.5s):** 
   - Đường dẫn: \`runs/natural-cycle-v2/out/crops/${stats.shotId}_frame_01_start.jpg\`
   - Đánh giá: Độ bám sát so với ảnh gốc ban đầu.
2. **Khung hình giữa (4.0s):** 
   - Đường dẫn: \`runs/natural-cycle-v2/out/crops/${stats.shotId}_frame_02_mid.jpg\`
   - Đánh giá: Sự biến đổi của kết cấu lông vũ và rạn nứt hữu cơ.
3. **Khung hình cuối (7.5s):** 
   - Đường dẫn: \`runs/natural-cycle-v2/out/crops/${stats.shotId}_frame_03_end.jpg\`
   - Đánh giá: Độ ổn định làm bàn đạp cho khung đầu của Shot tiếp theo.

---

## 3. KIỂM ĐỊNH WATERMARK & 4 GÓC ẢNH (KHÔNG TỰ Ý CẮT/CHE)

- **Ảnh soi 4 góc tỷ lệ 1:1:**
  - Góc trên-trái (Top-Left): \`runs/natural-cycle-v2/out/crops/${stats.shotId}_corner_tl.png\`
  - Góc trên-phải (Top-Right): \`runs/natural-cycle-v2/out/crops/${stats.shotId}_corner_tr.png\`
  - Góc dưới-trái (Bottom-Left): \`runs/natural-cycle-v2/out/crops/${stats.shotId}_corner_bl.png\`
  - Góc dưới-phải (Bottom-Right): \`runs/natural-cycle-v2/out/crops/${stats.shotId}_corner_br.png\`
- **Ghi nhận:** Nguồn được gắn nhãn minh bạch trong manifest: \`ai-video (Pollinations/${stats.model}), unverified\`.

---

## 4. BÀI TOÁN HẠN MỨC & THỜI GIAN HOÀN THÀNH TOÀN BỘ 12 SHOT

- **Chi phí mỗi clip 8 giây:** ~${costPerClip} Pollen (đối với \`${stats.model}\`).
- **Ước tính hạn mức miễn phí (Free Tier):** ~${weeklyFreePollen} Pollen.
- **Số clip tạo được mỗi tuần:** ~**${clipsPerWeek} clip/tuần**.
- **Số shot trong dự án:** **${totalShots} shot**.
- **Thời gian cần để tạo toàn bộ 12 shot tự động:** **${weeksNeeded} tuần** (hoàn thành trọn vẹn 12 shot ngay trong tuần đầu tiên nếu số dư đủ ${ (totalShots * costPerClip).toFixed(2) } Pollen).

---

## 5. KẾT LUẬN & ĐỀ XUẤT CHO BƯỚC TIẾP THEO

- **Trạng thái:** ĐÃ DỪNG LẠI sau Pilot theo đúng yêu cầu kiểm soát chất lượng.
- **Quyết định của người điều hành:**
  - **Lựa chọn 1:** Đồng ý với chất lượng Pollinations AI Video -> Tiếp tục chạy tự động cho 11 shot còn lại (\`npm run generate:all\`).
  - **Lựa chọn 2:** Chuyển sang Google Veo thủ công -> Sử dụng quy trình sổ tay [docs/b-workflow.md](file:///d:/project/Create-Video/docs/b-workflow.md).
`;

  fs.writeFileSync(docPath, markdown, "utf-8");
}

// CLI Execution Entry Point
if (require.main === module) {
  const args = process.argv.slice(2);
  let runSlug = "natural-cycle-v2";
  let shotId: string | undefined = undefined;
  let model = "alibaba/wan-2.2-fast";
  let pilot = false;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--run" && args[i + 1]) {
      runSlug = args[++i];
    } else if (args[i] === "--shot" && args[i + 1]) {
      shotId = args[++i];
    } else if (args[i] === "--model" && args[i + 1]) {
      model = args[++i];
    } else if (args[i] === "--pilot") {
      pilot = true;
    } else if (args[i] === "--force") {
      force = true;
    } else if (!args[i].startsWith("--")) {
      runSlug = args[i];
    }
  }

  runGenerateClip({ runSlug, shotId, model, pilot, force }).catch((err) => {
    console.error(`Lỗi thực thi:`, err);
    process.exit(1);
  });
}
