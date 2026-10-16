import fs from "fs";
import path from "path";
import { StoryboardSchema } from "../src/schema";

interface CalibrationConfig {
  wordsPerSecond: number;
  wordsPerMinute: number;
  preRollSecPerScene: number;
  postRollSecPerScene: number;
  safetyFactor: number;
  tolerancePercent: number;
}

/**
 * ĐỌC CẤU HÌNH HIỆU CHUẨN TỐC ĐỘ ĐỌC WPM
 */
function loadCalibrationConfig(): CalibrationConfig {
  const configPath = path.join("config", "calibration.json");
  if (!fs.existsSync(configPath)) {
    console.error("❌ Lỗi: Chưa tìm thấy file hiệu chuẩn config/calibration.json.");
    console.error("👉 Vui lòng chạy lệnh hiệu chuẩn trước: npm run calibrate");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

/**
 * CỔNG CHẤT LƯỢNG 1: Kiểm định Kịch bản phân cảnh (Storyboard)
 * Cách dùng: npx tsx scripts/validate_storyboard.ts <path-to-storyboard.json> [--min-scenes=N] [--max-scenes=M] [--allow-short]
 */
function main() {
  const args = process.argv.slice(2);
  const storyboardPath = args[0];

  if (!storyboardPath) {
    console.error("❌ Lỗi: Vui lòng chỉ định đường dẫn đến file storyboard.json");
    console.error("Ví dụ: npx tsx scripts/validate_storyboard.ts runs/smoke-test/storyboard.json");
    process.exit(1);
  }

  const calibration = loadCalibrationConfig();
  const isSmokeTest = args.includes("--allow-short") || storyboardPath.includes("smoke-test");
  const minScenes = isSmokeTest ? 3 : 8;
  const maxScenes = isSmokeTest ? 5 : 15;

  console.log(`\n======================================================`);
  console.log(`🔍 BẮT ĐẦU CỔNG 1: VALIDATE STORYBOARD (V2.4 DATA-DRIVEN)`);
  console.log(`📁 File kiểm tra: ${storyboardPath}`);
  console.log(`🎙️ Tốc độ đọc hiệu chuẩn: ${calibration.wordsPerSecond} từ/giây (${calibration.wordsPerMinute} WPM)`);
  console.log(`🎯 Chế độ: ${isSmokeTest ? "Smoke Test (Ngắn)" : "Sản xuất tiêu chuẩn (~2 phút)"}`);
  console.log(`======================================================\n`);

  if (!fs.existsSync(storyboardPath)) {
    console.error(`❌ Lỗi: File không tồn tại: ${storyboardPath}`);
    process.exit(1);
  }

  let rawData: any;
  try {
    rawData = JSON.parse(fs.readFileSync(storyboardPath, "utf-8"));
  } catch (err: any) {
    console.error(`❌ Lỗi: Cú pháp JSON không hợp lệ:`, err.message);
    process.exit(1);
  }

  // 1. Kiểm tra qua Zod Schema
  const parseResult = StoryboardSchema.safeParse(rawData);
  if (!parseResult.success) {
    console.error(`❌ Lỗi vi phạm Hợp đồng Dữ liệu (Zod Schema):`);
    parseResult.error.issues.forEach((e) => {
      console.error(`   - Đường dẫn [${e.path.join(".")}]: ${e.message}`);
    });
    process.exit(1);
  }

  const storyboard = parseResult.data;
  const scenes = storyboard.scenes;
  console.log(`✅ Hợp đồng dữ liệu Zod: HỢP LỆ (Slug: ${storyboard.slug}, Tiêu đề: "${storyboard.title}")`);

  // 2. Kiểm tra số lượng cảnh
  console.log(`📊 Số lượng cảnh: ${scenes.length} cảnh (Quy định: ${minScenes} – ${maxScenes} cảnh)`);
  if (scenes.length < minScenes || scenes.length > maxScenes) {
    console.error(`❌ Lỗi: Số lượng cảnh (${scenes.length}) nằm ngoài dải cho phép (${minScenes} – ${maxScenes}).`);
    process.exit(1);
  }
  console.log(`✅ Số lượng cảnh: ĐẠT`);

  // 3. Tính toán số từ và thời lượng theo WPM hiệu chuẩn thực tế
  const paddingPerScene = calibration.preRollSecPerScene + calibration.postRollSecPerScene; // 0.6s
  const totalPaddingSec = scenes.length * paddingPerScene;
  const targetDurationSec = storyboard.targetDurationSec || 120;
  const availableSpeakingSec = Math.max(1, targetDurationSec - totalPaddingSec);

  // Công thức khoa học: Từ mục tiêu = Thời gian nói khả dụng * từ/giây * hệ số an toàn (0.95)
  const targetWords = Math.round(availableSpeakingSec * calibration.wordsPerSecond * calibration.safetyFactor);
  const tolerance = calibration.tolerancePercent || 0.08;
  const minAllowedWords = Math.round(targetWords * (1 - tolerance));
  const maxAllowedWords = Math.round(targetWords * (1 + tolerance));

  let totalWords = 0;
  scenes.forEach((scene) => {
    const words = scene.voiceoverText.trim().split(/\s+/).filter(Boolean).length;
    totalWords += words;
    const estSpeechSec = words / calibration.wordsPerSecond;
    const estSceneSec = estSpeechSec + paddingPerScene;
    console.log(`   * [${scene.id}] (${scene.type}): ${words} từ (~${estSpeechSec.toFixed(1)}s giọng nói + 0.6s đệm = ~${estSceneSec.toFixed(1)}s)`);
  });

  const estimatedSpeakingTotal = totalWords / calibration.wordsPerSecond;
  const estimatedTotalDuration = estimatedSpeakingTotal + totalPaddingSec;

  console.log(`\n------------------------------------------------------`);
  console.log(`📝 Tổng số từ thuyết minh: ${totalWords} từ`);
  console.log(`⏱️ Thời lượng ước tính từ WPM thực: ~${estimatedTotalDuration.toFixed(1)}s (Mục tiêu: ${targetDurationSec}s)`);
  console.log(`🎯 Dải từ hợp lệ được tính toán: ${minAllowedWords} – ${maxAllowedWords} từ (Chuẩn: ~${targetWords} từ)`);
  console.log(`------------------------------------------------------`);

  // Đối với smoke-test (thời lượng ngắn <= 20s), áp dụng dung sai mở rộng
  if (isSmokeTest) {
    if (totalWords < 20 || totalWords > 120) {
      console.error(`❌ Lỗi: Tổng số từ (${totalWords}) nằm ngoài giới hạn cho phép của Smoke Test (20 – 120 từ).`);
      process.exit(1);
    }
  } else {
    if (totalWords < minAllowedWords || totalWords > maxAllowedWords) {
      console.error(`❌ Lỗi: Tổng số từ (${totalWords}) không nằm trong dải chuẩn xác (${minAllowedWords} – ${maxAllowedWords} từ).`);
      console.error(`👉 Để video đạt đúng ${targetDurationSec}s với giọng đọc ${calibration.wordsPerMinute} WPM, vui lòng điều chỉnh kịch bản đạt khoảng ${targetWords} từ.`);
      process.exit(1);
    }
  }

  console.log(`✅ Khối lượng lời đọc: ĐẠT CHUẨN XÁC THEO HIỆU CHUẨN THỰC TẾ`);
  console.log(`\n🎉 CỔNG 1 (VALIDATE STORYBOARD): PASSED HOÀN TOÀN!`);
  process.exit(0);
}

main();
