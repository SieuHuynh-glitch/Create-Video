import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate, Sequence, Audio, staticFile } from "remotion";
import { theme } from "../theme";
import { OnScreenText, SubtitleCue } from "../schema";
import { Subtitles } from "./Subtitles";

interface BulletsSceneProps {
  onScreenText: OnScreenText;
  voiceoverText: string;
  subtitles?: SubtitleCue[];
}

export const BulletsScene: React.FC<BulletsSceneProps> = ({
  onScreenText,
  voiceoverText,
  subtitles,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  const bullets = onScreenText.bulletPoints || [
    "Luận điểm quan trọng thứ nhất",
    "Luận điểm quan trọng thứ hai",
    "Luận điểm quan trọng thứ ba",
  ];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: theme.colors.bg.gradient,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        padding: `${theme.layout.safePadding}px`,
        boxSizing: "border-box",
      }}
    >
      {/* Header section */}
      <div
        style={{
          marginBottom: 48,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [30, 0])}px)`,
          opacity: interpolate(titleSpring, [0, 1], [0, 1]),
        }}
      >
        <h2
          style={{
            fontFamily: theme.typography.headingFont,
            fontSize: theme.typography.sizes.title, // 72px
            fontWeight: 800,
            color: theme.colors.text.primary,
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          {onScreenText.title || "CÁC ĐIỂM CỐT LÕI"}
        </h2>
        {onScreenText.subtitle && (
          <p
            style={{
              fontFamily: theme.typography.bodyFont,
              fontSize: theme.typography.sizes.subtitle, // 48px
              color: theme.colors.text.accent,
              margin: "12px 0 0 0",
              fontWeight: 500,
            }}
          >
            {onScreenText.subtitle}
          </p>
        )}
      </div>

      {/* Bullets List */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
          maxWidth: 1600,
          zIndex: 10,
        }}
      >
        {bullets.map((bullet, idx) => {
          const itemStartFrame = 15 + idx * 12;
          const itemSpring = spring({
            frame: frame - itemStartFrame,
            fps,
            config: { damping: 13, mass: 0.7 },
          });

          const translateX = interpolate(itemSpring, [0, 1], [-50, 0]);
          const opacity = interpolate(itemSpring, [0, 1], [0, 1]);

          return (
            <React.Fragment key={idx}>
              {/* Micro-SFX pop on bullet item appearance */}
              <Sequence from={itemStartFrame} durationInFrames={15}>
                <Audio
                  src={staticFile("system-audio/sfx_pop.wav")}
                  volume={0.12}
                />
              </Sequence>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 28,
                  background: theme.colors.bg.surface,
                  border: `1px solid ${theme.colors.bg.surfaceBorder}`,
                  borderRadius: theme.layout.borderRadius,
                  padding: "20px 36px",
                  transform: `translateX(${translateX}px)`,
                  opacity,
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                }}
              >
                {/* Animated bullet badge */}
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: theme.colors.text.gradient,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#0B0F19",
                    fontFamily: theme.typography.headingFont,
                    fontSize: 28,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </div>

                {/* Bullet Text */}
                <span
                  style={{
                    fontFamily: theme.typography.bodyFont,
                    fontSize: theme.typography.sizes.body, // 48px
                    color: theme.colors.text.primary,
                    fontWeight: 500,
                    lineHeight: theme.typography.lineHeights.normal,
                  }}
                >
                  {bullet}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Subtitles at bottom */}
      <Subtitles voiceoverText={voiceoverText} cues={subtitles} />
    </div>
  );
};
