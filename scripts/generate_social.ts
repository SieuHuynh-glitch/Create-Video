import fs from "fs";
import path from "path";
import { TimelineSchema } from "../src/schema";

/**
 * ĐỊNH DẠNG SỐ GIÂY THÀNH CHUỖI MM:SS (YOUTUBE TIMESTAMPS CHUẨN)
 */
function formatTimestamp(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * TỰ ĐỘNG XUẤT BẢN TÀI LIỆU MARKETING & SEO CHO VIDEO
 * Cách dùng: npx tsx scripts/generate_social.ts <slug | path/to/timeline.json>
 */
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("❌ Cách dùng: npx tsx scripts/generate_social.ts <slug | path/to/timeline.json>");
    process.exit(1);
  }

  let inputPath = args[0];
  let slug = "";

  if (fs.existsSync(inputPath)) {
    if (inputPath.endsWith("timeline.json")) {
      slug = path.basename(path.dirname(inputPath));
    } else {
      slug = path.basename(inputPath);
      inputPath = path.join(inputPath, "timeline.json");
    }
  } else {
    slug = inputPath;
    inputPath = path.join("runs", slug, "timeline.json");
  }

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Không tìm thấy file timeline: ${inputPath}`);
    process.exit(1);
  }

  console.log(`\n======================================================`);
  console.log(`📢 KHỞI TẠO BỘ TÀI LIỆU XUẤT BẢN SEO & SOCIAL MARKETING`);
  console.log(`📁 Dự án (Slug): ${slug}`);
  console.log(`🕒 Nguồn dữ liệu thời gian: ${inputPath}`);
  console.log(`======================================================\n`);

  const runDir = path.dirname(inputPath);
  const rawTimeline = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  const timeline = TimelineSchema.parse(rawTimeline);

  // Đọc thêm storyboard hoặc brief nếu có để làm giàu nội dung
  let videoTitle = slug.replace(/-/g, " ").toUpperCase();
  const storyboardPath = path.join(runDir, "storyboard.json");
  if (fs.existsSync(storyboardPath)) {
    try {
      const sb = JSON.parse(fs.readFileSync(storyboardPath, "utf-8"));
      if (sb.title) videoTitle = sb.title;
    } catch {}
  }

  // 1. TÍNH TOÁN YOUTUBE CHAPTERS / TIMESTAMPS (THUẬT TOÁN GỘP THÔNG MINH >= 10S)
  interface ChapterItem {
    timeStr: string;
    seconds: number;
    title: string;
    sceneId: string;
  }

  const rawChapters: { seconds: number; title: string; sceneId: string }[] = [];

  for (let i = 0; i < timeline.scenes.length; i++) {
    const scene = timeline.scenes[i];
    const seconds = i === 0 ? 0 : Math.round(scene.startFrame / timeline.fps);

    let chapterTitle = scene.onScreenText?.title || "";
    if (!chapterTitle) {
      if (scene.type === "title") chapterTitle = "Mở Đầu & Đặt Vấn Đề";
      else if (scene.type === "bullets") chapterTitle = "Các Điểm Trọng Tâm";
      else if (scene.type === "stat") chapterTitle = "Số Liệu & Thực Tế";
      else if (scene.type === "quote") chapterTitle = "Thông Điệp Cốt Lõi";
      else if (scene.type === "outro") chapterTitle = "Kết Luận & Hành Động";
      else chapterTitle = `Khám Phá: ${scene.id}`;
    }

    rawChapters.push({
      seconds,
      title: chapterTitle,
      sceneId: scene.id,
    });
  }

  // Thuật toán gộp thông minh tuân thủ 3 quy tắc của YouTube:
  // 1. Mốc đầu tiên luôn là 00:00
  // 2. Mỗi chapter cách nhau tối thiểu >= 10 giây
  // 3. Có ít nhất 3 chapters (nếu video đủ dài >= 30s)
  const chapters: ChapterItem[] = [];

  for (let i = 0; i < rawChapters.length; i++) {
    const curr = rawChapters[i];
    if (i === 0) {
      chapters.push({
        timeStr: "00:00",
        seconds: 0,
        title: curr.title,
        sceneId: curr.sceneId,
      });
      continue;
    }

    const prev = chapters[chapters.length - 1];
    const diff = curr.seconds - prev.seconds;

    // Chỉ tạo chapter mới nếu khoảng cách với mốc trước >= 10 giây
    if (diff >= 10) {
      chapters.push({
        timeStr: formatTimestamp(curr.seconds),
        seconds: curr.seconds,
        title: curr.title,
        sceneId: curr.sceneId,
      });
    } else {
      // Nếu ngắn hơn 10s (như cảnh Hook 5s đầu), gộp tiêu đề vào chapter trước
      if (prev.title && !prev.title.includes(curr.title) && prev.title.length < 45) {
        prev.title = `${prev.title} - ${curr.title}`;
      }
    }
  }

  // Đảm bảo đủ ít nhất 3 chapters nếu video >= 25s
  const totalDuration = timeline.totalDurationSec || (timeline.totalDurationInFrames / timeline.fps);
  if (chapters.length < 3 && totalDuration >= 25) {
    const midSec = Math.floor(totalDuration / 2);
    if (midSec >= 10 && !chapters.some((c) => Math.abs(c.seconds - midSec) < 10)) {
      chapters.splice(1, 0, {
        timeStr: formatTimestamp(midSec),
        seconds: midSec,
        title: "Chi Tiết Thực Trạng & Phân Tích",
        sceneId: "midpoint",
      });
    }
  }

  const durationMinSec = formatTimestamp(timeline.totalDurationInFrames / timeline.fps);

  // 2. TẠO NỘI DUNG MARKDOWN ĐẦY ĐỦ
  const socialMarkdown = `# BỘ TÀI LIỆU XUẤT BẢN & SEO: ${videoTitle}

