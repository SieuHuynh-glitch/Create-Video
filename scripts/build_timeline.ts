import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { StoryboardSchema, TimelineSchema, TimelineScene, SubtitleCue } from "../src/schema";

/**
 * Hàm lấy thời lượng audio (giây) từ file VTT đi kèm hoặc ước tính dung lượng
 */
function getAudioDurationSec(audioPath: string): number {
  const vttPath = audioPath.replace(/\.mp3$/, ".vtt");
  if (fs.existsSync(vttPath)) {
    const vttContent = fs.readFileSync(vttPath, "utf-8");
    // Tìm mốc thời gian cuối cùng trong VTT/SRT: 00:00:08.500 hoặc 00:00:08,500
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

  // Fallback: Ước tính từ dung lượng file MP3 (Edge-TTS mono 48kbps = 6000 bytes/sec)
  if (fs.existsSync(audioPath)) {
    const stats = fs.statSync(audioPath);
    const bytes = stats.size;
    const estimated = Math.max(3.0, Math.round((bytes / 6000) * 10) / 10);
    return estimated;
  }

  return 5.0; // Mặc định 5s nếu chưa có audio
}

interface RawCue {
  startSec: number;
  endSec: number;
  text: string;
}

/**
 * Phân tích file VTT hoặc SRT lấy danh sách mốc thời gian phụ đề
 */
function parseVttOrSrt(filePath: string): RawCue[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf-8");
  const regex = /(\d{2}):(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[.,](\d{3})\r?\n([\s\S]*?)(?=\r?\n\r?\n\d+|\r?\n\r?\n\d{2}:|\s*$)/g;
  const cues: RawCue[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    const startSec =
      parseInt(match[1], 10) * 3600 +
      parseInt(match[2], 10) * 60 +
      parseInt(match[3], 10) +
      parseInt(match[4], 10) / 1000;
    const endSec =
      parseInt(match[5], 10) * 3600 +
      parseInt(match[6], 10) * 60 +
      parseInt(match[7], 10) +
      parseInt(match[8], 10) / 1000;
    const rawText = match[9].replace(/<[^>]+>/g, "").trim().replace(/\s+/g, " ");
    if (rawText && endSec > startSec) {
      cues.push({ startSec, endSec, text: rawText });
    }
  }
  return cues;
}

/**
 * Chia câu thành các cụm từ tối đa maxWords (mặc định 10 từ)
 */
function chunkWords(text: string, maxWords: number = 10): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return [words.join(" ")];
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(" "));
  }
  return chunks;
}

/**
 * Sinh danh sách SubtitleCue chính xác cho từng cảnh
 */
function generateSubtitleCues(
  vttPath: string,
  voiceoverText: string,
  audioStartFrame: number,
  audioDurationSec: number,
  fps: number
): SubtitleCue[] {
  const rawCues = parseVttOrSrt(vttPath);
  const result: SubtitleCue[] = [];

  if (rawCues.length > 0) {
    for (const cue of rawCues) {
      const chunks = chunkWords(cue.text, 10);
      const totalWords = cue.text.trim().split(/\s+/).filter(Boolean).length || 1;
      let currentSec = cue.startSec;
      const cueSpan = cue.endSec - cue.startSec;

      for (const chunk of chunks) {
        const chunkWordsCount = chunk.split(/\s+/).filter(Boolean).length;
        const chunkDurationSec = (chunkWordsCount / totalWords) * cueSpan;
        const startFrame = audioStartFrame + Math.round(currentSec * fps);
        const endFrame = audioStartFrame + Math.round((currentSec + chunkDurationSec) * fps);

        if (endFrame > startFrame) {
          result.push({
            text: chunk,
            startFrame,
            endFrame,
          });
        }
        currentSec += chunkDurationSec;
      }
    }
  } else if (voiceoverText && voiceoverText.trim()) {
    const chunks = chunkWords(voiceoverText, 10);
    const chunkSpanSec = audioDurationSec / chunks.length;
    for (let i = 0; i < chunks.length; i++) {
      const startFrame = audioStartFrame + Math.round(i * chunkSpanSec * fps);
      const endFrame = audioStartFrame + Math.round((i + 1) * chunkSpanSec * fps);
      if (endFrame > startFrame) {
        result.push({
          text: chunks[i],
          startFrame,
          endFrame,
        });
      }
    }
  }

  return result;
}

