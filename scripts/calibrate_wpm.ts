import fs from "fs";
import path from "path";

interface AudioSample {
  run: string;
  sceneId: string;
  words: number;
  durationSec: number;
  wps: number;
}

/**
 * ĐẾM SỐ TỪ TIẾNG VIỆT CHUẨN XÁC THEO KHOẢNG TRẮNG
 */
function countVietnameseWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * LẤY THỜI LƯỢNG AUDIO NÓI THỰC TẾ (GIÂY)
 * Ưu tiên:
 * 1. audioDurationInFrames từ timeline.json
 * 2. Mốc thời gian cuối cùng từ file .vtt
 * 3. Ước tính từ dung lượng file MP3 (Edge-TTS mono 48kbps = ~6000 bytes/sec)
 */
function getAudioSpeechDurationSec(runDir: string, scene: any): number {
  const fps = 30;

  // 1. Kiểm tra audioDurationInFrames trong timeline.json
  if (typeof scene.audioDurationInFrames === "number" && scene.audioDurationInFrames > 0) {
    return Math.round((scene.audioDurationInFrames / fps) * 100) / 100;
  }

  // 2. Kiểm tra file .vtt đi kèm trong runs/<slug>/audio/<scene_id>.vtt
  const vttPath = path.join(runDir, "audio", `${scene.id}.vtt`);
  if (fs.existsSync(vttPath)) {
    const vttContent = fs.readFileSync(vttPath, "utf-8");
    const matches = [...vttContent.matchAll(/(\d{2}):(\d{2}):(\d{2})[.,](\d{3})/g)];
    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      const hours = parseInt(lastMatch[1], 10);
      const minutes = parseInt(lastMatch[2], 10);
      const seconds = parseInt(lastMatch[3], 10);
      const millis = parseInt(lastMatch[4], 10);
      const totalSec = hours * 3600 + minutes * 60 + seconds + millis / 1000;
      if (totalSec > 0) {
        return Math.round(totalSec * 100) / 100;
      }
    }
  }

  // 3. Đo từ file MP3 thật qua dung lượng bitrate 48kbps (chính xác trong sai số ±0.1s)
  const mp3Path = path.join(runDir, "audio", `${scene.id}.mp3`);
  if (fs.existsSync(mp3Path)) {
    const bytes = fs.statSync(mp3Path).size;
    // Edge-TTS audio format audio-24khz-48kbitrate-mono-mp3 = ~6000 bytes/sec
    return Math.round((bytes / 6000) * 100) / 100;
  }

  return 0;
}

async function main() {
  console.log(`\n======================================================`);
  console.log(`🎙️ KHỞI ĐỘNG CÔNG CỤ HIỆU CHUẨN TỐC ĐỘ ĐỌC (CALIBRATE WPM)`);
  console.log(`======================================================\n`);

  const runsDir = "runs";
  if (!fs.existsSync(runsDir)) {
    console.error("❌ Thư mục runs không tồn tại.");
    process.exit(1);
  }

  const runFolders = fs.readdirSync(runsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const samples: AudioSample[] = [];

  for (const slug of runFolders) {
    const runDir = path.join(runsDir, slug);
    const timelinePath = path.join(runDir, "timeline.json");
    const storyboardPath = path.join(runDir, "storyboard.json");

    let scenes: any[] = [];
    if (fs.existsSync(timelinePath)) {
      try {
        const tl = JSON.parse(fs.readFileSync(timelinePath, "utf-8"));
        scenes = tl.scenes || [];
      } catch {}
    } else if (fs.existsSync(storyboardPath)) {
      try {
        const sb = JSON.parse(fs.readFileSync(storyboardPath, "utf-8"));
        scenes = sb.scenes || [];
      } catch {}
    }

    for (const scene of scenes) {
      if (!scene.voiceoverText) continue;
      const durationSec = getAudioSpeechDurationSec(runDir, scene);
      const words = countVietnameseWords(scene.voiceoverText);

      if (durationSec > 0.5 && words > 0) {
        const wps = words / durationSec;
        samples.push({
          run: slug,
          sceneId: scene.id,
          words,
          durationSec,
          wps,
        });
        console.log(`   [${slug}/${scene.id}] ${words} từ trong ${durationSec.toFixed(2)}s -> ${wps.toFixed(2)} từ/giây (${(wps * 60).toFixed(0)} WPM)`);
      }
    }
  }

  if (samples.length === 0) {
    console.error("❌ Không tìm thấy mẫu audio nào trong thư mục runs/*/audio/ để hiệu chuẩn.");
    process.exit(1);
  }

  const totalWords = samples.reduce((acc, s) => acc + s.words, 0);
  const totalDuration = samples.reduce((acc, s) => acc + s.durationSec, 0);
  const avgWps = totalWords / totalDuration;
  const avgWpm = avgWps * 60;

  console.log(`\n------------------------------------------------------`);
  console.log(`📊 KẾT QUẢ HIỆU CHUẨN TRÊN ${samples.length} MẪU CẢNH THỰC TẾ:`);
  console.log(`   - Tổng số từ tiếng Việt phân tích: ${totalWords}`);
  console.log(`   - Tổng thời lượng audio đọc thực: ${totalDuration.toFixed(2)} giây`);
  console.log(`   - Tốc độ đọc thực tế: ${avgWps.toFixed(2)} từ/giây`);
  console.log(`   - Tốc độ quy đổi phút: ${avgWpm.toFixed(1)} từ/phút (WPM)`);
  console.log(`------------------------------------------------------\n`);

  const configDir = "config";
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const calibrationData = {
    calibratedAt: new Date().toISOString(),
    voice: "vi-VN-HoaiMyNeural",
    totalSamples: samples.length,
    totalWords,
    totalDurationSec: parseFloat(totalDuration.toFixed(2)),
    wordsPerSecond: parseFloat(avgWps.toFixed(3)),
    wordsPerMinute: parseFloat(avgWpm.toFixed(1)),
    preRollSecPerScene: 0.2, // 6 frames @ 30fps
    postRollSecPerScene: 0.4, // 12 frames @ 30fps
    safetyFactor: 0.95, // Hệ số an toàn trừ hao ngắt câu
    tolerancePercent: 0.08, // Dung sai Auto-tune ±8%
  };

  const configPath = path.join(configDir, "calibration.json");
  fs.writeFileSync(configPath, JSON.stringify(calibrationData, null, 2), "utf-8");

  console.log(`✅ Đã lưu cấu hình hiệu chuẩn thành công vào: ${configPath}`);
  console.log(`👉 Cổng 1 (validate_storyboard.ts) sẽ sử dụng trực tiếp dữ liệu này để tính số từ chuẩn.`);
  console.log(`======================================================\n`);
}

main().catch((err) => {
  console.error("❌ Lỗi nghiêm trọng khi hiệu chuẩn WPM:", err);
  process.exit(1);
});
