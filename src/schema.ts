import { z } from "zod";

/**
 * Các loại cảnh tái sử dụng được hỗ trợ bởi Nhà máy Video
 */
export const SceneTypeSchema = z.enum([
  "title",
  "bullets",
  "stat",
  "quote",
  "outro",
  "image",
  "video",
]);
export type SceneType = z.infer<typeof SceneTypeSchema>;

/**
 * Kiểu phương tiện hình ảnh trực quan (Visual Media)
 */
export const VisualTypeSchema = z.enum(["motion", "image", "video"]);
export type VisualType = z.infer<typeof VisualTypeSchema>;

/**
 * Nguồn gốc tài nguyên media
 */
export const VisualSourceSchema = z.enum(["stock", "ai", "own"]);
export type VisualSource = z.infer<typeof VisualSourceSchema>;

export const FitModeSchema = z.enum(["cover", "contain-blur"]);
export type FitMode = z.infer<typeof FitModeSchema>;

export const FocalPointSchema = z.enum(["center", "top-center", "bottom-center"]);
export type FocalPoint = z.infer<typeof FocalPointSchema>;

/**
 * Cấu hình phương tiện hình ảnh/video của từng cảnh
 */
export const VisualConfigSchema = z.object({
  type: VisualTypeSchema.default("motion"),
  file: z.string().optional(), // Tên file hoặc đường dẫn trong runs/<slug>/media/
  prompt: z.string().optional(), // Prompt sinh hình ảnh/clip tiếng Anh hoặc từ khóa stock
  source: VisualSourceSchema.optional(), // stock | ai | own
  license: z.string().optional(), // MIT, CC0, Freepik, Proprietary...
  attribution: z.string().optional(), // Tác giả hoặc đường link nguồn ghi công
  fitMode: FitModeSchema.default("cover"), // cover | contain-blur (chống cắt ảnh)
  focalPoint: FocalPointSchema.default("center"), // center | top-center (bảo vệ mặt nhân vật) | bottom-center
  clipDurationInFrames: z.number().optional(), // Thời lượng clip video thực tế đo bởi ffprobe
});
export type VisualConfig = z.infer<typeof VisualConfigSchema>;

/**
 * Hiệu ứng chuyển cảnh giữa các Scene
 */
export const TransitionTypeSchema = z.enum(["fade", "slide", "wipe", "none"]);
export type TransitionType = z.infer<typeof TransitionTypeSchema>;

/**
 * Hợp đồng dữ liệu chữ hiển thị trên màn hình
 */
export const OnScreenTextSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  bulletPoints: z.array(z.string()).optional(),
  statNumber: z.string().optional(),
  statLabel: z.string().optional(),
  quoteText: z.string().optional(),
  author: z.string().optional(),
  callToAction: z.string().optional(),
  highlightWords: z.array(z.string()).optional(),
  source: z.string().optional(), // Nguồn trích dẫn / số liệu kiểm chứng bắt buộc khi có statNumber
});
export type OnScreenText = z.infer<typeof OnScreenTextSchema>;

/**
 * Schema cho một cảnh trong kịch bản phân cảnh (Storyboard Scene)
 */
export const StoryboardSceneSchema = z.object({
  id: z.string().regex(/^scene_\d{2}$/, "ID cảnh phải có định dạng scene_01, scene_02..."),
  type: SceneTypeSchema,
  voiceoverText: z.string().min(1, "Lời đọc thuyết minh không được để trống"),
  onScreenText: OnScreenTextSchema,
  visual: VisualConfigSchema.optional(),
  transition: TransitionTypeSchema.default("fade"),
  estimatedDurationSec: z.number().positive().optional(),
});
export type StoryboardScene = z.infer<typeof StoryboardSceneSchema>;

/**
 * Schema cho toàn bộ Storyboard (đầu ra của kịch bản trước khi sinh âm thanh)
 */
export const StoryboardSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  targetDurationSec: z.number().positive().default(120),
  scenes: z.array(StoryboardSceneSchema).min(1, "Storyboard phải có ít nhất 1 cảnh"),
});
export type Storyboard = z.infer<typeof StoryboardSchema>;

/**
 * Định nghĩa một phụ đề đồng bộ (Subtitle Cue)
 */
export const SubtitleCueSchema = z.object({
  text: z.string(),
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
});
export type SubtitleCue = z.infer<typeof SubtitleCueSchema>;

/**
 * Schema cho một cảnh trên Timeline (sau khi đã có audio và tính toán frame chuẩn xác)
 */
export const TimelineSceneSchema = StoryboardSceneSchema.extend({
  audioFile: z.string().default(""),
  audioStartFrame: z.number().int().nonnegative().optional(), // Trì hoãn audio (pre-roll 6 frames)
  audioDurationInFrames: z.number().int().positive().optional(),
  durationSec: z.number().positive("Thời lượng cảnh phải lớn hơn 0"),
  durationInFrames: z.number().int().positive("Số frame phải là số nguyên dương"),
  startFrame: z.number().int().nonnegative("Frame bắt đầu không được âm"),
  subtitles: z.array(SubtitleCueSchema).optional(), // Mảng cues chia nhỏ <= 10 từ
});
export type TimelineScene = z.infer<typeof TimelineSceneSchema>;

/**
 * Cấu hình nhạc nền (BGM)
 */
export const BgmConfigSchema = z.object({
  file: z.string().default("system-audio/bgm_ambient.wav"),
  volume: z.number().min(0).max(1).default(0.08),
  loop: z.boolean().default(true),
  fadeInFrames: z.number().default(30),
  fadeOutFrames: z.number().default(45),
});
export type BgmConfig = z.infer<typeof BgmConfigSchema>;

/**
 * Schema cho file timeline.json - Nguồn chân lý duy nhất điều khiển Remotion Render
 */
export const TimelineSchema = z.object({
  slug: z.string().min(1),
  title: z.string().optional(),
  fps: z.number().int().positive().default(30),
  width: z.number().int().positive().default(1920),
  height: z.number().int().positive().default(1080),
  totalDurationSec: z.number().positive(),
  totalDurationInFrames: z.number().int().positive(),
  bgm: BgmConfigSchema.optional(),
  scenes: z.array(TimelineSceneSchema).min(1, "Timeline phải có ít nhất 1 cảnh"),
});
export type Timeline = z.infer<typeof TimelineSchema>;

