import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { theme } from "../theme";
import { OnScreenText, VisualConfig, SubtitleCue, CameraEase } from "../schema";
import { Subtitles } from "./Subtitles";

export interface LumaParallaxSceneProps {
  onScreenText: OnScreenText;
  voiceoverText: string;
  visual?: VisualConfig;
  durationInFrames?: number;
  subtitles?: SubtitleCue[];
}

interface InkParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  speedX: number;
  speedY: number;
  pulseOffset: number;
}

export const LumaParallaxScene: React.FC<LumaParallaxSceneProps> = ({
  onScreenText,
  voiceoverText,
  visual,
  durationInFrames: sceneDuration,
  subtitles,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: configDuration } = useVideoConfig();
  const totalFrames = sceneDuration || configDuration || 150;

  const cameraEase: CameraEase = visual?.cameraEase || "zoom_in";
  const cleanFile = visual?.file ? visual.file.replace(/^[/\\]+/, "").trim() : "";
  const hasImage = cleanFile.length > 0;

  // 1. Camera Transformation Easing (Thiền định & Không giật)
  let scale = 1.0;
  let translateX = 0;
  let translateY = 0;

  switch (cameraEase) {
    case "zoom_in":
      scale = interpolate(frame, [0, totalFrames], [1.0, 1.12], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      translateY = interpolate(frame, [0, totalFrames], [0, -15]);
      break;
    case "zoom_out":
      scale = interpolate(frame, [0, totalFrames], [1.14, 1.02], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      translateY = interpolate(frame, [0, totalFrames], [-12, 0]);
      break;
    case "pan_left":
      scale = 1.06;
      translateX = interpolate(frame, [0, totalFrames], [25, -25]);
      break;
    case "pan_right":
      scale = 1.06;
      translateX = interpolate(frame, [0, totalFrames], [-25, 25]);
      break;
    case "breathing":
      scale = 1.04 + Math.sin(frame * 0.05) * 0.02;
      translateY = Math.cos(frame * 0.04) * 6;
      break;
    case "static":
    default:
      scale = 1.02;
      break;
  }

  // Thêm vi chuyển động hữu cơ (Subtle Micro-Breathing Wobble)
  const breathingWobble = Math.sin(frame * 0.04) * 2;
  const breathingScale = 1 + Math.sin(frame * 0.03) * 0.008;
  const finalScale = scale * breathingScale;
  const finalTranslateY = translateY + breathingWobble;

  // 2. Sinh tập hợp hạt mực bay hữu cơ (Monochrome Spores / Ink Dust)
  const particles: InkParticle[] = useMemo(() => {
    const list: InkParticle[] = [];
    const count = 18;
    for (let i = 0; i < count; i++) {
      list.push({
        id: i,
        x: (i * 107 + 45) % 1920,
        y: (i * 83 + 120) % 1080,
        size: 2 + (i % 5) * 1.5,
        baseAlpha: 0.15 + (i % 4) * 0.08,
        speedX: -0.2 - (i % 3) * 0.15,
        speedY: -0.35 - (i % 4) * 0.2,
        pulseOffset: i * 0.6,
      });
    }
    return list;
  }, []);

  // 3. Hiệu ứng xuất hiện tiêu đề chữ
  const textSpring = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.8 },
  });
  const textTranslateY = interpolate(textSpring, [0, 1], [30, 0]);
  const textOpacity = interpolate(textSpring, [0, 1], [0, 1]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#FFFFFF", // Nền trắng tinh khiết nghệ thuật
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
      }}
    >
      {/* LỚP 1: NỀN AMBIENT LIGHTING & SUBTLE PAPER TEXTURE */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background:
            "radial-gradient(circle at 50% 50%, #FFFFFF 50%, #F5F6F8 90%, #ECEEF2 100%)",
        }}
      />

      {/* SVG DEFINITION: SMOOTHSTEP LUMA KEY FILTER (dải 235-252 khử viền răng cưa) */}
      <svg style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}>
        <defs>
          <filter id="smoothstep-luma-key" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="0.299 0.587 0.114 0 0
                      0.299 0.587 0.114 0 0
                      0.299 0.587 0.114 0 0
                      -15.0 -15.0 -15.0 1 14.2"
            />
          </filter>
        </defs>
      </svg>

      {/* LỚP 2: BÓNG MỜ CHỦ THỂ (BACKGROUND SHADOW AURA - TÁCH LỚP 2.5D) */}
      {hasImage && (
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
            transform: `scale(${finalScale * 1.03}) translate(${translateX * 0.5}px, ${finalTranslateY * 0.5 + 15}px)`,
            filter: "blur(24px) contrast(150%)",
            opacity: 0.12,
            mixBlendMode: "multiply",
            pointerEvents: "none",
          }}
        >
          <Img
            src={staticFile(cleanFile)}
            style={{
              maxHeight: "92%",
              maxWidth: "92%",
              objectFit: "contain",
            }}
          />
        </div>
      )}

      {/* LỚP 3: CHỦ THỂ NGHỆ THUẬT MỰC ĐEN - LUMA ALPHA MATTING & MULTIPLY */}
      {hasImage ? (
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
            transform: `scale(${finalScale}) translate(${translateX}px, ${finalTranslateY}px)`,
            transformOrigin: "center center",
            mixBlendMode: "multiply", // Khử viền trắng tuyệt đối: giữ mực đen, đồng hóa nền #FFFFFF
          }}
        >
          <Img
            src={staticFile(cleanFile)}
            style={{
              maxHeight: "90%",
              maxWidth: "90%",
              objectFit: "contain",
              filter: "contrast(105%) brightness(99%)",
            }}
          />
        </div>
      ) : (
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
            color: "#64748B",
            fontFamily: theme.typography.headingFont,
            fontSize: 24,
          }}
        >
          <span>Chưa có ảnh: {cleanFile || "media/scene_xx.jpg"}</span>
        </div>
      )}

      {/* LỚP 4: HẠT BỤI MỰC & KHÍ QUYỂN HỮU CƠ TRÔI DẠT (ORGANIC INK SPORES) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        {particles.map((p) => {
          const currentX = (p.x + frame * p.speedX + 1920) % 1920;
          const currentY = (p.y + frame * p.speedY + 1080) % 1080;
          const pulse = 0.8 + Math.sin(frame * 0.08 + p.pulseOffset) * 0.2;
          const currentAlpha = p.baseAlpha * pulse;

          return (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: currentX,
                top: currentY,
                width: p.size,
                height: p.size,
                borderRadius: "50%",
                backgroundColor: "#18181B",
                opacity: currentAlpha,
                boxShadow: "0 0 4px rgba(0,0,0,0.2)",
              }}
            />
          );
        })}
      </div>

      {/* LỚP 5: VIGNETTE NGHỆ THUẬT BO GÓC MỀM MẠI */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background:
            "radial-gradient(circle at 50% 50%, rgba(255,255,255,0) 65%, rgba(0,0,0,0.06) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* LỚP 6: TIÊU ĐỀ & NỘI DUNG CHỮ (NẰM TRONG SAFE MARGIN 96PX) */}
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
              fontSize: 44,
              fontWeight: 800,
              color: "#09090B",
              margin: 0,
              letterSpacing: "-0.5px",
              textShadow: "0 2px 8px rgba(255, 255, 255, 0.8)",
            }}
          >
            {onScreenText.title}
          </h2>
        )}

        {onScreenText.subtitle && (
          <p
            style={{
              fontFamily: theme.typography.bodyFont,
              fontSize: 22,
              fontWeight: 500,
              color: "#3F3F46",
              marginTop: 8,
              marginBottom: 0,
              letterSpacing: "0.2px",
            }}
          >
            {onScreenText.subtitle}
          </p>
        )}
      </div>

      {/* LỚP 7: PHỤ ĐỀ ĐỒNG BỘ Ở ĐÁY (NẾU CÓ) */}
      <div style={{ position: "relative", zIndex: 10 }}>
        <Subtitles voiceoverText={voiceoverText} cues={subtitles} />
      </div>
    </div>
  );
};
