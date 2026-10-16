import fs from "fs";
import path from "path";

/**
 * Tính tổng kích thước thư mục (bytes)
 */
function getDirectorySize(dirPath: string): number {
  if (!fs.existsSync(dirPath)) return 0;
  let totalBytes = 0;
  const items = fs.readdirSync(dirPath);
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      totalBytes += getDirectorySize(fullPath);
    } else {
      totalBytes += stats.size;
    }
  }
  return totalBytes;
}

/**
 * Xóa an toàn thư mục
 */
function removeDirRecursive(dirPath: string) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

/**
 * DỌN DẸP BỘ NHỚ VÀ RÁC DỰ ÁN SAU KHI XUẤT VIDEO
 * Cách dùng: npx tsx scripts/clean_run.ts <slug> [--clean-stills]
 */
function main() {
  const args = process.argv.slice(2);
  const slug = args[0];
  const cleanStills = args.includes("--clean-stills");

  if (!slug) {
    console.error("❌ Lỗi: Vui lòng cung cấp slug cần dọn dẹp. Ví dụ: npx tsx scripts/clean_run.ts smoke-test");
    process.exit(1);
  }

  console.log(`\n======================================================`);
  console.log(`🧹 BẮT ĐẦU DỌN DẸP DỮ LIỆU TẠM RUN: ${slug}`);
  console.log(`======================================================\n`);

  let totalReclaimedBytes = 0;

  // 1. Dọn dẹp bản sao trong public/runs/<slug>
  const publicRunDir = path.join("public", "runs", slug);
  if (fs.existsSync(publicRunDir)) {
    const size = getDirectorySize(publicRunDir);
    totalReclaimedBytes += size;
    removeDirRecursive(publicRunDir);
    console.log(`✅ Đã xóa bản sao công khai: ${publicRunDir} (Giải phóng ${(size / (1024 * 1024)).toFixed(2)} MB)`);
  } else {
    console.log(`ℹ️ Thư mục ${publicRunDir} không tồn tại hoặc đã được dọn trước đó.`);
  }

  // 2. Dọn dẹp stills QA nếu được chỉ định
  if (cleanStills) {
    const stillsDir = path.join("runs", slug, "out", "stills");
    if (fs.existsSync(stillsDir)) {
      const size = getDirectorySize(stillsDir);
      totalReclaimedBytes += size;
      removeDirRecursive(stillsDir);
      console.log(`✅ Đã xóa ảnh still QA tạm: ${stillsDir} (Giải phóng ${(size / (1024 * 1024)).toFixed(2)} MB)`);
    }
  }

  const reclaimedMb = (totalReclaimedBytes / (1024 * 1024)).toFixed(2);
  console.log(`\n🎉 HOÀN TẤT DỌN DẸP! Tổng dung lượng giải phóng: ${reclaimedMb} MB.`);
  console.log(`🔒 Thư mục gốc runs/${slug}/out/${slug}.mp4 và các file dữ liệu cốt lõi vẫn được bảo vệ nguyên vẹn.`);
}

main();
