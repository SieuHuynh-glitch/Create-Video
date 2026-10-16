import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export interface VisualDNA {
  type: "HIGH_KEY_MONOCHROME_WHITE_BG" | "COLOR_DYNAMIC";
  avgLuminance: number; // YAVG 0-255
  cornerLuminance: number; // cornerYAVG 0-255
  avgSaturation: number; // SATAVG 0-255
  stylePrompt: string;
}

export interface ExpansionResult {
  slug: string;
  visualDNA: VisualDNA;
  originalCount: number;
  generatedCount: number;
  totalAnchors: number;
  allAnchorPaths: string[];
}

/**
 * Đo thông số Visual DNA thực tế bằng FFmpeg signalstats
 */
export function measureVisualDNA(sampleImagePath: string): VisualDNA {
  let avgLuminance = 240;
  let cornerLuminance = 250;
  let avgSaturation = 0;

  try {
    const pyScript = [
      "import sys",
      "from PIL import Image",
      "import numpy as np",
      "img = Image.open(sys.argv[1]).convert('RGB')",
      "arr = np.array(img, dtype=np.float32)",
      "Y = 0.299 * arr[:,:,0] + 0.587 * arr[:,:,1] + 0.114 * arr[:,:,2]",
      "yavg = float(np.mean(Y))",
      "h, w = Y.shape",
      "c_h, c_w = min(100, h//3), min(100, w//3)",
      "cornery = float((np.mean(Y[:c_h, :c_w]) + np.mean(Y[:c_h, w-c_w:]) + np.mean(Y[h-c_h:, :c_w]) + np.mean(Y[h-c_h:, w-c_w:])) / 4.0)",
      "mx = np.maximum.reduce([arr[:,:,0], arr[:,:,1], arr[:,:,2]])",
      "mn = np.minimum.reduce([arr[:,:,0], arr[:,:,1], arr[:,:,2]])",
      "sat = np.where(mx > 0, (mx - mn) / mx * 255.0, 0)",
      "satavg = float(np.mean(sat))",
      "print(f'{yavg:.2f},{cornery:.2f},{satavg:.2f}')",
    ].join("; ");

    const out = execSync(`python -c "${pyScript}" "${sampleImagePath}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    const [y, cy, sat] = out.split(",").map(Number);
    if (!isNaN(y)) avgLuminance = y;
    if (!isNaN(cy)) cornerLuminance = cy;
    if (!isNaN(sat)) avgSaturation = sat;
  } catch (err: any) {
    console.warn(`⚠️ Chú ý: Không thể chạy đo màu Python: ${err.message}. Sử dụng tham số dự phòng.`);
  }

  const isHighKeyMonochrome = avgSaturation <= 15 && cornerLuminance >= 230;

  const visualType: "HIGH_KEY_MONOCHROME_WHITE_BG" | "COLOR_DYNAMIC" = isHighKeyMonochrome
    ? "HIGH_KEY_MONOCHROME_WHITE_BG"
    : "COLOR_DYNAMIC";

  const stylePrompt = isHighKeyMonochrome
    ? "monochrome black-and-white ink style, isolated on pure solid white #FFFFFF background, high contrast, no color, no grey background, no text, no logos, clean edges"
    : "cinematic color photograph, 8k resolution, professional studio lighting, high detail";

  return {
    type: visualType,
    avgLuminance: Math.round(avgLuminance),
    cornerLuminance: Math.round(cornerLuminance),
    avgSaturation: Math.round(avgSaturation),
    stylePrompt,
  };
}

/**
 * Tải ảnh từ Pollinations Image FLUX.1 (100% Miễn phí 0 Pollen)
 */
async function downloadFluxImage(
  prompt: string,
  outputPath: string,
  seed: number,
  width = 1920,
  height = 1080
): Promise<boolean> {
  const cleanPrompt = prompt
    .replace(/--[a-zA-Z0-9_-]+(\s+[^\s,]+)?/g, "")
    .replace(/\b16:9\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=${width}&height=${height}&model=flux&seed=${seed}&nologo=true`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const cType = res.headers.get("content-type") || "";
      if (!cType.startsWith("image/")) throw new Error(`Content-Type không phải ảnh: ${cType}`);

      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 30000) throw new Error(`File ảnh quá nhỏ (${buffer.length} bytes)`);

      fs.writeFileSync(outputPath, buffer);
      return true;
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn(`   ⚠️ Thử tải ảnh lần ${attempt} thất bại: ${err.message}`);
      if (attempt < 2) await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return false;
}

/**
 * BƯỚC 0.2: THẨM ĐỊNH VISUAL DNA VÀ SINH BÙ ẢNH NEO (REFERENCE EXPANDER)
 * Cách dùng: npx tsx scripts/expand_references.ts <slug> [--min-anchors 10]
 */
export async function expandReferences(
  slug: string,
  minAnchors = 10
): Promise<ExpansionResult> {
  console.log(`\n======================================================`);
  console.log(`📸 [BƯỚC 0.2] CỔNG ĐO LƯỜNG VISUAL DNA & SINH BÙ ẢNH NEO: ${slug}`);
  console.log(`🎯 Ngưỡng ảnh neo tối thiểu (N_min): ${minAnchors}`);
  console.log(`======================================================\n`);

  const inputDir = path.join("inputs", slug);
  const imagesDir = path.join(inputDir, "images");
  const runDir = path.join("runs", slug);
  const genAnchorsDir = path.join(runDir, "media", "generated_anchors");

  if (!fs.existsSync(genAnchorsDir)) {
    fs.mkdirSync(genAnchorsDir, { recursive: true });
  }

  // 1. Quét danh sách ảnh gốc
  let originalFiles: string[] = [];
  if (fs.existsSync(imagesDir)) {
    originalFiles = fs
      .readdirSync(imagesDir)
      .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
      .sort();
  }

  console.log(`📂 Ảnh gốc trong inputs/${slug}/images/: ${originalFiles.length} ảnh`);

  // 2. Đo lường Visual DNA trên ảnh mẫu
  let visualDNA: VisualDNA = {
    type: "HIGH_KEY_MONOCHROME_WHITE_BG",
    avgLuminance: 245,
    cornerLuminance: 255,
    avgSaturation: 0,
    stylePrompt: "monochrome black-and-white ink style, isolated on pure solid white #FFFFFF background, high contrast",
  };

  if (originalFiles.length > 0) {
    const samplePath = path.join(imagesDir, originalFiles[0]);
    console.log(`🔬 Đang đo Visual DNA qua FFmpeg signalstats trên: ${originalFiles[0]}...`);
    visualDNA = measureVisualDNA(samplePath);
    console.log(`   - Loại phong cách: [${visualDNA.type}]`);
    console.log(`   - Độ sáng trung bình (YAVG): ${visualDNA.avgLuminance} / 255`);
    console.log(`   - Độ sáng 4 góc (cornerYAVG): ${visualDNA.cornerLuminance} / 255`);
    console.log(`   - Độ bão hòa màu (SATAVG): ${visualDNA.avgSaturation} / 255`);
  }

  const allAnchorPaths: string[] = [];
  originalFiles.forEach((f) => allAnchorPaths.push(path.join(imagesDir, f)));

  // 3. Kiểm tra số lượng và sinh bù nếu thiếu
  const needed = Math.max(0, minAnchors - originalFiles.length);
  let generatedCount = 0;

  if (needed > 0) {
    console.log(`\n⚠️ Phát hiện thiếu ảnh: Cần tối thiểu ${minAnchors} ảnh, hiện có ${originalFiles.length}.`);
    console.log(`🚀 Bắt đầu sinh bù ${needed} ảnh neo qua Pollinations Image FLUX.1 (100% Free)...`);

    for (let i = 1; i <= needed; i++) {
      const anchorName = `anchor_${String(originalFiles.length + i).padStart(2, "0")}.jpg`;
      const anchorPath = path.join(genAnchorsDir, anchorName);

      if (fs.existsSync(anchorPath) && fs.statSync(anchorPath).size > 30000) {
        console.log(`⏭️ [${i}/${needed}] Ảnh sinh bù đã tồn tại: ${anchorName}`);
        allAnchorPaths.push(anchorPath);
        generatedCount++;
        continue;
      }

      const prompt = `Surreal ink artwork, organic metamorphosis scene ${i}, ${visualDNA.stylePrompt}`;
      const seed = 1000 + i * 237;

      console.log(`🎨 [${i}/${needed}] Đang sinh ${anchorName}...`);
      const ok = await downloadFluxImage(prompt, anchorPath, seed);
      if (ok) {
        console.log(`   ✅ Đã sinh thành công: ${anchorName}`);
        allAnchorPaths.push(anchorPath);
        generatedCount++;
      } else {
        console.warn(`   ❌ Không thể sinh ${anchorName}. Sẽ tái sử dụng ảnh gốc.`);
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  } else {
    console.log(`✅ Số lượng ảnh gốc (${originalFiles.length}) đã đạt yêu cầu (>= ${minAnchors}). Không cần sinh bù.`);
  }

  // 4. Cập nhật manifest.json
  const manifestPath = path.join(runDir, "manifest.json");
  let manifest: any = { slug, visualDNA, anchors: [] };
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    } catch {}
  }

  manifest.visualDNA = visualDNA;
  manifest.totalAnchors = allAnchorPaths.length;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  return {
    slug,
    visualDNA,
    originalCount: originalFiles.length,
    generatedCount,
    totalAnchors: allAnchorPaths.length,
    allAnchorPaths,
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const slug = args[0] || "natural-cycle-v2";
  const min = args[1] ? parseInt(args[1], 10) : 10;
  expandReferences(slug, min).then((res) => {
    console.log(`\n🎉 HOÀN TẤT THẨM ĐỊNH ẢNH: Tổng số ${res.totalAnchors} ảnh neo.`);
  });
}
