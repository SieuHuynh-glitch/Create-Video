import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  OffthreadVideo,
  Loop,
  staticFile,
} from "remotion";
import { theme } from "../theme";
import { OnScreenText, VisualConfig, SubtitleCue } from "../schema";
import { Subtitles } from "./Subtitles";

export interface VideoSceneProps {
  onScreenText: OnScreenText;
  voiceoverText: string;
  visual?: VisualConfig & { clipDurationInFrames?: number };
  durationInFrames?: number;
  subtitles?: SubtitleCue[];
}

export const VideoScene: React.FC<VideoSceneProps> = ({
  onScreenText,
  voiceoverText,
  visual,
  durationInFrames: sceneDuration,
  subtitles,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: configDuration } = useVideoConfig();
  const totalFrames = sceneDuration || configDuration || 150;

  // Hiệu ứng xuất hiện tiêu đề
  const textSpring = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  const textTranslateY = interpolate(textSpring, [0, 1], [40, 0]);
  const textOpacity = interpolate(textSpring, [0, 1], [0, 1]);

  const cleanFile = visual?.file ? visual.file.replace(/^[/\\]+/, "").trim() : "";
  const hasVideo = cleanFile.length > 0;

  // Xử lý tự động lặp lại (Auto-loop) nếu thời lượng clip ngắn hơn cảnh
  const clipFrames = visual?.clipDurationInFrames;
  const shouldLoop = !!(clipFrames && clipFrames > 0 && clipFrames < totalFrames);
  const playbackRate = visual?.playbackRate || 0.75;

  // Tính toán camera easing động nếu có (hỗ trợ tự sửa hoặc làm giàu chuyển động)
  const cameraEase = visual?.cameraEase;
  let scale = 1.0;
  let translateX = 0;
  let translateY = 0;

  if (cameraEase && cameraEase !== "static") {
    switch (cameraEase) {
      case "zoom_in":
        scale = interpolate(frame, [0, totalFrames], [1.0, 1.1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        translateY = interpolate(frame, [0, totalFrames], [0, -12]);
        break;
      case "zoom_out":
        scale = interpolate(frame, [0, totalFrames], [1.12, 1.01], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        translateY = interpolate(frame, [0, totalFrames], [-10, 0]);
        break;
      case "pan_left":
        scale = 1.05;
        translateX = interpolate(frame, [0, totalFrames], [20, -20]);
        break;
      case "pan_right":
        scale = 1.05;
        translateX = interpolate(frame, [0, totalFrames], [-20, 20]);
        break;
      case "breathing":
        scale = 1.03 + Math.sin(frame * 0.05) * 0.015;
        translateY = Math.cos(frame * 0.04) * 4;
        break;
      default:
        break;
    }
  }

  const renderVideoElement = () => (
    <OffthreadVideo
      src={staticFile(cleanFile)}
      playbackRate={playbackRate}
      muted={true}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: "center",
      }}
    />
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: theme.colors.bg.primary,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
      }}
    >
      {/* 1. Lớp Video thật (OffthreadVideo) hoặc Placeholder */}
      {hasVideo ? (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
            transformOrigin: "center center",
          }}
        >
          {shouldLoop ? (
            <Loop durationInFrames={clipFrames!}>
              {renderVideoElement()}
            </Loop>
          ) : (
            renderVideoElement()
          )}
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "radial-gradient(circle at center, #1E1B4B 0%, #0F172A 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            border: "2px dashed #6366F1",
          }}
        >
          <span style={{ fontSize: 72 }}>🎬</span>
          <span
            style={{
              fontFamily: theme.typography.headingFont,
              fontSize: 28,
              fontWeight: 700,
              color: theme.colors.text.accent,
              letterSpacing: 2,
            }}
          >
            MEDIA PLACEHOLDER (CHƯA CÓ VIDEO)
          </span>
          <span
            style={{
              fontFamily: theme.typography.bodyFont,
              fontSize: 18,
              color: theme.colors.text.secondary,
            }}
          >
            Yêu cầu clip: {visual?.file || "media/scene_xx.mp4"}
          </span>
        </div>
      )}

      {/* 2. Lớp phủ Gradient Scrim bảo vệ chữ & phụ đề (chỉ hiển thị khi thực sự có text) */}
      {!!(onScreenText.title || onScreenText.subtitle || (subtitles && subtitles.length > 0)) && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background:
              "linear-gradient(to top, rgba(11, 15, 25, 0.95) 0%, rgba(11, 15, 25, 0.35) 45%, rgba(11, 15, 25, 0.75) 100%)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* 3. Tiêu đề / Nội dung chữ phía trên */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          padding: `${theme.layout.safePadding}px ${theme.layout.safePadding}px 0`,
          opacity: textOpacity,
          transform: `translateY(${textTranslateY}px)`,
        }}
      >
        {onScreenText.title && (
          <h2
            style={{
              fontFamily: theme.typography.headingFont,
              fontSize: 48,
              fontWeight: 800,
              color: theme.colors.text.primary,
              margin: 0,
              textShadow: "0 4px 16px rgba(0, 0, 0, 0.8)",
              letterSpacing: "-0.5px",
            }}
          >
            {onScreenText.title}
          </h2>
        )}

        {onScreenText.subtitle && (
          <p
            style={{
              fontFamily: theme.typography.bodyFont,
              fontSize: 26,
              fontWeight: 500,
              color: theme.colors.text.secondary,
              marginTop: 10,
              marginBottom: 0,
              textShadow: "0 2px 10px rgba(0, 0, 0, 0.8)",
            }}
          >
            {onScreenText.subtitle}
          </p>
        )}
      </div>

      {/* 4. Phụ đề đồng bộ ở đáy */}
      <div style={{ position: "relative", zIndex: 10 }}>
        <Subtitles voiceoverText={voiceoverText} cues={subtitles} />
      </div>
    </div>
  );
};
