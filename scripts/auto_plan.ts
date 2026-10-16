import fs from "fs";
import path from "path";
import { Timeline, TimelineScene, CameraEase } from "../src/schema";

interface ShotPlan {
  id: string;
  imageFile: string;
  title: string;
  subtitle: string;
  prompt: string;
  cameraEase: CameraEase;
  seed: number;
  priority: number; // 1 = highest
}

const DEFAULT_EASING_SEQUENCE: CameraEase[] = [
  "zoom_in",
  "pan_left",
  "breathing",
  "zoom_out",
  "pan_right",
  "breathing",
];

const ENGLISH_PROMPTS_NATURAL_CYCLE: Record<string, string> = {
  skull:
    "Surreal monochrome black ink drawing on pure white background, feathery skull awakens with organic feathers swaying gently in wind, high contrast, smooth continuous meditative motion, 24fps",
  cracking:
    "Surreal monochrome black ink art on pure white background, delicate cracks spreading across the forehead of the bone skull, charcoal dust rising, high contrast, continuous fluid transformation",
  soil:
    "Surreal monochrome ink illustration on pure white background, skull dissolving into dark organic seeds falling into fertile soil, root fibers emerging, high contrast, smooth motion",
  seedling:
    "Surreal black ink painting on pure white background, tiny organic seedling sprouting upwards through soil, delicate spiraling stem, high contrast, continuous time-lapse motion",
  seedling_zoom:
    "Macro close-up surreal black ink drawing on pure white background, spiraling plant sprout blooming with intricate capillary veins, smooth botanical time-lapse",
  tree_growing:
    "Surreal monochrome ink drawing on pure white background, ancient tree trunk expanding outwards, twisted branches intertwining like neural networks, fluid continuous growth",
  tree_fruits:
    "Surreal monochrome ink painting on pure white background, heavy blooming tree branches laden with miniature skull-shaped fruits gently swaying in breeze",
  fruit_falling:
    "Surreal black ink art on pure white background, miniature skull fruit detaching and falling slowly through space, leaves swirling in gentle vortex, smooth slow-motion",
  skull_return:
    "Surreal monochrome black ink art on pure white background, fallen fruit dissolves into dust and reconstitutes into the original feathered skull, closing eternal cycle",
};

function getPromptForImage(filename: string): string {
  const lower = filename.toLowerCase();
  for (const [key, prompt] of Object.entries(ENGLISH_PROMPTS_NATURAL_CYCLE)) {
    if (lower.includes(key)) {
      return prompt;
    }
  }
  return "Surreal monochrome black ink art on pure white background, meditative fluid motion, organic metamorphosis, high contrast, 24fps";
}

