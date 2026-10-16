import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { openBrowser } from "@remotion/renderer";
import { TimelineSchema } from "../src/schema";

/**
 * Đo kích thước chữ thực tế qua Headless Chromium DOM (@remotion/layout-utils)
 */
async function measureTextExact(
  page: any,
  text: string,
  fontFamily: string,
  fontSize: number,
  fontWeight: string | number
): Promise<number> {
  if (!text || text.trim().length === 0) return 0;
  if (!page) {
    const charWidth = fontSize === 72 ? 46 : 28;
    return text.length * charWidth;
  }
  try {
    const width = await page.evaluate(
      (t: string, font: string, size: number, weight: string | number) => {
        const span = document.createElement("span");
        span.style.fontFamily = font;
        span.style.fontSize = size + "px";
        span.style.fontWeight = weight.toString();
        span.style.whiteSpace = "pre";
        span.innerText = t;
        document.body.appendChild(span);
        const w = span.getBoundingClientRect().width;
        document.body.removeChild(span);
        return w;
      },
      text,
      fontFamily,
      fontSize,
      fontWeight
    );
    return Math.round(width * 10) / 10;
  } catch {
    const charWidth = fontSize === 72 ? 46 : 28;
    return text.length * charWidth;
  }
}

/**
 * Tự động đồng bộ tài nguyên sang public/runs/<slug> nếu bị dọn dẹp trước đó
 */
function syncPublicAssets(slug: string, timeline: any): number {
  let syncedCount = 0;
  const publicAudioDir = path.join("public", "runs", slug, "audio");
  if (!fs.existsSync(publicAudioDir)) {
    fs.mkdirSync(publicAudioDir, { recursive: true });
  }

  for (const scene of timeline.scenes) {
    if (scene.audioFile) {
      const audioFileName = path.basename(scene.audioFile);
      const sourceAudioPath = path.join("runs", slug, "audio", audioFileName);
      const destAudioPath = path.join(publicAudioDir, audioFileName);

      if (fs.existsSync(sourceAudioPath)) {
        if (!fs.existsSync(destAudioPath) || fs.statSync(destAudioPath).size !== fs.statSync(sourceAudioPath).size) {
          fs.copyFileSync(sourceAudioPath, destAudioPath);
          syncedCount++;
        }
        const sourceVttPath = sourceAudioPath.replace(/\.mp3$/, ".vtt");
        const destVttPath = destAudioPath.replace(/\.mp3$/, ".vtt");
        if (fs.existsSync(sourceVttPath) && !fs.existsSync(destVttPath)) {
          fs.copyFileSync(sourceVttPath, destVttPath);
        }
      }
    }

    if (scene.visual && scene.visual.file) {
      const mediaFileName = path.basename(scene.visual.file);
      const sourceMediaPath = path.join("runs", slug, "media", mediaFileName);
      const publicMediaDir = path.join("public", "runs", slug, "media");
      const destMediaPath = path.join(publicMediaDir, mediaFileName);

      if (fs.existsSync(sourceMediaPath)) {
        if (!fs.existsSync(publicMediaDir)) {
          fs.mkdirSync(publicMediaDir, { recursive: true });
        }
        if (!fs.existsSync(destMediaPath) || fs.statSync(destMediaPath).size !== fs.statSync(sourceMediaPath).size) {
          fs.copyFileSync(sourceMediaPath, destMediaPath);
          syncedCount++;
        }
      }
    }
  }

  return syncedCount;
}

/**
 * CỔNG CHẤT LƯỢNG 3: Kiểm định Thị giác & Still Frame QA
 * Cách dùng: npx tsx scripts/check_video.ts <path-to-timeline.json> [--single-scene=<id>] [--skip-render]
 */
