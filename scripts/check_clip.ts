import fs from "fs";
import path from "path";
import { execSync } from "child_process";

interface ClipAnalysis {
  file: string;
  width: number;
  height: number;
  durationSec: number;
  fps: number;
  hasAudio: boolean;
  upscaleRatio: number;
  freezeDetected: boolean;
  freezeDetails: string[];
  crops: {
    tl: string;
    tr: string;
    bl: string;
    br: string;
  };
  status: "PASS" | "WARN" | "FAIL";
  messages: string[];
}

/**
 * CÔNG CỤ KIỂM ĐỊNH KỸ THUẬT CLIP AI & SOI WATERMARK 4 GÓC (V3.0)
 * Cách dùng: npx tsx scripts/check_clip.ts <path/to/clip.mp4 | path/to/media-folder>
 */
async function analyzeSingleClip(videoPath: string, cropsOutDir: string): Promise<ClipAnalysis> {
  const baseName = path.basename(videoPath, path.extname(videoPath));
  const messages: string[] = [];

  // 1. Phân tích FFprobe
  const probeCmd = `npx remotion ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,duration -show_entries format=duration -of json "${videoPath}"`;
  const probeOut = execSync(probeCmd, { encoding: "utf-8" });
  const probeData = JSON.parse(probeOut);

  const stream = probeData.streams?.[0] || {};
  const width = stream.width || 1920;
  const height = stream.height || 1080;
  
  let durationSec = parseFloat(stream.duration || probeData.format?.duration || "0");
  
  // Tính fps từ chuỗi r_frame_rate (ví dụ "30/1" hoặc "24/1" hoặc "30000/1001")
  let fps = 30;
  if (stream.r_frame_rate) {
    const [num, den] = stream.r_frame_rate.split("/").map(Number);
    fps = den ? Math.round((num / den) * 100) / 100 : 30;
  }

  // 2. Kiểm tra Audio Stream
  const audioProbeCmd = `npx remotion ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of json "${videoPath}"`;
  let hasAudio = false;
  try {
    const audioData = JSON.parse(execSync(audioProbeCmd, { encoding: "utf-8" }));
    if (audioData.streams && audioData.streams.length > 0) {
      hasAudio = true;
      messages.push("⚠️ Phát hiện có track âm thanh gốc (cần mute khi dựng để tôn soundtrack)");
    }
  } catch {}

  // 3. Đo Upscale Ratio so với 1080p (1920x1080)
  const upscaleRatio = Math.max(1920 / width, 1080 / height);
  if (upscaleRatio > 1.5) {
    messages.push(`❌ Độ phân giải (${width}x${height}) có tỷ lệ upscale ${upscaleRatio.toFixed(2)}x vượt trần 1.5x`);
  }

  // 4. Kiểm tra Freeze Detect (Cảnh đơ tĩnh > 1.0 giây)
  const freezeCmd = `npx remotion ffmpeg -i "${videoPath}" -vf "freezedetect=n=-45dB:d=1.0" -map 0:v:0 -f null -`;
  let freezeOutput = "";
  try {
    freezeOutput = execSync(freezeCmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
  } catch (err: any) {
    freezeOutput = err.stderr || err.stdout || "";
  }

  const freezeMatches = [...freezeOutput.matchAll(/lavfi\.freezedetect\.freeze_duration:\s*([\d.]+)/g)];
  const freezeDetails: string[] = [];
  let freezeDetected = false;

  for (const m of freezeMatches) {
    const dur = parseFloat(m[1]);
    if (dur >= 1.0) {
      freezeDetected = true;
      freezeDetails.push(`Đơ tĩnh ${dur.toFixed(2)}s`);
      messages.push(`⚠️ Cảnh báo Freeze Detect: Phát hiện đoạn tĩnh lặng ${dur.toFixed(2)}s >= 1.0s`);
    }
  }

  // 5. Trích xuất 4 góc ảnh tỷ lệ 1:1 để người dùng tự soi Watermark / SynthID
  // Lưu ý: Tuyệt đối KHÔNG xóa, che hay cắt bỏ; chỉ xuất ảnh để người dùng quan sát.
  if (!fs.existsSync(cropsOutDir)) {
    fs.mkdirSync(cropsOutDir, { recursive: true });
  }

  // Lấy một khung hình giữa video (50%) để crop 4 góc
  const sampleTime = (durationSec / 2).toFixed(2);
  const midFramePath = path.join(cropsOutDir, `_temp_${baseName}_mid.jpg`);
  execSync(`npx remotion ffmpeg -y -ss ${sampleTime} -i "${videoPath}" -frames:v 1 -q:v 2 "${midFramePath}"`, { stdio: "pipe" });

  const cropTL = path.join(cropsOutDir, `${baseName}_corner_TL.png`);
  const cropTR = path.join(cropsOutDir, `${baseName}_corner_TR.png`);
  const cropBL = path.join(cropsOutDir, `${baseName}_corner_BL.png`);
  const cropBR = path.join(cropsOutDir, `${baseName}_corner_BR.png`);

  const pyCropScript = `
import sys, os
from PIL import Image

src = sys.argv[1]
tl_p, tr_p, bl_p, br_p = sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5]

if os.path.exists(src):
    img = Image.open(src)
    w, h = img.size
    crop_w, crop_h = min(360, w // 3), min(240, h // 3)
    
    # TL: Top-Left
    img.crop((0, 0, crop_w, crop_h)).save(tl_p)
    # TR: Top-Right
    img.crop((w - crop_w, 0, w, crop_h)).save(tr_p)
    # BL: Bottom-Left
    img.crop((0, h - crop_h, crop_w, h)).save(bl_p)
    # BR: Bottom-Right
    img.crop((w - crop_w, h - crop_h, w, h)).save(br_p)
`;
  execSync(`python -c "${pyCropScript.replace(/\n/g, ' ')}" "${midFramePath}" "${cropTL}" "${cropTR}" "${cropBL}" "${cropBR}"`, { stdio: "pipe" });

  if (fs.existsSync(midFramePath)) {
    fs.unlinkSync(midFramePath);
  }

  let status: "PASS" | "WARN" | "FAIL" = "PASS";
  if (upscaleRatio > 1.5) status = "FAIL";
  else if (freezeDetected || hasAudio) status = "WARN";

  return {
    file: path.basename(videoPath),
    width,
    height,
    durationSec: Math.round(durationSec * 100) / 100,
    fps,
    hasAudio,
    upscaleRatio: Math.round(upscaleRatio * 100) / 100,
    freezeDetected,
    freezeDetails,
    crops: {
      tl: cropTL,
      tr: cropTR,
      bl: cropBL,
      br: cropBR,
    },
    status,
    messages,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const target = args[0] || "runs/natural-cycle-v2/media";

  console.log(`\n======================================================`);
  console.log(`🔍 KIỂM ĐỊNH KỸ THUẬT CLIP AI & SOI WATERMARK (CỔNG 1.5 V3.0)`);
  console.log(`🎯 Mục tiêu: ${target}`);
  console.log(`======================================================\n`);

  if (!fs.existsSync(target)) {
    console.error(`❌ Không tìm thấy đường dẫn: ${target}`);
    process.exit(1);
  }

  let videoFiles: string[] = [];
  let runDir = "";

  if (fs.statSync(target).isDirectory()) {
    runDir = path.dirname(target.replace(/[/\\]+media$/, ""));
    videoFiles = fs.readdirSync(target)
      .filter((f) => /\.(mp4|mov|webm)$/i.test(f))
      .map((f) => path.join(target, f))
      .sort();
  } else {
    videoFiles = [target];
    runDir = path.dirname(path.dirname(target));
  }

  if (videoFiles.length === 0) {
    console.warn(`⚠️ Chưa tìm thấy file video nào trong ${target}.`);
    console.log(`👉 Bạn hãy sinh clip bằng Veo và đặt vào ${target} theo quy tắc shot_01.mp4, shot_02.mp4...`);
    process.exit(0);
  }

  const cropsDir = path.join(runDir || "runs/natural-cycle-v2", "out", "crops");
  const manifestPath = path.join(runDir || "runs/natural-cycle-v2", "manifest.json");

  let manifestData: any = {
    slug: path.basename(runDir || "natural-cycle-v2"),
    updatedAt: new Date().toISOString(),
    media: {},
  };
  if (fs.existsSync(manifestPath)) {
    try {
      manifestData = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    } catch {}
  }

  for (const vFile of videoFiles) {
    console.log(`🎬 Đang phân tích: ${path.basename(vFile)}...`);
    const analysis = await analyzeSingleClip(vFile, cropsDir);

    console.log(`   - Kích thước: ${analysis.width}x${analysis.height} (${analysis.upscaleRatio}x)`);
    console.log(`   - Thời lượng: ${analysis.durationSec}s @ ${analysis.fps}fps`);
    console.log(`   - Freeze Detect (>1.0s): ${analysis.freezeDetected ? `⚠️ ${analysis.freezeDetails.join(", ")}` : "✅ Không bị đơ"}`);
    console.log(`   - Âm thanh gốc: ${analysis.hasAudio ? "⚠️ Có audio gốc" : "✅ Đã tách/không có"}`);
    console.log(`   - Ảnh soi 4 góc: ${analysis.crops.tl}, ${analysis.crops.tr}, ${analysis.crops.bl}, ${analysis.crops.br}`);
    console.log(`   - Đánh giá: [${analysis.status}] ${analysis.messages.join("; ") || "Hoàn hảo"}\n`);

    // Ghi nhận vào manifest.json theo chuẩn bảo vệ bản quyền minh bạch V3.0
    manifestData.media[analysis.file] = {
      type: "video",
      source: "Google Veo (Human Generated)",
      license: "ai-video (Veo), unverified",
      watermarkAssessment: "watermark: có/không, cần tôi quyết định",
      width: analysis.width,
      height: analysis.height,
      durationSec: analysis.durationSec,
      fps: analysis.fps,
      crops: [analysis.crops.tl, analysis.crops.tr, analysis.crops.bl, analysis.crops.br],
      verifiedAt: new Date().toISOString(),
      status: analysis.status,
    };
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), "utf-8");
  console.log(`💾 Đã cập nhật hồ sơ bản quyền & phân tích kỹ thuật vào: ${manifestPath}`);
  console.log(`\n🎉 KIỂM ĐỊNH HOÀN TẤT! Bạn hãy mở thư mục ${cropsDir} để soi nhanh 4 góc ảnh watermark.`);
}

main().catch((err) => {
  console.error("❌ Lỗi kiểm định clip:", err);
  process.exit(1);
});
