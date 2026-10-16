import fs from "fs";
import path from "path";
import { StoryboardSchema } from "../src/schema";

/**
 * TẠO SEED CỐ ĐỊNH THEO DỰ ÁN VÀ CẢNH (HOẶC NGẪU NHIÊN KHI BẬT --force)
 */
function generateSceneSeed(slug: string, sceneId: string, force: boolean): number {
  if (force) {
    return Math.floor(Math.random() * 1000000);
  }
  let hash = 0;
  const str = `${slug}_${sceneId}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 1000000;
}

/**
 * LỌC SẠCH CÁC THAM SỐ MIDJOURNEY (--ar, --v, --style...) ĐỂ TRÁNH POLLINATIONS FLUX.1 VẼ CHỮ RÁC
 */
function cleanPromptForPollinations(prompt: string): string {
  return prompt
    .replace(/--[a-zA-Z0-9_-]+(\s+[^\s,]+)?/g, "") // Xóa sạch --ar 16:9, --v 6.0, --style raw...
    .replace(/\b16:9\s*(aspect\s*ratio)?\b/gi, "") // Xóa chữ 16:9 vì đã quy định qua URL query
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * TẢI ẢNH TỰ ĐỘNG QUA POLLINATIONS.AI
 * - Kiểm tra Content-Type bắt buộc là image/*
 * - Kiểm tra dung lượng buffer > 30_000 bytes (chống file HTML lỗi của Cloudflare)
 * - Timeout 45.000ms cho mô hình FLUX.1
 */
async function downloadPollinationsImage(
  prompt: string,
  outputPath: string,
  seed: number,
  width = 1920,
  height = 1080,
  model = "flux"
): Promise<boolean> {
  const cleanPrompt = cleanPromptForPollinations(prompt);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=${width}&height=${height}&model=${model}&seed=${seed}&nologo=true&enhance=true`;

  console.log(`   🌐 Đang kết nối Pollinations.ai (${model}, seed=${seed})...`);

  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 giây timeout

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "RemotionVideoFactory/2.3",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.toLowerCase().startsWith("image/")) {
        throw new Error(`Phản hồi không phải là ảnh hợp lệ (Content-Type: ${contentType}). Có thể là trang HTML lỗi Cloudflare.`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length < 30000) {
        throw new Error(`File ảnh quá nhỏ (${buffer.length} bytes < 30KB). Có thể bị lỗi hoặc hỏng.`);
      }

      fs.writeFileSync(outputPath, buffer);
      console.log(`   ✅ Tải thành công: ${(buffer.length / 1024).toFixed(1)} KB -> ${outputPath}`);
      return true;
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err.name === "AbortError";
      console.warn(`   ⚠️ Lần thử ${attempt}/2 thất bại:`, isAbort ? "Request timeout sau 45s" : err.message);
      if (attempt < 2) {
        await new Promise((res) => setTimeout(res, 3000));
      }
    }
  }

  return false;
}

/**
 * TỰ ĐỘNG SINH & TẢI MEDIA CHO TOÀN BỘ CẢNH TRONG STORYBOARD (ZERO-TOUCH)
 * Cách dùng: npx tsx scripts/fetch_ai_media.ts <storyboard.json> [--force] [--model=flux]
 */
