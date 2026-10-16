import fs from "fs";
import path from "path";
import { execSync } from "child_process";

/**
 * CÔNG CỤ TRÍCH XUẤT KHUNG HÌNH CUỐI CÙNG (LAST FRAME EXTRACTOR V3.0)
 * Mục đích: Lấy chính xác khung hình cuối cùng của video clip shot_XX.mp4
 * để làm ảnh xuất phát (initial frame) cho shot_XX+1 trên Google Veo.
 * Cách dùng: npx tsx scripts/extract_last_frame.ts <path/to/shot_XX.mp4> [output_path]
 */
function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("❌ Cách dùng: npx tsx scripts/extract_last_frame.ts <path/to/shot_XX.mp4> [output_path]");
    process.exit(1);
  }

  const inputVideo = args[0];
  if (!fs.existsSync(inputVideo)) {
    console.error(`❌ Không tìm thấy tệp video: ${inputVideo}`);
    process.exit(1);
  }

  const dirName = path.dirname(inputVideo);
  const baseName = path.basename(inputVideo, path.extname(inputVideo)); // e.g., "shot_01"
  
  // Tự động tính toán tên output nếu không truyền
  let outputPath = args[1];
  if (!outputPath) {
    const match = baseName.match(/shot_(\d+)/i);
    if (match) {
      const currentNum = parseInt(match[1], 10);
      const nextNum = (currentNum + 1).toString().padStart(2, "0");
      outputPath = path.join(dirName, `frame_start_for_shot_${nextNum}.jpg`);
    } else {
      outputPath = path.join(dirName, `${baseName}_last_frame.jpg`);
    }
  }

  console.log(`\n======================================================`);
  console.log(`🎞️ TRÍCH XUẤT KHUNG HÌNH CUỐI (LAST-FRAME EXTRACTOR)`);
  console.log(`📹 Video nguồn: ${inputVideo}`);
  console.log(`🖼️ Khung hình xuất: ${outputPath}`);
  console.log(`======================================================\n`);

  try {
    // 1. Đo thời lượng thực tế của clip bằng FFprobe nhúng trong Remotion
    const probeCmd = `npx remotion ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputVideo}"`;
    const durOut = execSync(probeCmd, { encoding: "utf-8" }).trim();
    const duration = parseFloat(durOut);

    if (isNaN(duration) || duration <= 0) {
      throw new Error(`Thời lượng video không hợp lệ: ${durOut}`);
    }

    console.log(`⏱️ Thời lượng video: ${duration.toFixed(3)}s`);

    // Lùi lại 0.04s (1 frame ở 25-30fps) trước khi kết thúc để tránh gặp end-of-file
    const seekTime = Math.max(0, duration - 0.04).toFixed(3);
    console.log(`🎯 Điểm trích xuất (Seek Point): ${seekTime}s`);

    // 2. Trích xuất frame với chất lượng cao nhất (q:v 2)
    const extractCmd = `npx remotion ffmpeg -y -ss ${seekTime} -i "${inputVideo}" -frames:v 1 -q:v 2 "${outputPath}"`;
    execSync(extractCmd, { stdio: "pipe" });

    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
      throw new Error("Tệp ảnh xuất ra có dung lượng 0 bytes hoặc không được tạo.");
    }

    const fileSizeKb = (fs.statSync(outputPath).size / 1024).toFixed(1);
    console.log(`✅ Đã trích xuất thành công: ${outputPath} (${fileSizeKb} KB)`);
    console.log(`👉 Hãy tải tệp này lên Google Veo làm ảnh khung đầu cho shot tiếp theo!\n`);
  } catch (err: any) {
    console.error(`❌ Lỗi trích xuất khung hình:`, err.message);
    process.exit(1);
  }
}

main();
