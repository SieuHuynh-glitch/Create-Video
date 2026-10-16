import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { StoryboardSchema } from "../src/schema";

/**
 * SINH FILE ÂM THANH VOICE-OVER VÀ PHỤ ĐỀ BẰNG MICROSOFT EDGE-TTS
 * Cách dùng: npx tsx scripts/generate_voiceover.ts <storyboard.json> [--rate=+5%] [--voice=vi-VN-HoaiMyNeural] [--overwrite]
 */
function main() {
  const args = process.argv.slice(2);
  const storyboardPath = args[0] || "runs/smoke-test/storyboard.json";
  
  const rateArg = args.find((a) => a.startsWith("--rate="));
  const rate = rateArg ? rateArg.split("=")[1] : "+0%";

  const voiceArg = args.find((a) => a.startsWith("--voice="));
  const voice = voiceArg ? voiceArg.split("=")[1] : "vi-VN-HoaiMyNeural";

  const overwrite = args.includes("--overwrite");

  console.log(`\n======================================================`);
  console.log(`🎙️ BẮT ĐẦU SINH ÂM THANH EDGE-TTS`);
  console.log(`📁 Storyboard: ${storyboardPath}`);
  console.log(`🗣️ Giọng đọc: ${voice}`);
  console.log(`⚡ Tốc độ (Rate): ${rate}`);
  console.log(`♻️ Ghi đè file cũ: ${overwrite ? "CÓ" : "KHÔNG"}`);
  console.log(`======================================================\n`);

  if (!fs.existsSync(storyboardPath)) {
    console.error(`❌ Lỗi: File storyboard không tồn tại: ${storyboardPath}`);
    process.exit(1);
  }

  const rawStoryboard = JSON.parse(fs.readFileSync(storyboardPath, "utf-8"));
  const storyboard = StoryboardSchema.parse(rawStoryboard);

  const runDir = path.dirname(storyboardPath);
  const audioDir = path.join(runDir, "audio");

  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }

  let generatedCount = 0;
  let skippedCount = 0;

  for (const scene of storyboard.scenes) {
    const mp3Path = path.join(audioDir, `${scene.id}.mp3`);
    const vttPath = path.join(audioDir, `${scene.id}.vtt`);

    if (!overwrite && fs.existsSync(mp3Path) && fs.statSync(mp3Path).size > 0) {
      console.log(`⏭️ [${scene.id}] Đã có file audio, bỏ qua: ${scene.id}.mp3`);
      skippedCount++;
      continue;
    }

    const textToSpeak = (scene.voiceoverText || "").trim();
    if (!textToSpeak) {
      console.warn(`⚠️ [${scene.id}] Cảnh không có lời đọc voiceoverText.`);
      continue;
    }

    console.log(`🔊 [${scene.id}] Đang sinh audio: "${textToSpeak.slice(0, 50)}..."`);

    // Gọi Edge-TTS qua spawnSync tránh lỗi escape ký tự đặc biệt tiếng Việt trên Windows
    const ttsArgs = [
      "--voice", voice,
      "--rate", rate,
      "--text", textToSpeak,
      "--write-media", mp3Path,
      "--write-subtitles", vttPath,
    ];

    const result = spawnSync("edge-tts", ttsArgs, {
      encoding: "utf-8",
      shell: true,
    });

    if (result.status !== 0 || !fs.existsSync(mp3Path) || fs.statSync(mp3Path).size === 0) {
      console.error(`❌ Lỗi Edge-TTS tại cảnh [${scene.id}]:`, result.stderr || result.error?.message);
      console.error(`🛑 DỪNG QUY TRÌNH (Fail-Safe): Không tự ý đổi sang engine TTS khác.`);
      process.exit(1);
    }

    console.log(`   ✅ Đã tạo: ${scene.id}.mp3 & ${scene.id}.vtt`);
    generatedCount++;
  }

  console.log(`\n🎉 HOÀN THÀNH SINH VOICE-OVER:`);
  console.log(`   - Tạo mới/cập nhật: ${generatedCount} cảnh`);
  console.log(`   - Bỏ qua giữ nguyên: ${skippedCount} cảnh`);
  console.log(`   - Thư mục lưu trữ: ${audioDir}\n`);
}

main();
