import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { TimelineSchema } from "../src/schema";
import { normalizeVisualFile } from "./normalize_visuals";
import { verifyAndRepairShot } from "./check_clip";

export async function upgradeVideo(slug: string): Promise<boolean> {
  console.log(`\n======================================================`);
  console.log(`🚀 NÂNG CẤP VIDEO VỚI CLIP AI HOÀN THÀNH (AUTO UPGRADE V4.1)`);
  console.log(`📁 Slug: ${slug}`);
  console.log(`🛡️ Chế độ: Hạ tầng cục bộ theo từng shot (Per-Shot Granular Fallback)`);
  console.log(`======================================================\n`);

  const doneDir = path.join("jobs", "done", slug);
  const failedDir = path.join("jobs", "failed", slug);
  const runDir = path.join("runs", slug);
  const mediaDir = path.join(runDir, "media");
  const cropsDir = path.join(runDir, "out", "crops");
  const timelinePath = path.join(runDir, "timeline.json");
  const manifestPath = path.join(runDir, "manifest.json");

  if (!fs.existsSync(timelinePath)) {
    console.error(`❌ Không tìm thấy timeline.json: ${timelinePath}`);
    return false;
  }

  // Đọc Visual DNA từ manifest nếu có
  let visualDNA: "HIGH_KEY_MONOCHROME_WHITE_BG" | "COLOR_DYNAMIC" = "HIGH_KEY_MONOCHROME_WHITE_BG";
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      if (manifest.visualDNA?.type) {
        visualDNA = manifest.visualDNA.type;
      }
    } catch {}
  }

  const rawTimeline = JSON.parse(fs.readFileSync(timelinePath, "utf-8"));
  const timeline = TimelineSchema.parse(rawTimeline);

  const doneClips = fs.existsSync(doneDir)
    ? fs.readdirSync(doneDir).filter((f) => f.endsWith(".mp4") && !f.includes(".tmp") && !f.includes("_repaired"))
    : [];

  const failedJobs = fs.existsSync(failedDir)
    ? fs.readdirSync(failedDir).filter((f) => f.endsWith(".json"))
    : [];

  if (doneClips.length === 0 && failedJobs.length === 0) {
    console.log(`ℹ️ Chưa có clip AI nào hoàn thành trong ${doneDir}/.`);
    return false;
  }

  console.log(`🎬 Phát hiện ${doneClips.length} clip AI đã hoàn thành và ${failedJobs.length} job thất bại:`, doneClips);

  const shotResults: Record<
    string,
    {
      tier: number;
      type: string;
      status: "UPGRADED" | "REPAIRED" | "FALLBACK_TIER0";
      reason?: string;
      file: string;
    }
  > = {};

  let upgradedCount = 0;
  let fallbackCount = 0;

  // 1. Xử lý các clip đã hoàn thành trong jobs/done/
  for (const clipFile of doneClips) {
    const shotId = path.basename(clipFile, ".mp4");
    const rawAiClipPath = path.join(doneDir, clipFile);
    const upscaledDestPath = path.join(mediaDir, `${shotId}.mp4`);

    const targetScene = timeline.scenes.find((s) => s.id === shotId);
    if (!targetScene) {
      console.warn(`⚠️ Shot ${shotId} không có trong timeline. Bỏ qua.`);
      continue;
    }

    const requiredDurationSec = targetScene.durationSec || (targetScene.durationInFrames / timeline.fps);

    // BƯỚC 2.5: Chuẩn hóa thị giác One-Pass (Lanczos 1080p + 30fps + Colorlevels + Clean Audio)
    console.log(`\n🎨 [BƯỚC 2.5] Chuẩn hóa thị giác One-Pass cho [${shotId}] (DNA: ${visualDNA})...`);
    const normOk = normalizeVisualFile(rawAiClipPath, upscaledDestPath, { visualDNA });
    if (!normOk) {
      console.warn(`   ⚠️ Chuẩn hóa One-Pass thất bại. Kích hoạt Fallback Tier 0 cho riêng [${shotId}].`);
      targetScene.type = "luma-parallax";
      fallbackCount++;
      shotResults[shotId] = {
        tier: 0,
        type: "luma-parallax",
        status: "FALLBACK_TIER0",
        reason: "Lỗi encode FFmpeg One-Pass",
        file: targetScene.visual?.file || "",
      };
      continue;
    }

    // BƯỚC 3: Kiểm định & Tự sửa 2 lần (Motion QA & Freeze Detect)
    const verification = await verifyAndRepairShot(upscaledDestPath, shotId, cropsDir, requiredDurationSec);

    if (verification.verdict === "PASS" || verification.verdict === "REPAIRED") {
      const finalClipFile = verification.repairedPath
        ? path.relative(".", verification.repairedPath).replace(/\\/g, "/")
        : `runs/${slug}/media/${shotId}.mp4`;

      targetScene.type = "video";
      targetScene.visual = {
        ...(targetScene.visual || {}),
        type: "video",
        file: finalClipFile,
        source: "ai",
        license: "ai-generated, unverified",
        attribution: "Lightricks/LTX-Video on Colab T4",
        fitMode: "cover",
        focalPoint: targetScene.visual?.focalPoint || "center",
        cameraEase: verification.cameraEase || targetScene.visual?.cameraEase || "static",
      };

      upgradedCount++;
      shotResults[shotId] = {
        tier: 2,
        type: "video",
        status: verification.verdict === "REPAIRED" ? "REPAIRED" : "UPGRADED",
        file: finalClipFile,
      };
      console.log(`   ✨ [${shotId}] nâng cấp thành công lên Tier 2 AI Video!`);
    } else {
      // HẠ TẦNG CỤC BỘ (CHỈ HẠ RIÊNG SHOT NÀY)
      targetScene.type = "luma-parallax";
      fallbackCount++;
      shotResults[shotId] = {
        tier: 0,
        type: "luma-parallax",
        status: "FALLBACK_TIER0",
        reason: verification.reason || "Không vượt qua Motion QA sau 2 lần tự sửa",
        file: targetScene.visual?.file || "",
      };
      console.log(`   🛡️ [HẠ TẦNG CỤC BỘ] [${shotId}] giữ ở Tier 0 (LumaParallaxScene). Các shot khác không bị ảnh hưởng!`);
    }
  }

  // 2. Xử lý các job thất bại trong jobs/failed/
  for (const failedJobFile of failedJobs) {
    const shotId = path.basename(failedJobFile, ".json");
    const targetScene = timeline.scenes.find((s) => s.id === shotId);
    if (targetScene && !shotResults[shotId]) {
      targetScene.type = "luma-parallax";
      fallbackCount++;
      shotResults[shotId] = {
        tier: 0,
        type: "luma-parallax",
        status: "FALLBACK_TIER0",
        reason: "Job thất bại từ Colab Worker (OOM hoặc quá tải GPU)",
        file: targetScene.visual?.file || "",
      };
      console.log(`   🛡️ [HẠ TẦNG CỤC BỘ] [${shotId}] trong jobs/failed -> fallback Tier 0.`);
    }
  }

  // 3. Lưu timeline cập nhật
  fs.writeFileSync(timelinePath, JSON.stringify(timeline, null, 2), "utf-8");
  console.log(`\n💾 Đã cập nhật Timeline Hybrid (Nâng cấp: ${upgradedCount}, Fallback Tier 0: ${fallbackCount}) vào: ${timelinePath}`);

  // 4. Re-render Video Hybrid (Remotion)
  console.log(`\n🔄 Bắt đầu Render lại Video Hybrid với Remotion...`);
  try {
    execSync(`npx tsx scripts/render_video.ts "${slug}"`, { stdio: "inherit" });
  } catch (rErr: any) {
    console.error(`❌ Lỗi render sau nâng cấp:`, rErr.message);
    return false;
  }

  // 5. Chạy lại QA kiểm định tự động
  console.log(`\n🔍 Chạy lại QA kiểm định sau nâng cấp...`);
  try {
    execSync(`npx tsx scripts/check_media.ts "${timelinePath}"`, { stdio: "inherit" });
    execSync(`npx tsx scripts/check_video.ts "${timelinePath}" --skip-render`, { stdio: "inherit" });
    execSync(`npx tsx scripts/check_audio.ts "runs/${slug}/out/${slug}.mp4"`, { stdio: "inherit" });
  } catch (qaErr: any) {
    console.warn(`⚠️ Cảnh báo QA sau nâng cấp:`, qaErr.message);
  }

  // 6. Cập nhật Báo cáo & status.json
  const outDir = path.join(runDir, "out");
  const reportPath = path.join(outDir, "report.md");
  const rootReportPath = path.join("out", "report.md");
  const statusPath = path.join(outDir, "status.json");

  const tier2Total = timeline.scenes.filter((s) => s.type === "video").length;
  const tier0Total = timeline.scenes.filter((s) => s.type !== "video").length;

  const summaryMarkdown = `
## 2.1. Chi Tiết Nâng Cấp Từng Shot (Per-Shot Hybrid Breakdown - V4.1)
| Shot ID | Tầng Kỹ Thuật | Trạng Thái | Chi Tiết / Lý Do | File Sử Dụng |
| :--- | :--- | :--- | :--- | :--- |
${timeline.scenes
  .map((s) => {
    const res = shotResults[s.id];
    const tierLabel = s.type === "video" ? "**Tier 2 (AI Video)**" : "*Tier 0 (Luma Parallax)*";
    const statusLabel = res?.status || "TIER_0_INITIAL";
    const reasonLabel = res?.reason || "Hoạt động chuẩn xác";
    const fileLabel = s.visual?.file || "";
    return `| **${s.id}** | ${tierLabel} | \`${statusLabel}\` | ${reasonLabel} | \`${fileLabel}\` |`;
  })
  .join("\n")}

