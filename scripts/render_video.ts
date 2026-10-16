import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { TimelineSchema } from "../src/schema";

/**
 * ĐỒNG BỘ LẠI TÀI NGUYÊN TỪ RUNS SANG PUBLIC NẾU THIẾU HOẶC ĐÃ BỊ DỌN DẸP
 */
function syncPublicAssets(slug: string, timeline: any): number {
  let syncedCount = 0;

  // 1. Đồng bộ Audio files
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
        // Đồng bộ file .vtt nếu có
        const sourceVttPath = sourceAudioPath.replace(/\.mp3$/, ".vtt");
        const destVttPath = destAudioPath.replace(/\.mp3$/, ".vtt");
        if (fs.existsSync(sourceVttPath) && !fs.existsSync(destVttPath)) {
          fs.copyFileSync(sourceVttPath, destVttPath);
        }
      }
    }

    // 2. Đồng bộ Visual Media (ảnh / video)
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
 * WRAPPER RENDER VIDEO TOÀN DIỆN & AN TOÀN
 * Cách dùng: npx tsx scripts/render_video.ts <slug> [--clean]
 */
function main() {
  const args = process.argv.slice(2);
  const slug = args[0];
  const autoClean = args.includes("--clean");

  if (!slug) {
    console.error("❌ Lỗi: Vui lòng cung cấp slug dự án. Ví dụ: npx tsx scripts/render_video.ts media-smoke-test");
    process.exit(1);
  }

  const runDir = path.join("runs", slug);
  const timelinePath = path.join(runDir, "timeline.json");
  const outDir = path.join(runDir, "out");
  const outMp4Path = path.join(outDir, `${slug}.mp4`);

  console.log(`\n======================================================`);
  console.log(`🎬 KHỞI ĐỘNG TIẾN TRÌNH RENDER AN TOÀN: ${slug}`);
  console.log(`📁 File Timeline: ${timelinePath}`);
  console.log(`📤 Đích xuất file: ${outMp4Path}`);
  console.log(`🧹 Tự động dọn dẹp sau render (--clean): ${autoClean ? "BẬT" : "TẮT"}`);
  console.log(`======================================================\n`);

  if (!fs.existsSync(timelinePath)) {
    console.error(`❌ Lỗi: File timeline không tồn tại: ${timelinePath}`);
    console.error(`👉 Hãy đảm bảo bạn đã chạy xong Cổng 2 (scripts/build_timeline.ts) trước khi render.`);
    process.exit(1);
  }

  const rawTimeline = JSON.parse(fs.readFileSync(timelinePath, "utf-8"));
  const timeline = TimelineSchema.parse(rawTimeline);

  // BƯỚC 1: Tự động kiểm tra & Re-sync Media vào public/runs/<slug>/ (Chống bẫy xóa nhầm sau /clean-run)
  console.log(`🔍 [1/3] Kiểm tra tính sẵn sàng của tài nguyên tĩnh trong public/runs/${slug}...`);
  const syncedFiles = syncPublicAssets(slug, timeline);
  if (syncedFiles > 0) {
    console.log(`   ✅ Đã tự động phục hồi & đồng bộ ${syncedFiles} tệp media/audio vào public/runs/${slug}/`);
  } else {
    console.log(`   ✅ Tất cả tệp media/audio đã sẵn sàng trong public/.`);
  }

  // Đảm bảo thư mục out tồn tại
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // BƯỚC 2: Gọi Remotion Render
  console.log(`\n🚀 [2/3] Bắt đầu render Remotion...`);
  const remotionCmd = `npx remotion render MainVideo "${outMp4Path}" --props="${timelinePath}"`;
  
  try {
    execSync(remotionCmd, { stdio: "inherit" });
  } catch (err: any) {
    console.error(`\n❌ Render thất bại:`, err.message);
    process.exit(1);
  }

  // Kiểm tra file kết quả
  if (!fs.existsSync(outMp4Path) || fs.statSync(outMp4Path).size === 0) {
    console.error(`❌ Lỗi: File MP4 không tồn tại hoặc có dung lượng 0 bytes: ${outMp4Path}`);
    process.exit(1);
  }

  const fileSizeMb = (fs.statSync(outMp4Path).size / (1024 * 1024)).toFixed(2);
  console.log(`\n🎉 [2/3] RENDER HOÀN TẤT THÀNH CÔNG!`);
  console.log(`   - File: ${outMp4Path}`);
  console.log(`   - Kích thước: ${fileSizeMb} MB`);

  // BƯỚC 3: Tự động dọn dẹp nếu có cờ --clean
  if (autoClean) {
    console.log(`\n🧹 [3/3] Đang tự động giải phóng thư mục tạm public/runs/${slug}...`);
    try {
      execSync(`npx tsx scripts/clean_run.ts "${slug}"`, { stdio: "inherit" });
    } catch (cleanErr: any) {
      console.warn(`⚠️ Chú ý: Không thể dọn dẹp tự động:`, cleanErr.message);
    }
  } else {
    console.log(`\nℹ️ [3/3] Thư mục public/runs/${slug}/ vẫn được giữ lại để preview.`);
    console.log(`   Để giải phóng ổ đĩa, chạy: npx tsx scripts/clean_run.ts ${slug}`);
  }

  console.log(`\n✨ TOÀN BỘ QUY TRÌNH XUẤT BẢN ĐÃ HOÀN TẤT!`);
}

main();