- **Dự án (Slug):** \`${slug}\`
- **Thời lượng video:** \`${durationMinSec}\` (${timeline.totalDurationSec.toFixed(1)} giây - ${timeline.totalDurationInFrames} frames @ ${timeline.fps}fps)
- **Tự động sinh lúc:** ${new Date().toLocaleString("vi-VN")}

---

## 🎯 1. GỢI Ý TIÊU ĐỀ VIDEO (HIGH CTR TITLES)

Hãy chọn 1 trong 3 phong cách tiêu đề sau tùy theo nền tảng phân phối:

1. **Phong cách Kích thích Tò mò (YouTube / Facebook Reels):**
   > **${videoTitle}: Bí Mật Mà 90% Mọi Người Đang Hiểu Sai?**
2. **Phong cách Lợi ích Trực tiếp (TikTok / YouTube Shorts):**
   > **Cách Tối Ưu Hóa Quy Trình Với ${videoTitle} Cực Đơn Giản Trong 2 Phút**
3. **Phong cách Cảnh báo & Khẩn cấp (LinkedIn / Fanpage):**
   > **Đừng Vội Làm Gì Nếu Bạn Chưa Nắm Rõ Điều Này Về ${videoTitle}!**

---

## 🕒 2. YOUTUBE TIMESTAMPS / VIDEO CHAPTERS

Copy toàn bộ đoạn dưới đây và dán thẳng vào phần mô tả của video trên YouTube:

\`\`\`text
TIMESTAMPS / MỤC LỤC VIDEO:
${chapters.map((c) => `${c.timeStr} - ${c.title}`).join("\n")}
\`\`\`

---

## 📝 3. ĐOẠN MÔ TẢ VIDEO CHUẨN SEO (YOUTUBE / FACEBOOK)

\`\`\`markdown
📌 Trong video này, chúng ta sẽ cùng khám phá chi tiết về "${videoTitle}". 

Nếu bạn đang tìm kiếm giải pháp tối ưu, tiết kiệm thời gian và nâng cao chất lượng công việc thì đây chính là video dành riêng cho bạn!

🔥 NỘI DUNG NỔI BẬT:
${chapters.map((c) => `• ${c.timeStr} : ${c.title}`).join("\n")}

🔔 Đừng quên bấm LIKE, SHARE và ĐĂNG KÝ KÊNH để không bỏ lỡ những video hữu ích tiếp theo!
💬 Để lại bình luận bên dưới câu hỏi hoặc góc nhìn của bạn nhé!

#${slug.replace(/-/g, "")} #AI #Automation #VideoProduction #TechTrends #TuDongHoa
\`\`\`

---

## 🏷️ 4. BỘ HASHTAGS ĐỀ XUẤT (15 - 20 HASHTAGS)

### Phân tầng theo nền tảng:
- **YouTube Tags:** 
  \`${slug}, ${videoTitle.toLowerCase()}, trí tuệ nhân tạo, tự động hóa, làm video tự động, công nghệ mới, hướng dẫn chi tiết, kiến thức hữu ích, xu hướng công nghệ, video marketing\`
- **TikTok / Reels Hashtags:**
  \`#fyp #xuhuong #${slug.replace(/-/g, "")} #learnontiktok #congnghe #tudonghoa #review #meohay #videoai #videoproduction\`
- **LinkedIn / B2B Hashtags:**
  \`#Innovation #Productivity #Automation #VideoTech #DigitalTransformation #FutureOfWork\`

---

## 📱 5. BÀI ĐĂNG NGẮN CHO MẠNG XÃ HỘI (SOCIAL MICRO-POST)

### Bản đăng Facebook Fanpage / LinkedIn:
> 🚀 **Đột phá quy trình với: ${videoTitle}**
> 
> Bạn có đang tốn quá nhiều thời gian cho các công việc lặp đi lặp lại? 
> Chỉ trong ${durationMinSec}, video này sẽ hé lộ cho bạn góc nhìn hoàn toàn mới giúp tăng tốc năng suất vượt trội.
> 
> 👉 Xem ngay video đầy đủ và để lại suy nghĩ của bạn bên dưới!
> 
> 🔗 Link video: [Chèn link video của bạn tại đây]
> 
> #${slug.replace(/-/g, "")} #CongNghe #TuDongHoa #HieuQuaCongViec
`;

  const outputPath = path.join(runDir, "social.md");
  fs.writeFileSync(outputPath, socialMarkdown, "utf-8");

  console.log(`✅ Đã xuất bản thành công tài liệu SEO & Social:`);
  console.log(`   📄 Đường dẫn: ${outputPath}`);
  console.log(`   🕒 Số mốc thời gian YouTube đã sinh: ${chapters.length}`);
  console.log(`======================================================\n`);
}

main().catch((err) => {
  console.error("❌ Lỗi khi sinh social marketing:", err);
  process.exit(1);
});
