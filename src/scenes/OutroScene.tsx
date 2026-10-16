import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { theme } from "../theme";
import { OnScreenText, SubtitleCue } from "../schema";
import { Subtitles } from "./Subtitles";

interface OutroSceneProps {
  onScreenText: OnScreenText;
  voiceoverText: string;
  subtitles?: SubtitleCue[];
}

export const OutroScene: React.FC<OutroSceneProps> = ({
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

  const ctaSpring = spring({
    frame: frame - 15,
    fps,
    config: { damping: 12, mass: 0.8, stiffness: 100 },
  });

  const ctaScale = interpolate(ctaSpring, [0, 1], [0.8, 1]);
  const ctaOpacity = interpolate(ctaSpring, [0, 1], [0, 1]);

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
      {/* Background glowing ring */}
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          border: "2px solid rgba(56, 189, 248, 0.2)",
          transform: `scale(${interpolate(frame, [0, 90], [0.9, 1.1], { extrapolateRight: "clamp" })})`,
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
          maxWidth: 1500,
        }}
      >
        <h2
          style={{
            fontFamily: theme.typography.headingFont,
            fontSize: theme.typography.sizes.title, // 72px
            fontWeight: 800,
            color: theme.colors.text.primary,
            margin: "0 0 20px 0",
            transform: `translateY(${interpolate(titleSpring, [0, 1], [40, 0])}px)`,
            opacity: interpolate(titleSpring, [0, 1], [0, 1]),
          }}
        >
          {onScreenText.title || "CẢM ƠN BẠN ĐÃ THEO DÕI"}
        </h2>

        {onScreenText.subtitle && (
          <p
            style={{
              fontFamily: theme.typography.bodyFont,
              fontSize: theme.typography.sizes.subtitle, // 48px
              color: theme.colors.text.secondary,
              margin: "0 0 48px 0",
            }}
          >
            {onScreenText.subtitle}
          </p>
        )}

        {/* CTA Button Badge */}
        <div
          style={{
            background: theme.colors.text.gradient,
            borderRadius: 24,
            padding: "24px 64px",
            boxShadow: theme.colors.accent.glowCyan,
            transform: `scale(${ctaScale})`,
            opacity: ctaOpacity,
          }}
        >
          <span
            style={{
              fontFamily: theme.typography.headingFont,
              fontSize: theme.typography.sizes.subtitle, // 48px
              fontWeight: 800,
              color: "#0B0F19",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            {onScreenText.callToAction || "THEO DÕI ĐỂ XEM THÊM NỘI DUNG MỚI"}
          </span>
        </div>
      </div>

      {/* Subtitles at bottom */}
      <Subtitles voiceoverText={voiceoverText} cues={subtitles} />
    </div>
  );
};
