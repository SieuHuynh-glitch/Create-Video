import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { theme } from "../theme";
import { OnScreenText, SubtitleCue } from "../schema";
import { Subtitles } from "./Subtitles";

interface StatSceneProps {
  onScreenText: OnScreenText;
  voiceoverText: string;
  subtitles?: SubtitleCue[];
}

export const StatScene: React.FC<StatSceneProps> = ({
  onScreenText,
  voiceoverText,
  subtitles,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const numberSpring = spring({
    frame,
    fps,
    config: { damping: 12, mass: 0.9, stiffness: 110 },
  });

  const labelSpring = spring({
    frame: frame - 12,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  const numberScale = interpolate(numberSpring, [0, 1], [0.6, 1]);
  const numberOpacity = interpolate(numberSpring, [0, 1], [0, 1]);

  const labelTranslateY = interpolate(labelSpring, [0, 1], [30, 0]);
  const labelOpacity = interpolate(labelSpring, [0, 1], [0, 1]);

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
      {/* Background glow behind number */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, rgba(56, 189, 248, 0.05) 50%, transparent 70%)",
          filter: "blur(70px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          zIndex: 10,
          maxWidth: 1600,
        }}
      >
        {/* Optional Title */}
        {onScreenText.title && (
          <h2
            style={{
              fontFamily: theme.typography.bodyFont,
              fontSize: theme.typography.sizes.subtitle, // 48px
              fontWeight: 600,
              color: theme.colors.text.secondary,
              margin: "0 0 16px 0",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            {onScreenText.title}
          </h2>
        )}

        {/* Big Impact Stat Number */}
        <div
          style={{
            fontFamily: theme.typography.headingFont,
            fontSize: theme.typography.sizes.statNumber, // 128px
            fontWeight: 900,
            color: theme.colors.accent.amber,
            transform: `scale(${numberScale})`,
            opacity: numberOpacity,
            lineHeight: 1.1,
            textShadow: theme.colors.accent.glowAmber,
            letterSpacing: "-0.03em",
          }}
        >
          {onScreenText.statNumber || "100%"}
        </div>

        {/* Stat Description Label */}
        <div
          style={{
            fontFamily: theme.typography.bodyFont,
            fontSize: theme.typography.sizes.subtitle, // 48px
            fontWeight: 600,
            color: theme.colors.text.primary,
            marginTop: 20,
            transform: `translateY(${labelTranslateY}px)`,
            opacity: labelOpacity,
            maxWidth: 1200,
            lineHeight: theme.typography.lineHeights.normal,
          }}
        >
          {onScreenText.statLabel || "Số liệu thống kê thực tế ấn tượng"}
        </div>

        {/* Source citation */}
        {onScreenText.source && (
          <div
            style={{
              fontFamily: theme.typography.bodyFont,
              fontSize: 24,
              fontWeight: 400,
              color: theme.colors.text.muted,
              marginTop: 18,
              transform: `translateY(${labelTranslateY}px)`,
              opacity: labelOpacity,
              letterSpacing: "0.02em",
              fontStyle: "italic",
            }}
          >
            Nguồn: {onScreenText.source}
          </div>
        )}
      </div>

      {/* Subtitles at bottom */}
      <Subtitles voiceoverText={voiceoverText} cues={subtitles} />
    </div>
  );
};