async function main() {
  const args = process.argv.slice(2);
  const storyboardPath = args[0] || "runs/media-smoke-test/storyboard.json";
  const force = args.includes("--force");
  const modelArg = args.find((a) => a.startsWith("--model="));
  const model = modelArg ? modelArg.split("=")[1] : "flux";

  console.log(`\n======================================================`);
  console.log(`🎨 BẮT ĐẦU TỰ ĐỘNG HÓA SINH MEDIA (HYBRID ZERO-TOUCH V2.3)`);
  console.log(`📁 Storyboard: ${storyboardPath}`);
  console.log(`🤖 AI Engine: Pollinations.ai (${model}) - 100% Free / 0-Key`);
  console.log(`♻️ Ép tải lại (--force): ${force ? "BẬT" : "TẮT"}`);
  console.log(`======================================================\n`);

  if (!fs.existsSync(storyboardPath)) {
    console.error(`❌ Lỗi: File storyboard không tồn tại: ${storyboardPath}`);
    process.exit(1);
  }

  const rawStoryboard = JSON.parse(fs.readFileSync(storyboardPath, "utf-8"));
  const storyboard = StoryboardSchema.parse(rawStoryboard);
  const slug = storyboard.slug || path.basename(path.dirname(storyboardPath));

  const runDir = path.dirname(storyboardPath);
  const mediaDir = path.join(runDir, "media");

  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }

  let fetchedCount = 0;
  let skippedCount = 0;
  let fallbackCount = 0;
  let updatedStoryboard = false;

  for (let idx = 0; idx < storyboard.scenes.length; idx++) {
    const scene = storyboard.scenes[idx];

    // XỬ LÝ ĐẶC BIỆT: CẢNH VIDEOSCENE TRONG QUY TRÌNH ZERO-TOUCH
    // Nếu cảnh là video nhưng chưa có file clip MP4 sẵn trong media/ -> Tự động Fallback sang ImageScene (Ken Burns Pan/Zoom)
    const isVideoType = scene.type === "video" || scene.visual?.type === "video";
    if (isVideoType) {
      const candidateMp4Name = scene.visual?.file ? path.basename(scene.visual.file) : `${scene.id}.mp4`;
      const candidateMp4Path = path.join(mediaDir, candidateMp4Name);
      const hasExistingClip = fs.existsSync(candidateMp4Path) && fs.statSync(candidateMp4Path).size > 100000;

      if (!hasExistingClip) {
        console.log(`\n🔄 [${scene.id}] Cảnh dạng Video nhưng chưa có clip MP4.`);
        console.log(`   👉 Kích hoạt Zero-Touch Fallback: Chuyển sang ImageScene (Ken Burns Pan/Zoom) với ảnh FLUX.1.`);
        scene.type = "image";
        if (!scene.visual) {
          scene.visual = { type: "image", fitMode: "cover", focalPoint: "center" };
        } else {
          scene.visual.type = "image";
          scene.visual.fitMode = "cover";
        }
        updatedStoryboard = true;
        fallbackCount++;
      }
    }

    // XỬ LÝ TẤT CẢ CẢNH DẠNG "image"
    if (scene.type === "image" || scene.visual?.type === "image") {
      if (!scene.visual) {
        scene.visual = { type: "image", fitMode: "cover", focalPoint: "center" };
      }

      const fileName = scene.visual.file ? path.basename(scene.visual.file).replace(/\.mp4$/, ".jpg") : `${scene.id}.jpg`;
      const fullMediaPath = path.join(mediaDir, fileName);
      const relativeMediaPath = path.posix.join("media", fileName);

      if (!force && fs.existsSync(fullMediaPath) && fs.statSync(fullMediaPath).size > 30000) {
        console.log(`⏭️ [${scene.id}] Đã có file media đạt chuẩn (>30KB), bỏ qua: ${fileName}`);
        skippedCount++;
        continue;
      }

      // Xây dựng prompt: Ưu tiên visual.prompt, nếu thiếu thì tự động tạo từ title + voiceover
      let promptToUse = scene.visual.prompt || "";
      if (!promptToUse || promptToUse.length < 10) {
        const title = scene.onScreenText.title || "";
        const desc = scene.onScreenText.subtitle || scene.voiceoverText || "";
        promptToUse = `Cinematic photograph, 85mm prime lens, high quality, professional lighting, 8k resolution, photorealistic, ${title}, ${desc}`.trim();
      }

      const sceneSeed = generateSceneSeed(slug, scene.id, force);

      console.log(`\n🖼️ [${scene.id}] Đang sinh ảnh: "${cleanPromptForPollinations(promptToUse).slice(0, 75)}..."`);
      const success = await downloadPollinationsImage(promptToUse, fullMediaPath, sceneSeed, 1920, 1080, model);

      if (success) {
        fetchedCount++;
        // Cập nhật metadata bản quyền vào storyboard
        scene.visual.file = relativeMediaPath;
        scene.visual.source = "ai";
        scene.visual.license = "Creative Commons / Free Commercial (Pollinations AI)";
        scene.visual.attribution = `AI Generated with ${model} model`;
        if (!scene.visual.fitMode) {
          scene.visual.fitMode = "cover";
        }
        updatedStoryboard = true;
      } else {
        console.warn(`⚠️ [${scene.id}] Không thể tải ảnh từ AI. Giữ nguyên cấu hình cũ.`);
      }

      // Nghỉ 2.5 giây giữa các lượt tải để ổn định kết nối
      await new Promise((res) => setTimeout(res, 2500));
    }
  }

  // Cập nhật lại storyboard.json nếu có thay đổi metadata hoặc fallback
  if (updatedStoryboard) {
    fs.writeFileSync(storyboardPath, JSON.stringify(storyboard, null, 2), "utf-8");
    console.log(`\n💾 Đã cập nhật đường dẫn & bản quyền media vào: ${storyboardPath}`);
  }

  console.log(`\n======================================================`);
  console.log(`🎉 HOÀN THÀNH TỰ ĐỘNG HÓA SINH MEDIA V2.3:`);
  console.log(`   - Số ảnh tải mới thành công: ${fetchedCount}`);
  console.log(`   - Số ảnh giữ nguyên: ${skippedCount}`);
  console.log(`   - Số cảnh video fallback sang ảnh: ${fallbackCount}`);
  console.log(`   - Thư mục lưu trữ: ${mediaDir}`);
  console.log(`👉 Bạn có thể chạy ngay: npx tsx scripts/check_media.ts "${storyboardPath}" để kiểm định.`);
  console.log(`======================================================\n`);
}

main().catch((err) => {
  console.error("❌ Lỗi nghiêm trọng khi fetch media:", err);
  process.exit(1);
});