/**
 * CỔNG CHẤT LƯỢNG 2: Xây dựng và Kiểm định Timeline (Tích hợp Auto-Tune Self-Healing)
 * Cách dùng: npx tsx scripts/build_timeline.ts <storyboard.json> <audio-dir> <output-timeline.json> [--allow-short] [--no-auto-tune]
 */
function runBuildTimeline(storyboardPath: string, audioDir: string, outputPath: string, isSmokeTest: boolean, allowAutoTune: boolean): void {
  const minDurationSec = isSmokeTest ? 10 : 110;
  const maxDurationSec = isSmokeTest ? 35 : 130;
  const targetOptimalSec = isSmokeTest ? 18 : 120;
  const fps = 30;

  console.log(`\n======================================================`);
  console.log(`⏱️ BẮT ĐẦU CỔNG 2: BUILD & VALIDATE TIMELINE (V2.2 AUTO-TUNE)`);
  console.log(`📁 Storyboard: ${storyboardPath}`);
  console.log(`🔊 Thư mục Audio: ${audioDir}`);
  console.log(`📤 Xuất Timeline: ${outputPath}`);
  console.log(`🎯 Dải thời lượng mục tiêu: ${minDurationSec}s – ${maxDurationSec}s`);
  console.log(`⚡ Cơ chế Auto-Tune (Self-Healing): ${allowAutoTune ? "BẬT" : "TẮT"}`);
  console.log(`======================================================\n`);

  if (!fs.existsSync(storyboardPath)) {
    console.error(`❌ Lỗi: File storyboard không tồn tại: ${storyboardPath}`);
    process.exit(1);
  }

  const rawStoryboard = JSON.parse(fs.readFileSync(storyboardPath, "utf-8"));
  const validatedStoryboard = StoryboardSchema.parse(rawStoryboard);

  let currentStartFrame = 0;
  let totalDurationSec = 0;
  const timelineScenes: TimelineScene[] = [];
  const totalSceneCount = validatedStoryboard.scenes.length;

  for (let idx = 0; idx < totalSceneCount; idx++) {
    const scene = validatedStoryboard.scenes[idx];
    const isLastScene = idx === totalSceneCount - 1;
    const audioFileName = `${scene.id}.mp3`;
    const fullAudioPath = path.join(audioDir, audioFileName);
    const fullVttPath = path.join(audioDir, `${scene.id}.vtt`);
    const relativeAudioPath = path.join("runs", validatedStoryboard.slug, "audio", audioFileName).replace(/\\/g, "/");

    let rawAudioDurationSec = scene.estimatedDurationSec || 5.0;
    if (fs.existsSync(fullAudioPath)) {
      rawAudioDurationSec = getAudioDurationSec(fullAudioPath);
      console.log(`🎵 [${scene.id}] Audio tìm thấy: ${audioFileName} -> Thời lượng gốc: ${rawAudioDurationSec}s`);
      // Đồng bộ vào public/ để Remotion staticFile phục vụ khi render
      const publicAudioDir = path.join("public", "runs", validatedStoryboard.slug, "audio");
      if (!fs.existsSync(publicAudioDir)) {
        fs.mkdirSync(publicAudioDir, { recursive: true });
      }
      fs.copyFileSync(fullAudioPath, path.join(publicAudioDir, audioFileName));
      if (fs.existsSync(fullVttPath)) {
        fs.copyFileSync(fullVttPath, path.join(publicAudioDir, `${scene.id}.vtt`));
      }
    } else {
      console.warn(`⚠️ [${scene.id}] Chưa có file audio thực tế, sử dụng thời lượng ước tính: ${rawAudioDurationSec}s`);
    }

    // Audio Breathing Room Padding:
    // - Pre-roll: 6 frames (0.2s) cho visual ổn định trước khi phát giọng
    // - Post-roll: 12 frames (0.4s), hoặc 18 frames (0.6s) cho cảnh kết thúc
    const preRollFrames = 6;
    const postRollFrames = isLastScene ? 18 : 12;
    const audioDurationInFrames = Math.ceil(rawAudioDurationSec * fps);
    const durationInFrames = preRollFrames + audioDurationInFrames + postRollFrames;
    const durationSec = Math.round((durationInFrames / fps) * 100) / 100;

    // Sinh phụ đề Cues đồng bộ chính xác (mỗi cue <= 10 từ)
    const subtitles = generateSubtitleCues(
      fullVttPath,
      scene.voiceoverText,
      preRollFrames,
      rawAudioDurationSec,
      fps
    );
    console.log(`   📝 Subtitle Cues: ${subtitles.length} cues được gắn kết`);

    // Xử lý đồng bộ file visual media (ảnh / video) nếu có
    let sceneVisual = scene.visual ? { ...scene.visual } : undefined;
    if (sceneVisual && sceneVisual.file) {
      const mediaFileName = path.basename(sceneVisual.file);
      const sourceMediaDir = path.join("runs", validatedStoryboard.slug, "media");
      const fullMediaPath = path.join(sourceMediaDir, mediaFileName);
      const publicMediaDir = path.join("public", "runs", validatedStoryboard.slug, "media");
      const relativeMediaPath = path.posix.join("runs", validatedStoryboard.slug, "media", mediaFileName);

      if (fs.existsSync(fullMediaPath)) {
        if (!fs.existsSync(publicMediaDir)) {
          fs.mkdirSync(publicMediaDir, { recursive: true });
        }
        fs.copyFileSync(fullMediaPath, path.join(publicMediaDir, mediaFileName));
        console.log(`🖼️ [${scene.id}] Media tìm thấy & đồng bộ: ${mediaFileName}`);

        // Nếu là video, đo thời lượng để tính clipDurationInFrames cho auto-loop
        if (sceneVisual.type === "video") {
          try {
            const probeCmd = `npx remotion ffprobe -v error -show_entries format=duration -of json "${fullMediaPath}"`;
            const probeOut = execSync(probeCmd, { encoding: "utf-8" });
            const probeJson = JSON.parse(probeOut);
            const clipSec = parseFloat(probeJson.format?.duration);
            if (!isNaN(clipSec) && clipSec > 0) {
              const clipFrames = Math.round(clipSec * fps);
              sceneVisual = {
                ...sceneVisual,
                clipDurationInFrames: clipFrames,
              } as any;
              console.log(`🎬 [${scene.id}] Video clip duration: ${clipSec}s (${clipFrames} frames)`);
            }
          } catch (err: any) {
            console.warn(`⚠️ Không thể đo thời lượng clip video:`, err.message);
          }
        }

        if (sceneVisual) {
          sceneVisual.file = relativeMediaPath;
        }
      } else {
        console.warn(`⚠️ [${scene.id}] File media không tìm thấy tại: ${fullMediaPath}`);
      }
    }

    timelineScenes.push({
      ...scene,
      audioFile: relativeAudioPath,
      audioStartFrame: preRollFrames,
      audioDurationInFrames,
      durationSec,
      durationInFrames,
      startFrame: currentStartFrame,
      visual: sceneVisual,
      subtitles,
    });

    currentStartFrame += durationInFrames;
    totalDurationSec += durationSec;
  }

  const totalDurationInFrames = currentStartFrame;
  const roundedTotalSec = Math.round(totalDurationSec * 10) / 10;

  const timelineData = {
    slug: validatedStoryboard.slug,
    title: validatedStoryboard.title,
    fps,
    width: 1920,
    height: 1080,
    totalDurationSec: roundedTotalSec,
    totalDurationInFrames,
    bgm: {
      file: "system-audio/bgm_ambient.wav",
      volume: 0.08,
      loop: true,
      fadeInFrames: 30,
      fadeOutFrames: 45,
    },
    scenes: timelineScenes,
  };

  // Validate bằng TimelineSchema
  const timelineParse = TimelineSchema.safeParse(timelineData);
  if (!timelineParse.success) {
    console.error(`❌ Lỗi vi phạm TimelineSchema:`);
    timelineParse.error.issues.forEach((e) => console.error(`   - ${e.path.join(".")}: ${e.message}`));
    process.exit(1);
  }

  // Kiểm tra thời lượng tổng
  console.log(`\n📊 TỔNG KẾT DÒNG THỜI GIAN:`);
  console.log(`   - Tổng số cảnh: ${timelineScenes.length}`);
  console.log(`   - Tổng số frames: ${totalDurationInFrames} frames (@ 30fps)`);
  console.log(`   - Tổng thời lượng thực tế: ${roundedTotalSec}s (Ngưỡng cho phép: ${minDurationSec}s – ${maxDurationSec}s)`);

  if (roundedTotalSec < minDurationSec || roundedTotalSec > maxDurationSec) {
    // Kiểm tra xem độ lệch có nằm trong vùng dung sai có thể cứu vãn (Recoverable Tolerance)
    const isRecoverable = isSmokeTest
      ? (roundedTotalSec >= 7 && roundedTotalSec < minDurationSec) || (roundedTotalSec > maxDurationSec && roundedTotalSec <= 45)
      : (roundedTotalSec >= 100 && roundedTotalSec < minDurationSec) || (roundedTotalSec > maxDurationSec && roundedTotalSec <= 145);

    if (allowAutoTune && isRecoverable) {
      const deltaRatio = (roundedTotalSec - targetOptimalSec) / targetOptimalSec;
      // Nếu thừa thời gian -> tăng tốc đọc (+X%); nếu thiếu thời gian -> giảm tốc đọc (-X%)
      let ratePercent = Math.round(deltaRatio * 100);
      ratePercent = Math.max(-8, Math.min(8, ratePercent)); // Giới hạn an toàn trong khoảng [-8%, +8%]
      const rateSign = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

      console.log(`\n⚡ [AUTO-TUNE SELF-HEALING KÍCH HOẠT]`);
      console.log(`   - Độ lệch thời lượng: ${roundedTotalSec}s so với mục tiêu ${targetOptimalSec}s`);
      console.log(`   - Tự động điều chỉnh tốc độ đọc Edge-TTS với tham số: --rate=${rateSign}`);
      console.log(`   - Đang tái sinh voice-over và cập nhật lại timeline...\n`);

      try {
        execSync(`npx tsx scripts/generate_voiceover.ts "${storyboardPath}" --rate=${rateSign} --overwrite`, { stdio: "inherit" });
        // Tái đo lường với cờ allowAutoTune = false (chỉ retry 1 lần duy nhất)
        return runBuildTimeline(storyboardPath, audioDir, outputPath, isSmokeTest, false);
      } catch (err: any) {
        console.error(`❌ Thử nghiệm Auto-Tune thất bại:`, err.message);
      }
    }

    console.error(`❌ Lỗi: Tổng thời lượng (${roundedTotalSec}s) nằm ngoài dải mục tiêu (${minDurationSec}s – ${maxDurationSec}s).`);
    console.error(`👉 Hãy điều chỉnh lại số từ hoặc kịch bản phân cảnh tại Cổng 1.`);
    process.exit(1);
  }

  // Ghi ra file timeline.json
  fs.writeFileSync(outputPath, JSON.stringify(timelineData, null, 2), "utf-8");
  console.log(`💾 Đã ghi file timeline.json thành công vào: ${outputPath}`);
  console.log(`\n🎉 CỔNG 2 (BUILD & VALIDATE TIMELINE): PASSED HOÀN TOÀN!`);
}

function main() {
  const args = process.argv.slice(2);
  const storyboardPath = args[0] || "runs/smoke-test/storyboard.json";
  const audioDir = args[1] || path.join(path.dirname(storyboardPath), "audio");
  const outputPath = args[2] || path.join(path.dirname(storyboardPath), "timeline.json");

  const isSmokeTest = args.includes("--allow-short") || storyboardPath.includes("smoke-test");
  const allowAutoTune = !args.includes("--no-auto-tune");

  runBuildTimeline(storyboardPath, audioDir, outputPath, isSmokeTest, allowAutoTune);
}

main();
