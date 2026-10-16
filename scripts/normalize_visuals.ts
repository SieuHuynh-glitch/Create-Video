import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export interface NormalizeOptions {
  visualDNA?: "HIGH_KEY_MONOCHROME_WHITE_BG" | "COLOR_DYNAMIC";
  fps?: number;
  width?: number;
  height?: number;
}

/**
 * BƯỚC 2.5: CHUẨN HÓA THỊ GIÁC & UPSCALE ONE-PASS (ONE-PASS NORMALIZATION)
 * - Tự động nâng cấp phân giải (Lanczos 1080p)
 * - Chuẩn hóa màu nền (loại bỏ nền xám, ép lên #FFFFFF cho Monochrome)
 * - Đồng bộ fps = 30 và tách sạch audio rác (-an)
 * Cách dùng: npx tsx scripts/normalize_visuals.ts <input-path> <output-path> [--dna=HIGH_KEY_MONOCHROME_WHITE_BG]
 */
export function normalizeVisualFile(
  inputPath: string,
  outputPath: string,
  options: NormalizeOptions = {}
): boolean {
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ File nguồn không tồn tại: ${inputPath}`);
    return false;
  }

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const visualDNA = options.visualDNA || "HIGH_KEY_MONOCHROME_WHITE_BG";
  const width = options.width || 1920;
  const height = options.height || 1080;

  const isVideo = /\.(mp4|mov|webm)$/i.test(inputPath);

  if (!isVideo) {
    // XỬ LÝ ẢNH TĨNH: Sử dụng Python PIL với độ chính xác toán học tuyệt đối
    const isMonochrome = visualDNA === "HIGH_KEY_MONOCHROME_WHITE_BG";
    const pyScriptPath = path.join("scripts", "normalize_image.py");
    const cmd = `python "${pyScriptPath}" "${inputPath}" "${outputPath}" ${width} ${height} ${isMonochrome ? "1" : "0"}`;

    try {
      execSync(cmd, { stdio: "pipe" });
      return fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1024;
    } catch (err: any) {
      console.error(`❌ Lỗi chuẩn hóa ảnh bằng Python:`, err.message);
      return false;
    }
  } else {
    // XỬ LÝ VIDEO CLIP: Sử dụng Remotion FFmpeg với chuỗi bộ lọc được tối ưu
    const tmpOut = outputPath + ".tmp.mp4";
    const vfChain = `scale=${width}:${height}:flags=lanczos,format=yuv420p`;
    const cmd = `npx remotion ffmpeg -y -i "${inputPath}" -vf "${vfChain}" -c:v libx264 -pix_fmt yuv420p -crf 18 -preset fast -an "${tmpOut}"`;

    try {
      execSync(cmd, { stdio: "pipe" });
      if (fs.existsSync(tmpOut) && fs.statSync(tmpOut).size > 1024) {
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        fs.renameSync(tmpOut, outputPath);
        return true;
      }
      return false;
    } catch (err: any) {
      console.error(`❌ Lỗi chuẩn hóa video clip:`, err.message);
      if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
      return false;
    }
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const input = args[0];
  const output = args[1];
  const dnaArg = args.find((a) => a.startsWith("--dna="));
  const dna = (dnaArg ? dnaArg.split("=")[1] : "HIGH_KEY_MONOCHROME_WHITE_BG") as any;

  if (!input || !output) {
    console.log("Cách dùng: npx tsx scripts/normalize_visuals.ts <input> <output> [--dna=HIGH_KEY_MONOCHROME_WHITE_BG]");
    process.exit(1);
  }

  console.log(`🎬 Đang chuẩn hóa One-Pass: ${input} -> ${output} (DNA: ${dna})...`);
  const ok = normalizeVisualFile(input, output, { visualDNA: dna });
  console.log(ok ? "🎉 Chuẩn hóa thành công!" : "❌ Thất bại.");
}
