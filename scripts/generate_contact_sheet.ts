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

  const cropsDir = path.join(outDir, "crops");
  if (!fs.existsSync(cropsDir)) {
    fs.mkdirSync(cropsDir, { recursive: true });
  }

  // 1. Xuất Crop góc 1:1 để soi watermark ẩn danh (Đặc biệt góc dưới cùng bên phải)
  console.log(`🔍 Đang trích xuất ảnh crop góc 1:1 vào ${cropsDir} để soi watermark...`);
  for (const file of files) {
    const baseName = path.basename(file, path.extname(file));
    const fullPath = path.join(mediaDir, file);
    const brCropPath = path.join(cropsDir, `${baseName}_corner_br.png`);

    // Crop góc dưới phải 320x160 tỷ lệ 1:1
    const cropCmd = `npx remotion ffmpeg -y -i "${fullPath}" -vf "crop=320:160:in_w-320:in_h-160" "${brCropPath}"`;
    try {
      execSync(cropCmd, { stdio: "pipe" });
    } catch (err: any) {
      console.warn(`   ⚠️ Không thể crop góc cho ${file}: ${err.message}`);
    }
  }
  console.log(`   ✅ Đã trích xuất xong các ảnh crop góc (Bottom-Right) vào: ${cropsDir}`);

  // 2. Phân trang Contact Sheet (Tối đa 6 ảnh / trang)
  const pageSize = 6;
  const thumbWidth = 640;
  const thumbHeight = 360;
  const totalPages = Math.ceil(files.length / pageSize);

  console.log(`📄 Phân chia ${files.length} ảnh thành ${totalPages} trang Contact Sheet (tối đa ${pageSize} ảnh/trang)...`);

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const pageFiles = files.slice(pageIdx * pageSize, (pageIdx + 1) * pageSize);
    const pageOutName = totalPages === 1 ? "contact_sheet.png" : `contact_sheet_p${pageIdx + 1}.png`;
    const pageOutPath = path.join(outDir, pageOutName);

    let cmd = "";

    if (pageFiles.length === 1) {
      const singlePath = path.join(mediaDir, pageFiles[0]);
      cmd = `npx remotion ffmpeg -y -i "${singlePath}" -vf "scale=${thumbWidth}:${thumbHeight}:force_original_aspect_ratio=increase,crop=${thumbWidth}:${thumbHeight}" "${pageOutPath}"`;
    } else {
      const cols = pageFiles.length <= 2 ? pageFiles.length : 3;
      const inputArgs: string[] = [];
      const filterInputs: string[] = [];
      const layoutCoords: string[] = [];

      pageFiles.forEach((file, idx) => {
        const fullPath = path.join(mediaDir, file);
        inputArgs.push(`-i "${fullPath}"`);

        const colIndex = idx % cols;
        const rowIndex = Math.floor(idx / cols);
        const x = colIndex * thumbWidth;
        const y = rowIndex * thumbHeight;
        layoutCoords.push(`${x}_${y}`);

        filterInputs.push(`[${idx}:v]scale=${thumbWidth}:${thumbHeight}:force_original_aspect_ratio=increase,crop=${thumbWidth}:${thumbHeight}[v${idx}]`);
      });

      const vInputs = pageFiles.map((_, i) => `[v${i}]`).join("");
      const layoutStr = layoutCoords.join("|");
      const filterComplex = `${filterInputs.join(";")};${vInputs}xstack=inputs=${pageFiles.length}:layout=${layoutStr}[out]`;

      cmd = `npx remotion ffmpeg -y ${inputArgs.join(" ")} -filter_complex "${filterComplex}" -map "[out]" "${pageOutPath}"`;
    }

    try {
      console.log(`   ⏳ Đang render trang ${pageIdx + 1}/${totalPages} (${pageFiles.length} ảnh)...`);
      execSync(cmd, { stdio: "pipe" });

      if (fs.existsSync(pageOutPath)) {
        const stats = fs.statSync(pageOutPath);
        console.log(`   ✅ Đã tạo: ${pageOutName} (${(stats.size / 1024).toFixed(1)} KB)`);
        // Nếu có nhiều trang, tạo bản sao p1 thành contact_sheet.png cho tương thích
        if (totalPages > 1 && pageIdx === 0) {
          fs.copyFileSync(pageOutPath, contactSheetPath);
        }
      }
    } catch (err: any) {
      console.error(`   ❌ Lỗi khi tạo trang ${pageIdx + 1}: ${err.message}`);
    }
  }

  console.log(`\n======================================================`);
  console.log(`✅ HOÀN TẤT LẬP BẢNG TIẾP XÚC THỊ GIÁC (CONTACT SHEET V2.5)!`);
  console.log(`👉 Người vận hành tại Chốt 1.5:`);
  console.log(`   1. Mở xem lướt trang tổng hợp: ${contactSheetPath}`);
  console.log(`   2. Mở thư mục ${cropsDir} soi nhanh các góc ảnh tỷ lệ 1:1 để diệt watermark & chữ rác.`);
  console.log(`======================================================\n`);
}

main().catch((err) => {
  console.error("❌ Lỗi nghiêm trọng:", err);
  process.exit(1);
});
