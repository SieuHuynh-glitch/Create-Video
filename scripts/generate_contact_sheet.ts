import fs from "fs";
import path from "path";
import { execSync } from "child_process";

/**
 * TỰ ĐỘNG TẠO CONTACT SHEET (ẢNH LƯỚI TỔNG HỢP TOÀN BỘ CẢNH CÓ ĐÁNH SỐ)
 * Mục đích: Cho phép người vận hành duyệt nhanh toàn bộ hình ảnh tại Chốt 1.5 trong 5 giây,
 * phát hiện ngay watermark, lỗi tay/biến dạng, chữ vô nghĩa từ AI.
 * Cách dùng: npx tsx scripts/generate_contact_sheet.ts <slug | path/to/storyboard.json>
 */
async function main() {
  const args = process.argv.slice(2);
  const inputArg = args[0] || "media-smoke-test";

  let slug = inputArg;
  if (inputArg.includes("storyboard.json")) {
    slug = path.basename(path.dirname(inputArg));
  }

  const runDir = path.join("runs", slug);
  const mediaDir = path.join(runDir, "media");
  const outDir = path.join(runDir, "out");
  const contactSheetPath = path.join(outDir, "contact_sheet.png");

  console.log(`\n======================================================`);
  console.log(`🖼️ KHỞI TẠO BẢN TIẾP XÚC THỊ GIÁC (CONTACT SHEET)`);
  console.log(`📁 Dự án (Slug): ${slug}`);
  console.log(`📂 Thư mục Media: ${mediaDir}`);
  console.log(`📤 Xuất file: ${contactSheetPath}`);
  console.log(`======================================================\n`);

  if (!fs.existsSync(mediaDir)) {
    console.error(`❌ Thư mục media không tồn tại: ${mediaDir}`);
    process.exit(1);
  }

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Quét danh sách ảnh hợp lệ trong thư mục media/
  const files = fs.readdirSync(mediaDir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort();

  if (files.length === 0) {
    console.warn(`⚠️ Không có file ảnh nào trong ${mediaDir} để tạo Contact Sheet.`);
    process.exit(0);
  }

  console.log(`📸 Tìm thấy ${files.length} tệp ảnh media:`, files.join(", "));

  const thumbWidth = 640;
  const thumbHeight = 360;

  let cmd = "";

  if (files.length === 1) {
    const singlePath = path.join(mediaDir, files[0]);
    cmd = `npx remotion ffmpeg -y -i "${singlePath}" -vf "scale=${thumbWidth}:${thumbHeight}:force_original_aspect_ratio=increase,crop=${thumbWidth}:${thumbHeight}" "${contactSheetPath}"`;
  } else {
    // Tính toán số cột và hàng cho lưới (Grid)
    const cols = files.length <= 4 ? files.length : 3;
    const inputArgs: string[] = [];
    const filterInputs: string[] = [];
    const layoutCoords: string[] = [];

    files.forEach((file, idx) => {
      const fullPath = path.join(mediaDir, file);
      inputArgs.push(`-i "${fullPath}"`);

      const colIndex = idx % cols;
      const rowIndex = Math.floor(idx / cols);
      const x = colIndex * thumbWidth;
      const y = rowIndex * thumbHeight;
      layoutCoords.push(`${x}_${y}`);

      filterInputs.push(`[${idx}:v]scale=${thumbWidth}:${thumbHeight}:force_original_aspect_ratio=increase,crop=${thumbWidth}:${thumbHeight}[v${idx}]`);
    });

    const vInputs = files.map((_, i) => `[v${i}]`).join("");
    const layoutStr = layoutCoords.join("|");
    const filterComplex = `${filterInputs.join(";")};${vInputs}xstack=inputs=${files.length}:layout=${layoutStr}[out]`;

    cmd = `npx remotion ffmpeg -y ${inputArgs.join(" ")} -filter_complex "${filterComplex}" -map "[out]" "${contactSheetPath}"`;
  }

  try {
    console.log(`⏳ Đang tổng hợp ảnh lưới qua Remotion FFmpeg...`);
    execSync(cmd, { stdio: "inherit" });

    if (fs.existsSync(contactSheetPath)) {
      const stats = fs.statSync(contactSheetPath);
      console.log(`\n✅ TẠO CONTACT SHEET THÀNH CÔNG!`);
      console.log(`   📄 File: ${contactSheetPath}`);
      console.log(`   📏 Kích thước: ${(stats.size / 1024).toFixed(1)} KB`);
      console.log(`   👉 Người vận hành hãy mở ảnh này để soi: Watermark, Lỗi tay/méo hình, Chữ rác từ AI.`);
      console.log(`======================================================\n`);
    } else {
      throw new Error("File contact sheet không được sinh ra.");
    }
  } catch (err: any) {
    console.error(`❌ Không thể tạo contact sheet: ${err.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Lỗi nghiêm trọng:", err);
  process.exit(1);
});