- **Tổng shot Tier 2 (AI Video):** ${tier2Total} / ${timeline.scenes.length}
- **Tổng shot Tier 0 (Luma Parallax Fallback):** ${tier0Total} / ${timeline.scenes.length}
`;

  if (fs.existsSync(reportPath)) {
    let oldReport = fs.readFileSync(reportPath, "utf-8");
    if (oldReport.includes("## 2. Phân Bổ Tầng Kỹ Thuật")) {
      oldReport = oldReport.replace(
        /## 2\. Phân Bổ Tầng Kỹ Thuật[\s\S]*?(?=## 3\. Kết Quả Kiểm Định)/,
        `## 2. Phân Bổ Tầng Kỹ Thuật (Tier Breakdown)\n${summaryMarkdown}\n\n`
      );
      fs.writeFileSync(reportPath, oldReport, "utf-8");
      if (fs.existsSync(rootReportPath)) fs.writeFileSync(rootReportPath, oldReport, "utf-8");
    }
  }

  let statusJson: any = {};
  if (fs.existsSync(statusPath)) {
    try {
      statusJson = JSON.parse(fs.readFileSync(statusPath, "utf-8"));
    } catch {}
  }
  statusJson.tier0Count = tier0Total;
  statusJson.tier2Count = tier2Total;
  statusJson.hybridDetails = shotResults;
  statusJson.updatedAt = new Date().toISOString();

  fs.writeFileSync(statusPath, JSON.stringify(statusJson, null, 2), "utf-8");
  if (fs.existsSync(path.join("out", "status.json"))) {
    fs.writeFileSync(path.join("out", "status.json"), JSON.stringify(statusJson, null, 2), "utf-8");
  }

  console.log(`\n🎉 NÂNG CẤP HOÀN TẤT V4.1: ${tier2Total} shot Tier 2, ${tier0Total} shot Tier 0!`);
  return true;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const slug = args[0] || "natural-cycle-v2";
  upgradeVideo(slug).catch((err) => {
    console.error("❌ Lỗi nâng cấp video:", err);
    process.exit(1);
  });
}