export function generateAutoPlan(
  slug: string,
  targetDurationSec: number = 120,
  customAnchorPaths?: string[]
) {
  console.log(`\n======================================================`);
  console.log(`🧠 TỰ ĐỘNG LẬP KẾ HOẠCH SẢN XUẤT (AUTO PLANNER V4.1)`);
  console.log(`📁 Slug: ${slug}`);
  console.log(`⏱️ Thời lượng mục tiêu: ${targetDurationSec} giây`);
  console.log(`======================================================\n`);

  const inputDir = path.join("inputs", slug);
  const imagesDir = path.join(inputDir, "images");
  const briefPath = path.join(inputDir, "brief.md");
  const enrichedBriefPath = path.join("runs", slug, "enriched_brief.md");

  let projectTitle = "Natural Cycle: The Infinite Monochrome Metamorphosis";
  const effectiveBriefPath = fs.existsSync(enrichedBriefPath) ? enrichedBriefPath : briefPath;
  if (fs.existsSync(effectiveBriefPath)) {
    const briefContent = fs.readFileSync(effectiveBriefPath, "utf-8");
    const titleMatch = briefContent.match(/-\s+\*\*Tiêu đề:\*\*\s*(.+)/i) || briefContent.match(/# (?:BRIEF|ENRICHED BRIEF):\s*(.+)/i);
    if (titleMatch) projectTitle = titleMatch[1].trim();
  }

  const runDir = path.join("runs", slug);
  const runMediaDir = path.join(runDir, "media");
  const pendingJobsDir = path.join("jobs", "pending", slug);
  const doneJobsDir = path.join("jobs", "done", slug);
  const failedJobsDir = path.join("jobs", "failed", slug);
  const manifestPath = path.join(runDir, "manifest.json");

  [runMediaDir, pendingJobsDir, doneJobsDir, failedJobsDir].forEach((d) => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  // 1. Quét danh sách ảnh đầu vào (kết hợp ảnh gốc và ảnh sinh bù nếu có)
  let imageFiles: string[] = [];
  const anchorSources: Record<string, "user-provided" | "ai-generated-anchor (FLUX.1), unverified"> = {};

  if (customAnchorPaths && customAnchorPaths.length > 0) {
    customAnchorPaths.forEach((anchorPath) => {
      const fileName = path.basename(anchorPath);
      const dest = path.join(runMediaDir, fileName);
      if (!fs.existsSync(dest) || fs.statSync(dest).size !== fs.statSync(anchorPath).size) {
        fs.copyFileSync(anchorPath, dest);
      }
      imageFiles.push(fileName);
      anchorSources[fileName] = anchorPath.includes("generated_anchors")
        ? "ai-generated-anchor (FLUX.1), unverified"
        : "user-provided";
    });
  } else {
    if (!fs.existsSync(imagesDir)) {
      throw new Error(`Không tìm thấy thư mục ảnh đầu vào: ${imagesDir}`);
    }
    imageFiles = fs
      .readdirSync(imagesDir)
      .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
      .sort();

    imageFiles.forEach((file) => {
      const src = path.join(imagesDir, file);
      const dest = path.join(runMediaDir, file);
      if (!fs.existsSync(dest) || fs.statSync(dest).size !== fs.statSync(src).size) {
        fs.copyFileSync(src, dest);
      }
      anchorSources[file] = "user-provided";
    });
  }

  if (imageFiles.length === 0) {
    throw new Error(`Không tìm thấy ảnh hợp lệ nào cho dự án ${slug}!`);
  }

  console.log(`📸 Đã tập hợp ${imageFiles.length} ảnh neo trong ${runMediaDir}/:`);
  imageFiles.forEach((f, idx) => console.log(`   [${idx + 1}] ${f} (${anchorSources[f]})`));

  // Cập nhật manifest.json với nguồn gốc ảnh
  let manifestData: any = { slug, media: {} };
  if (fs.existsSync(manifestPath)) {
    try {
      manifestData = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    } catch {}
  }
  if (!manifestData.media) manifestData.media = {};
  imageFiles.forEach((f) => {
    manifestData.media[f] = {
      type: "image",
      source: anchorSources[f],
      license: anchorSources[f] === "user-provided" ? "User Provided / Original Art" : "ai-generated-anchor (FLUX.1), unverified",
      registeredAt: new Date().toISOString(),
    };
  });
  fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), "utf-8");

  // 2. Tính toán số shot và phân bổ thời lượng khớp chuẩn 120s @ 30fps
  const fps = 30;
  const totalDurationFrames = targetDurationSec * fps;
  const overlapFrames = 30; // 1.0s melting overlap
  const netFramesToCover = totalDurationFrames - overlapFrames;

  // Số shot tối ưu: bao phủ toàn bộ ảnh và duy trì nhịp 8-11s mỗi cảnh
  const shotCount = Math.max(imageFiles.length, Math.ceil(targetDurationSec / 10));
  const baseNetFramesPerShot = Math.floor(netFramesToCover / shotCount);
  const remainderFrames = netFramesToCover % shotCount;

  console.log(`\n🎯 Kế hoạch phân bổ khung hình:`);
  console.log(`   - Tổng frame: ${totalDurationFrames} frames (${targetDurationSec}s)`);
  console.log(`   - Overlap: ${overlapFrames} frames (1.0s)`);
  console.log(`   - Tổng số shot: ${shotCount}`);
  console.log(`   - Net duration mỗi shot: ~${(baseNetFramesPerShot / fps).toFixed(2)}s`);

  const timelineScenes: TimelineScene[] = [];
  const planShots: ShotPlan[] = [];
  let currentStartFrame = 0;

  for (let i = 0; i < shotCount; i++) {
    const shotId = `shot_${String(i + 1).padStart(2, "0")}`;
    const imageIndex = i % imageFiles.length;
    const chosenImage = imageFiles[imageIndex];
    const easing = DEFAULT_EASING_SEQUENCE[i % DEFAULT_EASING_SEQUENCE.length];
    const prompt = getPromptForImage(chosenImage);
    const seed = 42 + i * 137;

    // Phân bổ chính xác từng frame
    const netFrames = baseNetFramesPerShot + (i < remainderFrames ? 1 : 0);
    const durationInFrames = netFrames + overlapFrames;
    const durationSec = durationInFrames / fps;

    const shotPlan: ShotPlan = {
      id: shotId,
      imageFile: chosenImage,
      title: i === 0 ? "NATURAL CYCLE" : i === shotCount - 1 ? "INFINITE METAMORPHOSIS" : "",
      subtitle: i === 0 ? "The Endless Cycle of Life & Decay" : "",
      prompt,
      cameraEase: easing,
      seed,
      priority: i % 2 === 0 ? 1 : 2,
    };
    planShots.push(shotPlan);

    const scene: TimelineScene = {
      id: shotId,
      type: "luma-parallax",
      voiceoverText: "",
      audioFile: "",
      onScreenText: {
        title: shotPlan.title || undefined,
        subtitle: shotPlan.subtitle || undefined,
      },
      visual: {
        type: "luma-parallax",
        file: `runs/${slug}/media/${chosenImage}`,
        prompt,
        source: "own",
        license: "User Provided / Original Art",
        attribution: "Natural Cycle Artwork",
        fitMode: "contain-blur",
        focalPoint: "center",
        cameraEase: easing,
        lumaThreshold: 240,
        seed,
        model: "Lightricks/LTX-Video",
      },
      transition: "fade",
      startFrame: currentStartFrame,
      durationInFrames,
      durationSec,
    };

    timelineScenes.push(scene);

    // Xuất Job cho Colab Worker (jobs/pending/<slug>/shot_XX.json)
    const jobPayload = {
      slug,
      shotId,
      sourceImage: `runs/${slug}/media/${chosenImage}`,
      inputImagePath: path.resolve(runMediaDir, chosenImage),
      prompt,
      seed,
      model: "Lightricks/LTX-Video",
      width: 704,
      height: 384,
      fps: 24,
      numFrames: 49,
      guidanceScale: 3.5,
      numSteps: 30,
      outputVideoPath: `jobs/done/${slug}/${shotId}.mp4`,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const jobFilePath = path.join(pendingJobsDir, `${shotId}.json`);
    // Chỉ ghi job nếu chưa có trong done
    const doneVideoPath = path.join(doneJobsDir, `${shotId}.mp4`);
    if (!fs.existsSync(doneVideoPath)) {
      fs.writeFileSync(jobFilePath, JSON.stringify(jobPayload, null, 2), "utf-8");
    }

    currentStartFrame += netFrames;
  }

  // 3. Tạo cấu trúc Timeline hoàn chỉnh
  const timeline: Timeline = {
    slug,
    title: projectTitle,
    fps: 30,
    width: 1920,
    height: 1080,
    totalDurationSec: targetDurationSec,
    totalDurationInFrames: totalDurationFrames,
    isInstrumental: true, // Instrumental mode: Drone BGM xuyên suốt, không cần voiceover
    bgm: {
      file: "system-audio/bgm_ambient.wav",
      volume: 0.12,
      loop: true,
      fadeInFrames: 30,
      fadeOutFrames: 60,
    },
    scenes: timelineScenes,
  };

  // 4. Lưu plan.json và timeline.json
  const planData = {
    slug,
    targetDurationSec,
    totalDurationFrames,
    shotCount,
    artStyle: "Surreal Black Ink Art on #FFFFFF Canvas",
    motionMode: "Continuous Easing Parallax (Tier 0) + LTX-Video AI (Tier 2)",
    shots: planShots,
    updatedAt: new Date().toISOString(),
  };

  const planPath = path.join(inputDir, "plan.json");
  fs.writeFileSync(planPath, JSON.stringify(planData, null, 2), "utf-8");
  console.log(`\n📄 Đã lưu Master Plan: ${planPath}`);

  const timelinePath = path.join(runDir, "timeline.json");
  fs.writeFileSync(timelinePath, JSON.stringify(timeline, null, 2), "utf-8");
  console.log(`🎬 Đã lưu Timeline điều khiển Remotion: ${timelinePath}`);

  console.log(`📦 Đã tạo ${shotCount} jobs trong ${pendingJobsDir}/ sẵn sàng cho Worker!`);
  return { planData, timeline };
}

// Chạy trực tiếp nếu gọi từ CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const slugArg = args.find((a, idx) => args[idx - 1] === "--slug") || args[0] || "natural-cycle-v2";
  const durationArg = args.find((a, idx) => args[idx - 1] === "--duration");
  const duration = durationArg ? parseInt(durationArg, 10) : 120;

  try {
    generateAutoPlan(slugArg, duration);
  } catch (err: any) {
    console.error("❌ Lỗi khi lập kế hoạch tự động:", err.message);
    process.exit(1);
  }
}
