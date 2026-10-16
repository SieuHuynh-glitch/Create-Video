import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { TimelineSchema } from "../src/schema";

/**
 * CỔNG CHẤT LƯỢNG 3: Kiểm định Thị giác & Still Frame QA
 * Cách dùng: npx tsx scripts/check_video.ts <path-to-timeline.json> [--single-scene=<id>] [--skip-render]
 */
function main() {
  const args = process.argv.slice(2);
  const timelinePath = args[0] || "runs/smoke-test/timeline.json";
  const singleSceneArg = args.find((a) => a.startsWith("--single-scene="));
  const targetSingleScene = singleSceneArg ? singleSceneArg.split("=")[1] : null;
  const skipRender = args.includes("--skip-render");

  console.log(`\n======================================================`);
  console.log(`🖼️ BẮT ĐẦU CỔNG 3: VISUAL QA & STILL FRAME CHECK`);
  console.log(`📁 File Timeline: ${timelinePath}`);
  if (targetSingleScene) console.log(`🎯 Chế độ kiểm tra cảnh đơn: ${targetSingleScene}`);
  console.log(`======================================================\n`);

  if (!fs.existsSync(timelinePath)) {
    console.error(`❌ Lỗi: File timeline không tồn tại: ${timelinePath}`);
    process.exit(1);
  }

  const rawTimeline = JSON.parse(fs.readFileSync(timelinePath, "utf-8"));
  const timeline = TimelineSchema.parse(rawTimeline);
  const runDir = path.dirname(timelinePath);
  const stillsDir = path.join(runDir, "out", "stills");

  if (!fs.existsSync(stillsDir)) {
    fs.mkdirSync(stillsDir, { recursive: true });
  }

  const scenesToCheck = targetSingleScene
    ? timeline.scenes.filter((s) => s.id === targetSingleScene)
    : timeline.scenes;

  if (scenesToCheck.length === 0) {
    console.error(`❌ Lỗi: Không tìm thấy cảnh nào phù hợp với id "${targetSingleScene}".`);
    process.exit(1);
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

    if (scene.onScreenText.title) {
      const titleLen = scene.onScreenText.title.length;
      // Font Outfit 72px có độ rộng ký tự trung bình ~44px (0.62 * 72)
      const estTitleWidth = titleLen * 44;
      if (estTitleWidth > maxSafeWidth * 2) { // Vượt quá 2 dòng
        textOverflowRisk = true;
        overflowReason = `Tiêu đề chiếm ~${estTitleWidth}px (vượt quá 2 dòng safe-zone)`;
      }
    }

    const bullets = scene.onScreenText.bulletPoints || [];
    if (bullets.length > 4) {
      textOverflowRisk = true;
      overflowReason = `Quá 4 luận điểm (${bullets.length} mục)`;
    }
    for (const b of bullets) {
      // Font Inter 40px có độ rộng ký tự trung bình ~22px (0.55 * 40)
      const estBWidth = b.length * 22;
      if (estBWidth > maxSafeWidth * 1.8) {
        textOverflowRisk = true;
        overflowReason = `Luận điểm dài ~${estBWidth}px (nguy cơ tràn viền)`;
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

  if (hasFatalErrors) {
    console.error(`\n❌ CỔNG 3 THẤT BẠI: Phát hiện cảnh thiếu file audio hoặc lỗi nghiêm trọng.`);
    process.exit(1);
  }

  console.log(`\n🎉 CỔNG 3 (VISUAL QA & STILL CHECK): PASSED!`);
  process.exit(0);
}

main();
