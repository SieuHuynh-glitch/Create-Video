import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { theme } from "../theme";
import { OnScreenText, SubtitleCue } from "../schema";
import { Subtitles } from "./Subtitles";

interface QuoteSceneProps {
  onScreenText: OnScreenText;
  voiceoverText: string;
  subtitles?: SubtitleCue[];
}

export const QuoteScene: React.FC<QuoteSceneProps> = ({
  onScreenText,
  voiceoverText,
  subtitles,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardSpring = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.9 },
  });

  const cardTranslateY = interpolate(cardSpring, [0, 1], [50, 0]);
  const cardOpacity = interpolate(cardSpring, [0, 1], [0, 1]);

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
      {/* Decorative big quotation mark */}
      <div
        style={{
          position: "absolute",
          top: "12%",
          left: "14%",
          fontFamily: theme.typography.headingFont,
          fontSize: 320,
          fontWeight: 900,
          color: "rgba(56, 189, 248, 0.08)",
          lineHeight: 1,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        “
      </div>

      {/* Quote Container */}
      <div
        style={{
          background: theme.colors.bg.surface,
          border: `1px solid ${theme.colors.bg.surfaceBorder}`,
          borderRadius: 32,
          padding: "60px 72px",
          maxWidth: 1400,
          backdropFilter: "blur(16px)",
          transform: `translateY(${cardTranslateY}px)`,
          opacity: cardOpacity,
          boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
          zIndex: 10,
        }}
      >
        <p
          style={{
            fontFamily: theme.typography.headingFont,
            fontSize: theme.typography.sizes.title, // 72px
            fontWeight: 700,
            color: theme.colors.text.primary,
            margin: "0 0 32px 0",
            lineHeight: 1.3,
            fontStyle: "italic",
            letterSpacing: "-0.01em",
          }}
        >
          "{onScreenText.quoteText || onScreenText.title || "Trích dẫn nổi bật hoặc thông điệp cốt lõi."}"
        </p>

        {onScreenText.author && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 48,
                height: 4,
                background: theme.colors.accent.cyan,
                borderRadius: 2,
              }}
            />
            <span
              style={{
                fontFamily: theme.typography.bodyFont,
                fontSize: theme.typography.sizes.subtitle, // 48px
                fontWeight: 600,
                color: theme.colors.text.accent,
              }}
            >
              {onScreenText.author}
            </span>
          </div>
        )}
      </div>

      {/* Subtitles at bottom */}
      <Subtitles voiceoverText={voiceoverText} cues={subtitles} />
    </div>
  );
};
