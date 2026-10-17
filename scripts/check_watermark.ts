import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export type WatermarkStatus = "not_detected" | "suspected" | "unknown";

export interface WatermarkCheckResult {
  file: string;
  watermarkStatus: WatermarkStatus;
  cornerDetails: {
    tl: number;
    tr: number;
    bl: number;
    br: number;
  };
  note: string;
}

/**
 * KIỂM ĐỊNH WATERMARK 4 GÓC (V4.2 HARDENING)
 * - Đánh giá bất thường cạnh/chữ ở 4 góc ảnh bằng Gradient Energy
 * - Không tự ý inpaint, feather hay crop che giấu watermark
 * - Chỉ gắn cờ minh bạch: "not_detected" | "suspected" | "unknown"
 * - Lưu ý: Phép đo này KHÔNG phát hiện được watermark vô hình (steganographic watermarks)
 */
export function analyzeCornerWatermark(imagePath: string): WatermarkCheckResult {
  const baseName = path.basename(imagePath);
  const defaultNote = "Phép đo 4 góc chỉ phát hiện dấu hiệu logo/chữ thị giác lộ diện; không phát hiện watermark vô hình.";

  if (!fs.existsSync(imagePath)) {
    return {
      file: baseName,
      watermarkStatus: "unknown",
      cornerDetails: { tl: 0, tr: 0, bl: 0, br: 0 },
      note: "File không tồn tại",
    };
  }

  try {
    const pyScript = [
      "import sys",
      "from PIL import Image",
      "import numpy as np",
      "img = Image.open(sys.argv[1]).convert('L')",
      "arr = np.array(img, dtype=np.float32)",
      "h, w = arr.shape",
      "cw, ch = min(120, w // 6), min(80, h // 6)",
      "tl_gy, tl_gx = np.gradient(arr[:ch, :cw]); tl = float(np.mean(np.sqrt(tl_gx**2 + tl_gy**2)))",
      "tr_gy, tr_gx = np.gradient(arr[:ch, w-cw:]); tr = float(np.mean(np.sqrt(tr_gx**2 + tr_gy**2)))",
      "bl_gy, bl_gx = np.gradient(arr[h-ch:, :cw]); bl = float(np.mean(np.sqrt(bl_gx**2 + bl_gy**2)))",
      "br_gy, br_gx = np.gradient(arr[h-ch:, w-cw:]); br = float(np.mean(np.sqrt(br_gx**2 + br_gy**2)))",
      "print(f'{tl:.2f},{tr:.2f},{bl:.2f},{br:.2f}')",
    ].join("; ");

    const out = execSync(`python -c "${pyScript}" "${imagePath}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    const [tl, tr, bl, br] = out.split(",").map(Number);
    // Ngưỡng nghi ngờ: nếu bất kỳ góc nào có gradient energy > 14.0 (nét chữ/logo sắc nhọn trên nền đơn sắc)
    const maxEnergy = Math.max(tl, tr, bl, br);
    const watermarkStatus: WatermarkStatus = maxEnergy > 14.0 ? "suspected" : "not_detected";

    return {
      file: baseName,
      watermarkStatus,
      cornerDetails: { tl, tr, bl, br },
      note: defaultNote,
    };
  } catch {
    return {
      file: baseName,
      watermarkStatus: "unknown",
      cornerDetails: { tl: 0, tr: 0, bl: 0, br: 0 },
      note: defaultNote,
    };
  }
}
