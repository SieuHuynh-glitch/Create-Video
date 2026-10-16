import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { theme } from "../theme";
import { OnScreenText, SubtitleCue } from "../schema";
import { Subtitles } from "./Subtitles";

interface TitleSceneProps {
  onScreenText: OnScreenText;
  voiceoverText: string;
  subtitles?: SubtitleCue[];
}

export const TitleScene: React.FC<TitleSceneProps> = ({
  onScreenText,
  voiceoverText,
  subtitles,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.8, stiffness: 100 },
  });

  const subtitleSpring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 14, mass: 0.8, stiffness: 90 },
  });

  const titleTranslateY = interpolate(titleSpring, [0, 1], [60, 0]);
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);

  const subtitleTranslateY = interpolate(subtitleSpring, [0, 1], [40, 0]);
  const subtitleOpacity = interpolate(subtitleSpring, [0, 1], [0, 1]);

  // Hiệu ứng phát sáng nhẹ lan tỏa
  const glowScale = interpolate(frame, [0, 60, 120], [1, 1.08, 1], {
    extrapolateRight: "clamp",
  });

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
        justifyContent: "center",
        alignItems: "center",
        padding: `0 ${theme.layout.safePadding}px`,
        boxSizing: "border-box",
      }}
    >
      {/* Background ambient glow */}
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, rgba(129, 140, 248, 0.05) 50%, transparent 70%)",
          transform: `scale(${glowScale})`,
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          maxWidth: 1600,
          zIndex: 10,
        }}
      >
        {/* Main Title */}
        <h1
          style={{
            fontFamily: theme.typography.headingFont,
            fontSize: theme.typography.sizes.hero, // 96px
            fontWeight: 800,
            color: theme.colors.text.primary,
            margin: "0 0 24px 0",
            lineHeight: theme.typography.lineHeights.tight,
            transform: `translateY(${titleTranslateY}px)`,
            opacity: titleOpacity,
            letterSpacing: "-0.02em",
            textShadow: "0 4px 20px rgba(0,0,0,0.6)",
          }}
        >
          {onScreenText.title || "TIÊU ĐỀ VIDEO"}
        </h1>

        {/* Subtitle / Tagline */}
        {onScreenText.subtitle && (
          <h2
            style={{
              fontFamily: theme.typography.bodyFont,
              fontSize: theme.typography.sizes.subtitle, // 48px
              fontWeight: 500,
              background: theme.colors.text.gradient,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              margin: 0,
              lineHeight: theme.typography.lineHeights.normal,
              transform: `translateY(${subtitleTranslateY}px)`,
              opacity: subtitleOpacity,
              letterSpacing: "0.01em",
            }}
          >
            {onScreenText.subtitle}
          </h2>
        )}
      </div>

      {/* Subtitles at bottom */}
      <Subtitles voiceoverText={voiceoverText} cues={subtitles} />
    </div>
  );
};
