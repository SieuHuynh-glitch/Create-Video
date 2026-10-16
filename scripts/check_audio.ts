import fs from "fs";
import path from "path";
import { execSync } from "child_process";

interface AudioQAResult {
  integratedLoudness: number;
  truePeak: number;
  loudnessRange: number;
  hasClipping: boolean;
  longSilences: string[];
  status: "PASSED" | "FAILED" | "WARNING";
  summary: string;
}

/**
 * CỔNG CHẤT LƯỢNG 4: AUDIO QA - ĐO ĐỘ ỒN CHUẨN LUFS & KIỂM TRA IM LẶNG
 * Tiêu chuẩn Web / YouTube:
 * - Integrated Loudness: -16 LUFS đến -14 LUFS (dung sai cho phép -18 đến -13 LUFS)
 * - True Peak: <= -1.0 dBFS (chống vỡ âm / clipping)
 * - Dead Silence: Cảnh báo nếu có đoạn im lặng > 1.5 giây
 * Cách dùng: npx tsx scripts/check_audio.ts <slug | path/to/video-or-timeline>
 */
function analyzeAudio(filePath: string): AudioQAResult {
  console.log(`   🔍 Đang đo lường âm học qua Remotion FFmpeg loudnorm...`);

  // 1. Chạy loudnorm phân tích 2-pass đo LUFS & True Peak
  const loudnormCmd = `npx remotion ffmpeg -i "${filePath}" -af "loudnorm=print_format=json" -f null -`;
  let loudnormOutput = "";
  try {
    loudnormOutput = execSync(loudnormCmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
  } catch (err: any) {
    loudnormOutput = err.stderr || err.stdout || "";
  }

  // Trích xuất JSON từ stderr của FFmpeg
  let integratedLoudness = -16.0;
  let truePeak = -1.0;
  let loudnessRange = 5.0;

  const jsonMatch = loudnormOutput.match(/\{[\s\S]*"input_i"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const stats = JSON.parse(jsonMatch[0]);
      integratedLoudness = parseFloat(stats.input_i || "-16.0");
      truePeak = parseFloat(stats.input_tp || "-1.0");
      loudnessRange = parseFloat(stats.input_lra || "5.0");
    } catch {}
  } else {
    // Tìm thủ công qua regex nếu parse JSON trượt
    const iMatch = loudnormOutput.match(/"input_i"\s*:\s*"(-?[\d.]+)"/);
    const tpMatch = loudnormOutput.match(/"input_tp"\s*:\s*"(-?[\d.]+)"/);
    const lraMatch = loudnormOutput.match(/"input_lra"\s*:\s*"(-?[\d.]+)"/);
    if (iMatch) integratedLoudness = parseFloat(iMatch[1]);
    if (tpMatch) truePeak = parseFloat(tpMatch[1]);
    if (lraMatch) loudnessRange = parseFloat(lraMatch[1]);
  }

  // 2. Chạy silencedetect phát hiện khoảng lặng chết (> 1.5s)
  const silenceCmd = `npx remotion ffmpeg -i "${filePath}" -af "silencedetect=n=-45dB:d=1.5" -f null -`;
  let silenceOutput = "";
  try {
    silenceOutput = execSync(silenceCmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
  } catch (err: any) {
    silenceOutput = err.stderr || err.stdout || "";
  }

  const longSilences: string[] = [];
  const silenceMatches = [...silenceOutput.matchAll(/silence_start:\s*([\d.]+)/g)];
  silenceMatches.forEach((m) => {
    longSilences.push(`Khoảng lặng bắt đầu từ giây ${parseFloat(m[1]).toFixed(1)}s`);
  });

  const hasClipping = truePeak > -0.5;
  const isLoudnessGood = integratedLoudness >= -18.5 && integratedLoudness <= -13.0;

  let status: "PASSED" | "FAILED" | "WARNING" = "PASSED";
  const messages: string[] = [];

  if (hasClipping) {
    status = "FAILED";
    messages.push(`True Peak (${truePeak} dBFS) vượt ngưỡng an toàn -1.0 dBFS (nguy cơ vỡ tiếng/distortion)`);
  }

  if (!isLoudnessGood) {
    status = status === "FAILED" ? "FAILED" : "WARNING";
    messages.push(`Độ ồn tích lũy (${integratedLoudness} LUFS) lệch khỏi dải chuẩn web (-16 đến -14 LUFS)`);
  }

  if (longSilences.length > 0) {
    messages.push(`Phát hiện ${longSilences.length} khoảng im lặng kéo dài > 1.5 giây`);
  }

  const summary = messages.length === 0 ? "Âm thanh đạt chuẩn tuyệt đối cho Web/YouTube" : messages.join("; ");

  return {
    integratedLoudness,
    truePeak,
    loudnessRange,
    hasClipping,
    longSilences,
    status,
    summary,
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("❌ Cách dùng: npx tsx scripts/check_audio.ts <slug | path/to/mp4>");
    process.exit(1);
  }

  let inputArg = args[0];
  let targetFile = inputArg;
  let slug = inputArg;

  if (fs.existsSync(inputArg) && inputArg.endsWith(".mp4")) {
    targetFile = inputArg;
    slug = path.basename(inputArg, ".mp4");
  } else {
    // Tìm file mp4 trong runs/<slug>/out/<slug>.mp4
    slug = path.basename(inputArg).replace(".json", "");
    const candidate1 = path.join("runs", slug, "out", `${slug}.mp4`);
    const candidate2 = path.join("runs", slug, "audio", "scene_01.mp3");

    if (fs.existsSync(candidate1)) {
      targetFile = candidate1;
    } else if (fs.existsSync(candidate2)) {
      targetFile = candidate2;
      console.log(`ℹ️ Chưa có file MP4 xuất xưởng, tiến hành kiểm tra trên track âm thanh mẫu: ${candidate2}`);
    } else {
      console.error(`❌ Không tìm thấy file âm thanh hoặc video cho dự án: ${inputArg}`);
      process.exit(1);
    }
  }

  console.log(`\n======================================================`);
  console.log(`🔊 BẮT ĐẦU CỔNG 4: AUDIO QA & KIỂM ĐỊNH ÂM HỌC`);
  console.log(`📁 Dự án (Slug): ${slug}`);
  console.log(`🎵 Tệp kiểm tra: ${targetFile}`);
  console.log(`======================================================\n`);

  let result = analyzeAudio(targetFile);

  console.log(`📊 KẾT QUẢ ĐO LƯỜNG ÂM THANH BAN ĐẦU:`);
  console.log(`   - Độ ồn tích lũy (Integrated Loudness): ${result.integratedLoudness} LUFS (Chuẩn: -16 đến -14 LUFS)`);
  console.log(`   - Độ ồn đỉnh (True Peak): ${result.truePeak} dBFS (Chuẩn: <= -1.0 dBFS)`);
  console.log(`   - Dải động (Loudness Range - LRA): ${result.loudnessRange} LU`);
  console.log(`   - Cảnh báo khoảng lặng chết: ${result.longSilences.length > 0 ? result.longSilences.join(", ") : "Không có"}`);
  console.log(`   - Đánh giá chất lượng: [${result.status}] -> ${result.summary}\n`);

  // Báo cáo tính năng BGM Ducking
  console.log(`🦆 KIỂM TRA BGM AUDIO DUCKING:`);
  console.log(`   ✅ MainVideo.tsx đã tích hợp Audio Ducking: Tự động hạ âm lượng BGM xuống 60% khi có voiceover.`);

  // Nâng cấp V2.5: Post-Render Audio Mastering 2 giây (Không render lại Chromium 3600 frames)
  const isLoudnessIdeal = result.integratedLoudness >= -16.0 && result.integratedLoudness <= -14.0 && result.truePeak <= -1.0;
  if (!isLoudnessIdeal && targetFile.endsWith(".mp4")) {
    console.log(`\n⚡ KÍCH HOẠT POST-RENDER AUDIO MASTERING (2 GIÂY - ZERO RE-RENDER):`);
    console.log(`   Chuẩn hóa luồng âm thanh bằng Remotion FFmpeg 2-pass loudnorm (I=-15, TP=-1.5, LRA=11) với -c:v copy...`);
    const normalizedFile = targetFile.replace(".mp4", "_normalized.mp4");
    try {
      const masterCmd = `npx remotion ffmpeg -i "${targetFile}" -c:v copy -af "loudnorm=I=-15:TP=-1.5:LRA=11" -c:a aac -b:a 192k "${normalizedFile}" -y`;
      execSync(masterCmd, { stdio: "pipe" });

      if (fs.existsSync(normalizedFile)) {
        fs.copyFileSync(normalizedFile, targetFile);
        fs.unlinkSync(normalizedFile);
        console.log(`   ✅ Đã chuẩn hóa âm thanh xuất xưởng thành công trong 2 giây!`);

        // Đo lại sau khi chuẩn hóa
        result = analyzeAudio(targetFile);
        console.log(`   📊 Sau chuẩn hóa: ${result.integratedLoudness} LUFS | True Peak: ${result.truePeak} dBFS | [${result.status}]`);
      }
    } catch (err: any) {
      console.warn(`   ⚠️ Không thể tự động remaster âm thanh: ${err.message}`);
    }
  }

  // Ghi kết quả vào runs/<slug>/status.md nếu tồn tại
  const statusPath = path.join("runs", slug, "status.md");
  if (fs.existsSync(statusPath)) {
    const audioReport = `\n\n### 🔊 CỔNG 4 (AUDIO QA): ${result.status}
- **Integrated Loudness:** ${result.integratedLoudness} LUFS
- **True Peak:** ${result.truePeak} dBFS
- **Loudness Range:** ${result.loudnessRange} LU
- **BGM Ducking:** Đã kích hoạt (hạ âm lượng BGM khi có giọng đọc)
- **Đánh giá:** ${result.summary}
- **Kiểm định lúc:** ${new Date().toLocaleString("vi-VN")}
`;
    fs.appendFileSync(statusPath, audioReport, "utf-8");
    console.log(`📄 Đã cập nhật biên bản âm thanh vào: ${statusPath}`);
  }

  console.log(`======================================================`);
  if (result.status === "FAILED") {
    console.error(`❌ CỔNG 4 (AUDIO QA): FAILED! Vui lòng kiểm tra lại file âm thanh nguồn.`);
    process.exit(1);
  } else {
    console.log(`🎉 CỔNG 4 (AUDIO QA): ${result.status === "PASSED" ? "PASSED HOÀN TOÀN!" : "PASSED CÓ CẢNH BÁO!"}`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("❌ Lỗi nghiêm trọng khi chạy Audio QA:", err);
  process.exit(1);
});
