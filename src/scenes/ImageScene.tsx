import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { theme } from "../theme";
import { OnScreenText, VisualConfig, SubtitleCue } from "../schema";
import { Subtitles } from "./Subtitles";

export interface ImageSceneProps {
  onScreenText: OnScreenText;
  voiceoverText: string;
  visual?: VisualConfig;
  durationInFrames?: number;
  subtitles?: SubtitleCue[];
}

const objectPositionMap: Record<string, string> = {
  center: "50% 50%",
  "top-center": "50% 20%", // Bảo vệ trán, mắt và khuôn mặt nhân vật
  "bottom-center": "50% 80%",
};

export const ImageScene: React.FC<ImageSceneProps> = ({
  onScreenText,
  voiceoverText,
  visual,
  durationInFrames: sceneDuration,
  subtitles,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: configDuration } = useVideoConfig();
  const totalFrames = sceneDuration || configDuration || 150;

  // Hiệu ứng Ken Burns (slow zoom và pan nhẹ nhàng)
  const scale = interpolate(frame, [0, totalFrames], [1, 1.08], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const translateY = interpolate(frame, [0, totalFrames], [0, -18], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Hiệu ứng xuất hiện cho khối chữ
  const textSpring = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  const textTranslateY = interpolate(textSpring, [0, 1], [40, 0]);
  const textOpacity = interpolate(textSpring, [0, 1], [0, 1]);

  const cleanFile = visual?.file ? visual.file.replace(/^[/\\]+/, "").trim() : "";
  const hasImage = cleanFile.length > 0;
  const fitMode = visual?.fitMode || "cover";
  const focalPoint = visual?.focalPoint || "center";
  const objectPosition = objectPositionMap[focalPoint] || "50% 50%";

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
      {/* 1. Lớp hình ảnh hoặc Placeholder */}
      {hasImage ? (
        fitMode === "contain-blur" ? (
          /* Chế độ contain-blur: Nền mờ nghệ thuật + Ảnh gốc sắc nét ở giữa */
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              overflow: "hidden",
            }}
          >
            {/* Nền mờ (Blurred Backdrop) */}
            <div
              style={{
                position: "absolute",
                top: -30,
                left: -30,
                width: "calc(100% + 60px)",
                height: "calc(100% + 60px)",
                filter: "blur(40px) brightness(0.35)",
                transform: `scale(${scale * 1.1})`,
                transformOrigin: "center center",
              }}
            >
              <Img
                src={staticFile(cleanFile)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center",
                }}
              />
            </div>

            {/* Ảnh gốc trung tâm sắc nét, bo góc và đổ bóng sâu */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${scale}) translateY(${translateY}px)`,
                transformOrigin: "center center",
              }}
            >
              <Img
                src={staticFile(cleanFile)}
                style={{
                  maxHeight: "86%",
                  maxWidth: "86%",
                  objectFit: "contain",
                  borderRadius: 24,
                  boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.12)",
                }}
              />
            </div>
          </div>
        ) : (
          /* Chế độ cover với focalPoint chống cắt mất trán/mặt nhân vật */
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              transform: `scale(${scale}) translateY(${translateY}px)`,
              transformOrigin: focalPoint === "top-center" ? "center 20%" : "center center",
            }}
          >
            <Img
              src={staticFile(cleanFile)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition,
              }}
            />
          </div>
        )
      ) : (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "radial-gradient(circle at center, #1E293B 0%, #0F172A 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            border: "2px dashed #475569",
          }}
        >
          <span style={{ fontSize: 72 }}>🖼️</span>
          <span
            style={{
              fontFamily: theme.typography.headingFont,
              fontSize: 28,
              fontWeight: 700,
              color: theme.colors.text.accent,
              letterSpacing: 2,
            }}
          >
            MEDIA PLACEHOLDER (CHƯA CÓ ẢNH)
          </span>
          <span
            style={{
              fontFamily: theme.typography.bodyFont,
              fontSize: 18,
              color: theme.colors.text.secondary,
            }}
          >
            Yêu cầu file: {visual?.file || "media/scene_xx.png"}
          </span>
        </div>
      )}

      {/* 2. Lớp phủ Gradient Scrim bảo vệ chữ (chỉ hiển thị khi thực sự có text) */}
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

      {/* 3. Phần tiêu đề / nhãn thông tin phía trên */}
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
