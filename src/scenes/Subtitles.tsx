import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { theme } from "../theme";
import { SubtitleCue } from "../schema";

export interface SubtitlesProps {
  voiceoverText: string;
  cues?: SubtitleCue[];
}

/**
 * Chia văn bản thành các câu/cụm từ tối đa ~10 từ mỗi dòng (Fallback khi chưa có cues)
 */
function chunkText(text: string, maxWords: number = 10): string[] {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) {
    return [text];
  }
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(" "));
  }
  return chunks;
}

export const Subtitles: React.FC<SubtitlesProps> = ({ voiceoverText, cues }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  if (!voiceoverText) return null;

  let currentPhrase = "";
  let opacity = 1;

  if (cues && cues.length > 0) {
    // 1. Dùng Subtitle Cues chính xác từ timeline.json
    const activeCue = cues.find((c) => frame >= c.startFrame && frame < c.endFrame);
    if (!activeCue) {
      return null; // Không hiển thị chữ trong khoảng lặng pre-roll hoặc post-roll
    }

    currentPhrase = activeCue.text;
    const cueDuration = Math.max(1, activeCue.endFrame - activeCue.startFrame);
    const progress = (frame - activeCue.startFrame) / cueDuration;
    opacity = interpolate(progress, [0, 0.08, 0.92, 1], [0, 1, 1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  } else {
    // 2. Fallback tự chia đều theo thời lượng nếu chưa có cues
    const chunks = chunkText(voiceoverText, 10);
    const framesPerChunk = Math.max(1, Math.floor(durationInFrames / chunks.length));
    const currentChunkIndex = Math.min(
      chunks.length - 1,
      Math.floor(frame / framesPerChunk)
    );

    const chunkProgress = (frame % framesPerChunk) / framesPerChunk;
    opacity = interpolate(
      chunkProgress,
      [0, 0.1, 0.9, 1],
      [0, 1, 1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    currentPhrase = chunks[currentChunkIndex] || "";
  }

  if (!currentPhrase) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 50,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "0 96px",
        pointerEvents: "none",
        zIndex: 50,
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(11, 15, 25, 0.85)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 20,
          padding: "16px 36px",
          maxWidth: "88%",
          textAlign: "center",
          opacity,
          transform: `scale(${interpolate(opacity, [0, 1], [0.96, 1])})`,
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.6)",
        }}
      >
        <span
          style={{
            fontFamily: theme.typography.bodyFont,
            fontSize: 48,
            fontWeight: 700,
            color: "#FFFFFF",
            letterSpacing: "-0.2px",
            lineHeight: 1.3,
            textShadow: "0 2px 8px rgba(0, 0, 0, 0.9)",
          }}
        >
          {currentPhrase}
        </span>
      </div>
    </div>
  );
};