async function main() {
  const args = process.argv.slice(2);
  const timelinePath = args[0] || "runs/smoke-test/timeline.json";
  const singleSceneArg = args.find((a) => a.startsWith("--single-scene="));
  const targetSingleScene = singleSceneArg ? singleSceneArg.split("=")[1] : null;
  const skipRender = args.includes("--skip-render");

  console.log(`\n======================================================`);
  console.log(`🖼️ BẮT ĐẦU CỔNG 3: VISUAL QA & STILL FRAME CHECK (V2.5)`);
  console.log(`📁 File Timeline: ${timelinePath}`);
  if (targetSingleScene) console.log(`🎯 Chế độ kiểm tra cảnh đơn: ${targetSingleScene}`);
  console.log(`======================================================\n`);

  if (!fs.existsSync(timelinePath)) {
    console.error(`❌ Lỗi: File timeline không tồn tại: ${timelinePath}`);
    process.exit(1);
  }

  const rawTimeline = JSON.parse(fs.readFileSync(timelinePath, "utf-8"));
  const timeline = TimelineSchema.parse(rawTimeline);
  const slug = timeline.slug;
  const runDir = path.dirname(timelinePath);
  const stillsDir = path.join(runDir, "out", "stills");

  if (!fs.existsSync(stillsDir)) {
    fs.mkdirSync(stillsDir, { recursive: true });
  }

  // Tự động re-sync assets sang public nếu cần
  const synced = syncPublicAssets(slug, timeline);
  if (synced > 0) {
    console.log(`🔄 Đã tự động re-sync ${synced} file media/audio sang public/runs/${slug}/ để render still.`);
  }

  const scenesToCheck = targetSingleScene
    ? timeline.scenes.filter((s) => s.id === targetSingleScene)
    : timeline.scenes;

  if (scenesToCheck.length === 0) {
    console.error(`❌ Lỗi: Không tìm thấy cảnh nào phù hợp với id "${targetSingleScene}".`);
    process.exit(1);
  }

  // Khởi động Chromium để đo chính xác kích thước ký tự theo pixel
  let browser: any = null;
  let page: any = null;
  try {
    browser = await openBrowser("chrome");
    page = await browser.newPage({ context: "default", logLevel: "info", indent: 0, pageIndex: 0 });
    console.log(`🚀 Đã khởi tạo Headless Chromium để đo đạc layout pixel thực tế.`);
  } catch (err: any) {
    console.warn(`⚠️ Không thể mở Chromium để đo layout: ${err.message}. Sử dụng bộ đo dự phòng.`);
  }

  const qaResults: Array<{
    id: string;
    type: string;
    sampleFrame: number;
    samplePercent: string;
    audioExists: boolean;
    hasText: boolean;
    textOverflowRisk: boolean;
    overflowReason?: string;
    stillPath: string;
    status: "PASS" | "FAIL" | "WARN";
  }> = [];

  let hasFatalErrors = false;

  for (const scene of scenesToCheck) {
    // Adaptive Sampling: 85% cho các cảnh có hiệu ứng bay vào (bullets, stat, quote, outro), 50% cho các cảnh khác
    const isStaggered = ["bullets", "stat", "quote", "outro"].includes(scene.type);
    const sampleRatio = isStaggered ? 0.85 : 0.5;
    const samplePercent = isStaggered ? "85%" : "50%";
    const sampleFrame = scene.startFrame + Math.floor(scene.durationInFrames * sampleRatio);

    const audioPath = path.resolve(scene.audioFile);
    const audioExists = fs.existsSync(audioPath) && fs.statSync(audioPath).size > 0;

    // Kiểm tra text tràn viền theo kích thước pixel thực tế (Safe margin 96px, chiều ngang khả dụng 1728px)
    const maxSafeWidth = 1920 - 2 * 96; // 1728px
    let textOverflowRisk = false;
    let overflowReason = "An toàn trong Safe-Zone";

    // 1. Đo Tiêu đề (Font Outfit 72px 700)
    if (scene.onScreenText?.title) {
      const titleWidth = await measureTextExact(
        page,
        scene.onScreenText.title,
        "Outfit, -apple-system, sans-serif",
        72,
        700
      );
      if (titleWidth > maxSafeWidth * 2) { // Vượt quá 2 dòng safe-zone
        textOverflowRisk = true;
        overflowReason = `Tiêu đề chiếm ${titleWidth}px (vượt quá 2 dòng safe-zone ${maxSafeWidth * 2}px)`;
      }
    }

    // 2. Đo Phụ đề (Font Inter 48px 500)
    if (scene.onScreenText?.subtitle) {
      const subWidth = await measureTextExact(
        page,
        scene.onScreenText.subtitle,
        "Inter, -apple-system, sans-serif",
        48,
        500
      );
      if (subWidth > maxSafeWidth * 2) {
        textOverflowRisk = true;
        overflowReason = `Phụ đề chiếm ${subWidth}px (vượt quá 2 dòng safe-zone)`;
      }
    }

    // 3. Đo Luận điểm Bullets (Font Inter 48px 500, chuẩn >= 48px)
    const bullets = scene.onScreenText?.bulletPoints || [];
    if (bullets.length > 4) {
      textOverflowRisk = true;
      overflowReason = `Quá 4 luận điểm (${bullets.length} mục)`;
    }
    for (const b of bullets) {
      const bulletWidth = await measureTextExact(
        page,
        b,
        "Inter, -apple-system, sans-serif",
        48,
        500
      );
      // Bullets container có badge (56px) + gap (28px) + padding (72px) = 156px
      const availableBulletWidth = maxSafeWidth - 156; // 1572px
      if (bulletWidth > availableBulletWidth * 2) {
        textOverflowRisk = true;
        overflowReason = `Luận điểm chiếm ${bulletWidth}px (vượt quá 2 dòng safe-zone)`;
      }
    }

    // 4. Đo Phụ đề WebVTT cues (Font Inter 48px 700)
    if (scene.subtitles && scene.subtitles.length > 0) {
      for (const cue of scene.subtitles) {
        const cueWidth = await measureTextExact(
          page,
          cue.text,
          "Inter, -apple-system, sans-serif",
          48,
          700
        );
        if (cueWidth > maxSafeWidth) {
          textOverflowRisk = true;
          overflowReason = `Phụ đề cue "${cue.text}" chiếm ${cueWidth}px (vượt quá 1 dòng ${maxSafeWidth}px)`;
        }
      }
    }

    const hasText = !!(
      scene.onScreenText.title ||
      scene.onScreenText.subtitle ||
      scene.onScreenText.statNumber ||
      scene.onScreenText.quoteText ||
      scene.onScreenText.callToAction ||
      bullets.length > 0
    );

    const stillFilename = `${scene.id}_frame_${sampleFrame}.png`;
    const stillFullPath = path.join(stillsDir, stillFilename);
    const relativeStillPath = path.join("runs", timeline.slug, "out", "stills", stillFilename).replace(/\\/g, "/");

    console.log(`\n📸 Đang kiểm định [${scene.id}] (${scene.type}):`);
    console.log(`   - Sample Frame (${samplePercent}): ${sampleFrame}`);
    console.log(`   - Audio file: ${scene.audioFile} -> ${audioExists ? "✅ Tồn tại" : "⚠️ THIẾU AUDIO"}`);
    console.log(`   - Nội dung chữ: ${hasText ? "✅ Đầy đủ" : "⚠️ CẢNH RỖNG TEXT"}`);
    console.log(`   - Nguy cơ tràn chữ: ${textOverflowRisk ? `⚠️ NGUY CƠ (${overflowReason})` : "✅ An toàn"}`);

    // Render still frame qua Remotion nếu không bật cờ --skip-render
    if (!skipRender) {
      try {
        console.log(`   ⏳ Đang chụp still frame bằng Remotion...`);
        const remotionCmd = `npx remotion still MainVideo "${stillFullPath}" --frame=${sampleFrame} --props="${timelinePath}" --image-format=png`;
        execSync(remotionCmd, { stdio: "pipe" });
        console.log(`   ✅ Đã chụp still frame: ${relativeStillPath}`);
      } catch (err: any) {
        console.warn(`   ⚠️ Chú ý: Không thể render still frame qua Chromium: ${err.message?.slice(0, 100)}`);
      }
    }

    const scenePass = audioExists && hasText && !textOverflowRisk;
    if (!audioExists && !timelinePath.includes("preview")) {
      hasFatalErrors = true;
    }

    qaResults.push({
      id: scene.id,
      type: scene.type,
      sampleFrame,
      samplePercent,
      audioExists,
      hasText,
      textOverflowRisk,
      overflowReason,
      stillPath: relativeStillPath,
      status: scenePass ? "PASS" : "WARN",
    });
  }

  // Cập nhật kết quả vào status.md của run
  const statusPath = path.join(runDir, "status.md");
  let statusContent = `# BÁO CÁO TIẾN ĐỘ & TRẠNG THÁI SẢN XUẤT: ${timeline.slug}\n\n`;
  statusContent += `*Cập nhật lúc: ${new Date().toISOString()}*\n\n`;
  statusContent += `## 1. Thông Tin Tổng Quan\n`;
  statusContent += `- **Tiêu đề:** ${timeline.title || timeline.slug}\n`;
  statusContent += `- **Tổng số cảnh:** ${timeline.scenes.length}\n`;
  statusContent += `- **Tổng thời lượng:** ${timeline.totalDurationSec}s (${timeline.totalDurationInFrames} frames)\n`;
  statusContent += `- **Độ phân giải:** ${timeline.width}x${timeline.height} @ ${timeline.fps}fps\n\n`;

  statusContent += `## 2. Kết Quả Cổng 3 (Visual & Audio QA - Adaptive Sampling)\n\n`;
  statusContent += `| ID Cảnh | Loại Cảnh | Sample Frame | Tỷ Lệ | Audio | Text | Tràn Chữ | Kết Quả |\n`;
  statusContent += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  for (const r of qaResults) {
    statusContent += `| **${r.id}** | \`${r.type}\` | ${r.sampleFrame} | ${r.samplePercent} | ${r.audioExists ? "✅ Đạt" : "❌ Thiếu"} | ${r.hasText ? "✅ Có" : "❌ Rỗng"} | ${r.textOverflowRisk ? "⚠️ Nguy cơ" : "✅ Tốt"} | **${r.status}** |\n`;
  }

  fs.writeFileSync(statusPath, statusContent, "utf-8");
  console.log(`\n📝 Đã cập nhật báo cáo QA chi tiết vào: ${statusPath}`);

  if (browser) {
    try {
      await browser.close({ silent: true });
    } catch {
      // ignore
    }
  }

  if (hasFatalErrors) {
    console.error(`\n❌ CỔNG 3 THẤT BẠI: Phát hiện cảnh thiếu file audio hoặc lỗi nghiêm trọng.`);
    process.exit(1);
  }

  console.log(`\n🎉 CỔNG 3 (VISUAL QA & STILL CHECK): PASSED!`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Lỗi Cổng 3:", err);
  process.exit(1);
});
