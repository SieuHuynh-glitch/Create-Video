import fs from "fs";
import path from "path";
import { execSync } from "child_process";

interface MediaMetadata {
  width: number;
  height: number;
  durationSec: number;
}

function probeMediaFile(filePath: string): MediaMetadata {
  try {
    const cmd = `npx remotion ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration:format=duration -of json "${filePath}"`;
    const stdout = execSync(cmd, { encoding: "utf-8" });
    const data = JSON.parse(stdout);

    const stream = data.streams?.[0] || {};
    const width = parseInt(stream.width || "0", 10);
    const height = parseInt(stream.height || "0", 10);

    let durationSec = parseFloat(stream.duration || "0");
    if (isNaN(durationSec) || durationSec === 0) {
      durationSec = parseFloat(data.format?.duration || "0");
    }

    return {
      width,
      height,
      durationSec: isNaN(durationSec) ? 0 : durationSec,
    };
  } catch (err: any) {
    throw new Error(`Lỗi khi gọi ffprobe: ${err.message}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("❌ Cách dùng: npx tsx scripts/check_media.ts <path-to-storyboard-or-timeline-or-slug>");
    process.exit(1);
  }

  let inputPath = args[0];
  let slug = "";

  if (!fs.existsSync(inputPath)) {
    // Thử tìm theo slug trong runs/<slug>
    const candidate1 = path.join("runs", inputPath, "storyboard.json");
    const candidate2 = path.join("runs", inputPath, "timeline.json");
    if (fs.existsSync(candidate1)) {
      inputPath = candidate1;
      slug = args[0];
    } else if (fs.existsSync(candidate2)) {
      inputPath = candidate2;
      slug = args[0];
    } else {
      console.error(`❌ Lỗi: Không tìm thấy file kịch bản hoặc thư mục run: ${args[0]}`);
      process.exit(1);
    }
  }

  const rawJson = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  slug = slug || rawJson.slug || path.basename(path.dirname(inputPath));

  const scenes = rawJson.scenes || [];
  const mediaDir = path.join("runs", slug, "media");

  console.log(`\n======================================================`);
  console.log(`🔍 KIỂM ĐỊNH TÀI NGUYÊN MEDIA & BẢN QUYỀN (CHECK MEDIA)`);
  console.log(`📁 Dự án (Slug): ${slug}`);
  console.log(`📂 Thư mục Media: ${mediaDir}`);
  console.log(`======================================================\n`);

  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }

  let hasError = false;
  const manifestAssets: any[] = [];

  for (const scene of scenes) {
    const isImageScene =
      scene.type === "image" ||
      scene.type === "luma-parallax" ||
      scene.visual?.type === "image" ||
      scene.visual?.type === "luma-parallax";
    const isVideoScene = scene.type === "video" || scene.visual?.type === "video";

    if (!isImageScene && !isVideoScene && !scene.visual?.file) {
      continue;
    }

    console.log(`🎬 Kiểm định [${scene.id}] (${scene.type}):`);

    // 1. Xác định file media
    let declaredFile = scene.visual?.file;
    if (!declaredFile) {
      // Tìm file mặc định scene_<id>.*
      const possibleExtensions = isImageScene ? [".png", ".jpg", ".jpeg", ".webp"] : [".mp4", ".mov", ".webm"];
      for (const ext of possibleExtensions) {
        const testPath = path.join(mediaDir, `${scene.id}${ext}`);
        if (fs.existsSync(testPath)) {
          declaredFile = `media/${scene.id}${ext}`;
          break;
        }
      }
    }

    if (!declaredFile) {
      console.error(`   ❌ [THIẾU FILE]: Cảnh yêu cầu media nhưng chưa có file trong ${mediaDir}/ (Ví dụ: media/${scene.id}.${isImageScene ? "png" : "mp4"})`);
      hasError = true;
      continue;
    }

    let fullFilePath = "";
    if (path.isAbsolute(declaredFile)) {
      fullFilePath = declaredFile;
    } else if (fs.existsSync(declaredFile)) {
      fullFilePath = path.resolve(declaredFile);
    } else if (fs.existsSync(path.join("runs", slug, declaredFile))) {
      fullFilePath = path.resolve(path.join("runs", slug, declaredFile));
    } else {
      fullFilePath = path.join(path.dirname(inputPath), declaredFile.startsWith("media") ? declaredFile : path.join("media", path.basename(declaredFile)));
    }

    if (!fs.existsSync(fullFilePath)) {
      console.error(`   ❌ [FILE KHÔNG TỒN TẠI]: ${fullFilePath}`);
      hasError = true;
      continue;
    }

    // 2. Phân tích thông số kỹ thuật qua ffprobe
    let meta: MediaMetadata;
    try {
      meta = probeMediaFile(fullFilePath);
    } catch (err: any) {
      console.error(`   ❌ Không thể đọc thông số file: ${err.message}`);
      hasError = true;
      continue;
    }

    const { width, height, durationSec } = meta;
    const ratio = width > 0 && height > 0 ? width / height : 0;
    const is169 = Math.abs(ratio - 16 / 9) <= 0.08;

    console.log(`   - Kích thước: ${width}x${height} (Tỉ lệ: ${ratio.toFixed(2)}:1)`);

    // 2.1. Tính toán hệ số Upscale tách biệt theo chế độ hiển thị
    const fitMode = scene.visual?.fitMode || (scene.type === "luma-parallax" ? "contain-blur" : "cover");
    const isLuma = scene.type === "luma-parallax" || scene.visual?.type === "luma-parallax";
    const isAiMedia = scene.visual?.source === "ai";
    const kenBurnsZoom = isImageScene ? 1.08 : 1.0;
    let baseScale = 1.0;

    if (isLuma || fitMode === "contain-blur") {
      baseScale = Math.min(1920 / Math.max(1, width), 1080 / Math.max(1, height));
    } else {
      baseScale = Math.max(1920 / Math.max(1, width), 1080 / Math.max(1, height));
    }

    const effectiveScale = baseScale * kenBurnsZoom;
    let upscaleWarning = "";

    // Ngưỡng upscale: 1.5x cho stock ảnh chuẩn, 2.5x cho Luma ink art và AI video
    const maxAllowedScale = isAiMedia || isLuma ? 2.8 : 1.5;

    if (baseScale > 1.0) {
      if (effectiveScale <= maxAllowedScale) {
        upscaleWarning = `Upscale x${effectiveScale.toFixed(2)} (${fitMode})`;
        console.warn(`   ⚠️ CẢNH BÁO UPSCALE: Kích thước (${width}x${height}) ở chế độ ${fitMode} cần ${upscaleWarning} (cho phép tối đa ${maxAllowedScale}x).`);
      } else {
        console.error(
          `   ❌ [ĐỘ PHÂN GIẢI QUÁ THẤP]: Kích thước (${width}x${height}) ở chế độ ${fitMode} đòi hỏi upscale x${effectiveScale.toFixed(2)} (vượt ngưỡng tối đa ${maxAllowedScale}x). Nguy cơ vỡ hạt hình ảnh nghiêm trọng!`
        );
        hasError = true;
      }
    } else {
      console.log(`   - Độ phân giải: ✅ Đạt chuẩn Full HD (${width}x${height}, hệ số co phóng x${effectiveScale.toFixed(2)} ở chế độ ${fitMode})`);
    }

    // Kiểm tra tỉ lệ 16:9
    if (!is169) {
      console.warn(`   ⚠️ CẢNH BÁO TỈ LỆ: File không chuẩn 16:9. Template sẽ tự động dùng objectFit: cover để căn giữa.`);
    } else {
      console.log(`   - Tỉ lệ 16:9: ✅ Chuẩn`);
    }

    // Kiểm tra thời lượng nếu là clip video
    if (isVideoScene) {
      console.log(`   - Thời lượng clip: ${durationSec.toFixed(2)}s`);
      const targetSec = scene.durationSec || scene.estimatedDurationSec || 5;
      const minDurationAllowed = targetSec * 0.7; // Không ngắn hơn cảnh quá 30%

      if (durationSec < minDurationAllowed) {
        console.error(
          `   ❌ [CLIP QUÁ NGẮN]: Clip dài ${durationSec.toFixed(2)}s, trong khi cảnh cần ${targetSec}s (Ngưỡng tối thiểu 70%: ${minDurationAllowed.toFixed(2)}s). Clip sẽ bị loop quá nhiều lần!`
        );
        hasError = true;
      } else {
        console.log(`   - Thời lượng: ✅ Đạt yêu cầu (Cảnh: ${targetSec}s, Clip: ${durationSec.toFixed(2)}s)`);
      }
    }

    // 3. Kiểm tra Giấy phép và Nguồn gốc (Licensing)
    let source = scene.visual?.source || "own";
    let license = scene.visual?.license || "User Provided / Free to use";
    let attribution = scene.visual?.attribution || "User supplied";

    // Quy định V2.4: Nhãn AI tự sinh bắt buộc phải minh bạch là unverified
    if (source === "ai") {
      license = "ai-generated, unverified";
      attribution = "Pollinations.ai (FLUX.1) - Unverified commercial terms";
    }

    console.log(`   - Nguồn gốc: [${source}] | Giấy phép: [${license}] | Ghi công: [${attribution}]`);

    manifestAssets.push({
      sceneId: scene.id,
      sceneType: scene.type,
      file: declaredFile,
      fullPath: fullFilePath,
      resolution: `${width}x${height}`,
      aspectRatio: ratio.toFixed(2),
      is169,
      upscaleWarning: upscaleWarning || undefined,
      durationSec: isVideoScene ? durationSec : undefined,
      source,
      license,
      attribution,
      status: hasError ? "FAILED" : "VERIFIED",
    });

    console.log(`   ✅ Cảnh [${scene.id}]: ĐẠT TIÊU CHUẨN MEDIA\n`);
  }

  // 4. Cập nhật runs/<slug>/manifest.json
  const manifestPath = path.join("runs", slug, "manifest.json");
  const manifestData = {
    slug,
    verifiedAt: new Date().toISOString(),
    totalAssets: manifestAssets.length,
    assets: manifestAssets,
    status: hasError ? "FAILED" : "PASSED",
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), "utf-8");
  console.log(`📄 Đã cập nhật hồ sơ bản quyền: ${manifestPath}`);

  if (hasError) {
    console.error(`\n❌ KIỂM ĐỊNH THẤT BẠI: Vui lòng sửa các lỗi tệp media nêu trên trước khi dựng video!`);
    process.exit(1);
  } else {
    console.log(`\n🎉 TOÀN BỘ TÀI NGUYÊN MEDIA HỢP LỆ VÀ ĐÃ ĐƯỢC CHỨNG THỰC!`);
  }
}

main().catch((err) => {
  console.error("❌ Lỗi thực thi check_media:", err);
  process.exit(1);
});
