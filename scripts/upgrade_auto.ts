import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { TimelineSchema } from "../src/schema";

export function upgradeVideo(slug: string) {
  console.log(`\n======================================================`);
  console.log(`🚀 NÂNG CẤP VIDEO VỚI CLIP AI HOÀN THÀNH (AUTO UPGRADE)`);
  console.log(`📁 Slug: ${slug}`);
  console.log(`======================================================\n`);

  const doneDir = path.join("jobs", "done", slug);
  const runDir = path.join("runs", slug);
  const mediaDir = path.join(runDir, "media");
  const timelinePath = path.join(runDir, "timeline.json");

  if (!fs.existsSync(doneDir)) {
    console.log(`ℹ️ Thư mục ${doneDir}/ chưa tồn tại (chưa có clip AI nào hoàn thành).`);
    return false;
  }

  const doneClips = fs
    .readdirSync(doneDir)
    .filter((f) => f.endsWith(".mp4") && !f.endsWith(".tmp.mp4"));

  if (doneClips.length === 0) {
    console.log(`ℹ️ Chưa có clip AI nào hoàn thành trong ${doneDir}/.`);
    return false;
  }

  console.log(`🎬 Phát hiện ${doneClips.length} clip AI đã hoàn thành:`, doneClips);

  if (!fs.existsSync(timelinePath)) {
    console.error(`❌ Không tìm thấy timeline.json: ${timelinePath}`);
    return false;
  }

  const rawTimeline = JSON.parse(fs.readFileSync(timelinePath, "utf-8"));
  const timeline = TimelineSchema.parse(rawTimeline);

  let upgradedCount = 0;

  for (const clipFile of doneClips) {
    const shotId = path.basename(clipFile, ".mp4");
    const rawAiClipPath = path.join(doneDir, clipFile);
    const upscaledDestPath = path.join(mediaDir, `${shotId}.mp4`);

    // 1. Kiểm tra hoặc thực hiện Pre-Upscale bằng FFmpeg (Lanczos + Unsharp -> 1920x1080 @ 30fps)
    if (!fs.existsSync(upscaledDestPath) || fs.statSync(upscaledDestPath).size < 1024) {
      console.log(`\n📐 Đang nâng cấp độ phân giải cho [${shotId}]: 704x384 (24fps) -> 1920x1080 (30fps)...`);
      const upscaleCmd = `npx remotion ffmpeg -i "${rawAiClipPath}" -vf "scale=1920:1080:flags=lanczos,unsharp=5:5:0.8:5:5:0.0,fps=30" -c:v libx264 -pix_fmt yuv420p -crf 18 -preset fast "${upscaledDestPath}" -y`;
      try {
        execSync(upscaleCmd, { stdio: "pipe" });
        console.log(`   ✅ Đã upscale thành công: ${upscaledDestPath}`);
      } catch (err: any) {
        console.error(`   ❌ Lỗi khi upscale clip ${rawAiClipPath}:`, err.message);
        continue;
      }
    }

    // 2. Cập nhật scene trong timeline
    const targetScene = timeline.scenes.find((s) => s.id === shotId);
    if (targetScene) {
      targetScene.type = "video";
      targetScene.visual = {
        ...(targetScene.visual || {}),
        type: "video",
        file: `runs/${slug}/media/${shotId}.mp4`,
        source: "ai",
        license: "ai-generated, unverified",
        attribution: "Lightricks/LTX-Video on Colab T4",
        fitMode: "cover",
        focalPoint: targetScene.visual?.focalPoint || "center",
      };
      upgradedCount++;
      console.log(`   ✨ Đã chuyển [${shotId}] sang VideoScene AI (Tầng 2)`);
    }
  }

  if (upgradedCount > 0) {
    fs.writeFileSync(timelinePath, JSON.stringify(timeline, null, 2), "utf-8");
    console.log(`\n💾 Đã lưu timeline cập nhật với ${upgradedCount} clip AI vào: ${timelinePath}`);

    // Re-render Video
    console.log(`\n🔄 Bắt đầu Render lại Video với các clip AI nâng cấp...`);
    try {
      execSync(`npx tsx scripts/render_video.ts "${slug}"`, { stdio: "inherit" });
    } catch (rErr: any) {
      console.error(`❌ Lỗi render sau nâng cấp:`, rErr.message);
      return false;
    }

    // Chạy lại QA
    console.log(`\n🔍 Chạy lại QA kiểm định...`);
    try {
      execSync(`npx tsx scripts/check_media.ts "${timelinePath}"`, { stdio: "inherit" });
      execSync(`npx tsx scripts/check_video.ts "${timelinePath}" --skip-render`, { stdio: "inherit" });
      execSync(`npx tsx scripts/check_audio.ts "${slug}"`, { stdio: "inherit" });
    } catch (qaErr: any) {
      console.warn(`⚠️ Cảnh báo QA sau nâng cấp:`, qaErr.message);
    }

    console.log(`\n🎉 NÂNG CẤP HOÀN TẤT VỚI ${upgradedCount} CLIP AI!`);
    return true;
  } else {
    console.log(`ℹ️ Không có shot nào cần cập nhật.`);
    return false;
  }
}

// Chạy trực tiếp từ CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const slug = args[0] || "natural-cycle-v2";
  upgradeVideo(slug);
}
