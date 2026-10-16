import React from "react";
import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { Timeline, TimelineSchema } from "./schema";

// Timeline mặc định cho Remotion Studio khi chưa truyền file timeline cụ thể
const defaultTimeline: Timeline = {
  slug: "preview-factory",
  title: "Nhà Máy Sản Xuất Video Remotion",
  fps: 30,
  width: 1920,
  height: 1080,
  totalDurationSec: 15,
  totalDurationInFrames: 450,
  scenes: [
    {
      id: "scene_01",
      type: "title",
      voiceoverText: "Chào mừng bạn đến với nhà máy sản xuất video tự động điều khiển hoàn toàn bằng dữ liệu.",
      onScreenText: {
        title: "NHÀ MÁY VIDEO",
        subtitle: "Hệ Thống Pipeline Video Tự Động Hoá Chuẩn Công Nghiệp",
      },
      transition: "fade",
      audioFile: "",
      durationSec: 5,
      durationInFrames: 150,
      startFrame: 0,
    },
    {
      id: "scene_02",
      type: "bullets",
      voiceoverText: "Hệ thống hỗ trợ 5 cảnh mẫu tái sử dụng, giọng đọc trí tuệ nhân tạo mượt mà và kiểm tra chất lượng tự động.",
      onScreenText: {
        title: "TÍNH NĂNG VƯỢT TRỘI",
        bulletPoints: [
          "100% miễn phí, không phụ thuộc API trả phí",
          "Điều khiển toàn diện bằng timeline.json",
          "Tự động đồng bộ phụ đề và giọng đọc Edge-TTS",
        ],
      },
      transition: "fade",
      audioFile: "",
      durationSec: 5,
      durationInFrames: 150,
      startFrame: 150,
    },
    {
      id: "scene_03",
      type: "outro",
      voiceoverText: "Sẵn sàng sản xuất video chất lượng cao chỉ từ một file brief mô tả.",
      onScreenText: {
        title: "SẴN SÀNG HOẠT ĐỘNG",
        subtitle: "Bắt đầu ngay hôm nay",
        callToAction: "BẮT ĐẦU SẢN XUẤT",
      },
      transition: "fade",
      audioFile: "",
      durationSec: 5,
      durationInFrames: 150,
      startFrame: 300,
    },
  ],
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MainVideo"
        component={MainVideo}
        defaultProps={defaultTimeline}
        schema={TimelineSchema}
        calculateMetadata={async ({ props }) => {
          // Parse và kiểm tra tính hợp lệ qua TimelineSchema
          const validated = TimelineSchema.safeParse(props);
          if (!validated.success) {
            console.warn(
              "⚠️ [Root.tsx] Cảnh báo: Props truyền vào không khớp hoàn toàn với TimelineSchema:",
              validated.error.issues
            );
          }

          const data = validated.success
            ? validated.data
            : props && Array.isArray((props as any).scenes)
            ? (props as Timeline)
            : defaultTimeline;

          const durationInFrames =
            data.totalDurationInFrames ||
            data.scenes?.reduce((acc, s) => acc + (s.durationInFrames || 0), 0) ||
            450;

          return {
            durationInFrames,
            fps: data.fps || 30,
            width: data.width || 1920,
            height: data.height || 1080,
            props: data,
          };
        }}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={450}
      />
    </>
  );
};
