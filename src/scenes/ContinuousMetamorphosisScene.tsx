import React, { useMemo } from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  staticFile,
} from "remotion";
import { OnScreenText, VisualConfig, SubtitleCue, CameraEase } from "../schema";
import { Subtitles } from "./Subtitles";

export interface ContinuousMetamorphosisSceneProps {
  onScreenText?: OnScreenText;
  voiceoverText?: string;
  visual?: VisualConfig;
  durationInFrames?: number;
  subtitles?: SubtitleCue[];
  sceneIndex?: number;
  totalScenes?: number;
}

interface VectorParticle {
  id: number;
  initialX: number;
  initialY: number;
  size: number;
  speedY: number;
  speedX: number;
  rotationSpeed: number;
  delayFrame: number;
}

export const ContinuousMetamorphosisScene: React.FC<ContinuousMetamorphosisSceneProps> = ({
  onScreenText = {},
  voiceoverText = "",
  visual,
  durationInFrames: sceneDuration,
  subtitles,
  sceneIndex = 0,
  totalScenes = 10,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: configDuration } = useVideoConfig();
  const totalFrames = sceneDuration || configDuration || 300;

  const cameraEase: CameraEase = visual?.cameraEase || "zoom_in";
  const cleanFile = visual?.file ? visual.file.replace(/^[/\\]+/, "").trim() : "";
  const hasImage = cleanFile.length > 0;

  // 1. Phân biệt các chặng biến đổi hình thái (Morphological Beat Detection)
  // sceneIndex hoặc file name chỉ định trạng thái hành động
  const fileLower = cleanFile.toLowerCase();
  const isTitle = sceneIndex === 0 && !hasImage;
  const isSkullAwaken = fileLower.includes("scene_02") || fileLower.includes("skull_reference");
  const isCracking = fileLower.includes("scene_03") || fileLower.includes("cracking");
  const isSoilRising = fileLower.includes("scene_04") || fileLower.includes("soil");
  const isSeedling = fileLower.includes("scene_05") || fileLower.includes("seedling");
  const isSeedlingZoom = fileLower.includes("scene_06") || fileLower.includes("zoom");
  const isTreeGrowth = fileLower.includes("scene_07") || fileLower.includes("tree_growing");
  const isFruitsSway = fileLower.includes("scene_08") || fileLower.includes("fruits");
  const isFruitFalling = fileLower.includes("scene_09") || fileLower.includes("falling");
  const isSkullReturn = fileLower.includes("scene_10") || fileLower.includes("return");
  const isFullSkullPhase = isSkullAwaken || isSkullReturn;

  // 2. Camera Continuous Easing (Chuyển động điện ảnh mượt mà 30fps)
  let scale = 1.0;
  let translateX = 0;
  let translateY = 0;

  switch (cameraEase) {
    case "zoom_in":
      scale = interpolate(frame, [0, totalFrames], [1.0, 1.14], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      translateY = interpolate(frame, [0, totalFrames], [0, -16]);
      break;
    case "zoom_out":
      scale = interpolate(frame, [0, totalFrames], [1.15, 1.02], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      translateY = interpolate(frame, [0, totalFrames], [-14, 0]);
      break;
    case "pan_left":
      scale = 1.08;
      translateX = interpolate(frame, [0, totalFrames], [30, -30]);
      break;
    case "pan_right":
      scale = 1.08;
      translateX = interpolate(frame, [0, totalFrames], [-30, 30]);
      break;
    case "breathing":
    default:
      scale = 1.04 + Math.sin(frame * 0.04) * 0.02;
      translateY = Math.cos(frame * 0.035) * 8;
      break;
  }

  // 3. Anime Life Breathing Filter (Sự sống trong từng đường nét vẽ tay)
  const animTime = frame * 0.08;
  const windSway = Math.sin(animTime) * 3;
  const microPulse = Math.cos(animTime * 0.7) * 2;

  // 4. Hệ thống hạt vỡ rơi theo trọng lực (Scene 03: Cracking & Gravity Fall)
  const fallParticles: VectorParticle[] = useMemo(() => {
    const list: VectorParticle[] = [];
    for (let i = 0; i < 48; i++) {
      list.push({
        id: i,
        initialX: 960 + ((i % 12) - 6) * 35 + (i * 17) % 20,
        initialY: 480 + Math.floor(i / 12) * 45 + (i * 23) % 30,
        size: 4 + (i % 6) * 3,
        speedY: 0.15 + (i % 5) * 0.08,
        speedX: ((i % 7) - 3) * 0.35,
        rotationSpeed: ((i % 5) - 2) * 2.5,
        delayFrame: Math.floor(i * 3.5),
      });
    }
    return list;
  }, []);

  // 5. Mặt đất đen dâng lên và KHÓA CỨNG tại 75% chiều cao (y = 810px) (Scene 04)
  const soilTargetY = 810; // 75% của 1080px
  const soilCurrentY = isSoilRising
    ? interpolate(frame, [0, Math.min(totalFrames * 0.75, 120)], [1080, soilTargetY], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : soilTargetY;

  // 6. Quả sọ rụng và rơi hoàn toàn ra ngoài mép dưới màn hình (Scene 09)
  const fallingFruitSnapFrame = Math.floor(totalFrames * 0.2);
  const fruitElapsed = Math.max(0, frame - fallingFruitSnapFrame);
  // Gia tốc trọng trường y = y0 + 0.5 * g * t^2
  const fruitGravityY =
    frame > fallingFruitSnapFrame
      ? 520 + 0.5 * 0.45 * Math.pow(fruitElapsed, 2)
      : 520;
  const fruitRotate =
    frame > fallingFruitSnapFrame ? fruitElapsed * 2.2 : Math.sin(frame * 0.05) * 6;

  // 7. Nhịp đung đưa trong gió của 4 quả sọ trên cành cây (Scene 08)
  const fruitWindAngles = [
    Math.sin(frame * 0.06 + 0.2) * 7,
    Math.sin(frame * 0.055 + 1.8) * 8,
    Math.sin(frame * 0.065 + 3.4) * 6,
    Math.sin(frame * 0.05 + 4.9) * 9,
  ];

  // 8. Xuất hiện tiêu đề
  const textSpring = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.8 },
  });
  const textOpacity = interpolate(textSpring, [0, 1], [0, 1]);
  const textTranslateY = interpolate(textSpring, [0, 1], [25, 0]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: isTitle ? "#000000" : "#FFFFFF",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* SVG FILTERS: ANIME ORGANIC DISPLACEMENT (LÔNG VŨ THỞ & ĐƯỜNG NÉT SỐNG ĐỘNG) */}
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <filter id="anime-organic-breathing">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.015"
              numOctaves="3"
              seed={Math.floor(frame / 4)}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={2.8 + Math.sin(frame * 0.05) * 1.2}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>

          <filter id="cracking-shiver">
            <feTurbulence
              type="turbulence"
              baseFrequency="0.04"
              numOctaves="2"
              seed={Math.floor(frame / 2)}
              result="shiver"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="shiver"
              scale={4.0}
              xChannelSelector="B"
              yChannelSelector="R"
            />
          </filter>
        </defs>
      </svg>

      {/* LỚP 1: NỀN ART CANVAS HỌA TIẾT GIẤY MỰC ĐEN TRẮNG */}
      {!isTitle && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background:
              "radial-gradient(circle at 50% 50%, #FFFFFF 60%, #F8F9FA 90%, #ECEEF1 100%)",
            opacity: 0.95,
          }}
        />
      )}

      {/* LỚP 2: HÌNH THÁI CHỦ THỂ NGHỆ THUẬT (KEYFRAME SILHOUETTE) VỚI CAMERA EASING */}
      {hasImage && !isTitle && (
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
            transform: `translate(${translateX + windSway * (isFullSkullPhase ? 0.6 : 0.4)}px, ${translateY + microPulse * 0.4}px) scale(${scale})`,
            transformOrigin: "center center",
            filter: "url(#anime-organic-breathing)",
          }}
        >
          <Img
            src={staticFile(cleanFile)}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              filter: "contrast(125%) brightness(98%)",
            }}
          />
        </div>
      )}

      {/* LỚP 3: VẾT NỨT ZIGZAG HỮU CƠ ĐỘNG HỌC (SCENE 03: CRACKING FISSURES) */}
      {isCracking && (
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            filter: "url(#cracking-shiver)",
          }}
          viewBox="0 0 1920 1080"
        >
          {/* Nhánh nứt 1: Trán sọ */}
          <path
            d="M 960 360 L 975 410 L 955 450 L 980 500 L 965 560 L 990 620 L 950 690"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeDasharray="400"
            strokeDashoffset={interpolate(frame, [0, totalFrames * 0.5], [400, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          />
          {/* Nhánh nứt 2: Hốc mắt phải */}
          <path
            d="M 975 450 L 1020 470 L 1050 510 L 1090 530 L 1120 580"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.8"
            strokeDasharray="300"
            strokeDashoffset={interpolate(frame, [totalFrames * 0.15, totalFrames * 0.65], [300, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          />
          {/* Nhánh nứt 3: Hàm sọ */}
          <path
            d="M 965 560 L 930 600 L 910 650 L 880 700 L 850 740"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3.0"
            strokeDasharray="300"
            strokeDashoffset={interpolate(frame, [totalFrames * 0.25, totalFrames * 0.8], [300, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          />
        </svg>
      )}

      {/* LỚP 4: HỆ THỐNG MẢNH VỠ RƠI TỰ DO THEO TRỌNG LỰC NHƯ HẠT MẦM (FALLING SEEDS) */}
      {(isCracking || isSoilRising) && (
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
          viewBox="0 0 1920 1080"
        >
          {fallParticles.map((p) => {
            const activeFrame = Math.max(0, frame - p.delayFrame);
            // y = y0 + 0.5 * g * t^2
            const posY = p.initialY + 0.5 * p.speedY * Math.pow(activeFrame, 1.85);
            const posX = p.initialX + p.speedX * activeFrame + Math.sin(activeFrame * 0.08) * 8;
            const rot = activeFrame * p.rotationSpeed;
            const alpha = posY > 1020 ? 0 : interpolate(posY, [480, 950], [1, 0.85]);

            if (frame < p.delayFrame || alpha <= 0) return null;

            return (
              <polygon
                key={p.id}
                points={`${posX},${posY - p.size} ${posX + p.size * 0.9},${posY + p.size * 0.5} ${posX - p.size * 0.8},${posY + p.size * 0.7}`}
                fill="#000000"
                opacity={alpha}
                transform={`rotate(${rot}, ${posX}, ${posY})`}
              />
            );
          })}
        </svg>
      )}

      {/* LỚP 5: LỚP ĐẤT ĐEN DÂNG LÊN VÀ KHÓA CHẶT TẠI 75% ĐỘ CAO (SCENE 04, 05, 06, 07, 08) */}
      {(isSoilRising || isSeedling || isSeedlingZoom || isTreeGrowth || isFruitsSway || isFruitFalling) && (
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
          viewBox="0 0 1920 1080"
        >
          {/* Bề mặt đất đen lượn sóng hữu cơ */}
          <path
            d={`M 0 1080 L 0 ${soilCurrentY} Q 480 ${soilCurrentY - 12} 960 ${soilCurrentY + 4} T 1920 ${soilCurrentY - 8} L 1920 1080 Z`}
            fill="#050505"
          />
          {/* Cấu trúc vi hạt dinh dưỡng đen trên mặt đất */}
          <circle cx="840" cy={soilCurrentY + 25} r="3.5" fill="#151515" />
          <circle cx="1080" cy={soilCurrentY + 18} r="4.0" fill="#181818" />
          <circle cx="950" cy={soilCurrentY + 35} r="3.0" fill="#121212" />
        </svg>
      )}

      {/* LỚP 6: MẦM CÂY NON VƯƠN LÊN TỪ LÒNG ĐẤT VÀ 2 LÁ BUNG NỞ (SCENE 05 & 06) */}
      {(isSeedling || isSeedlingZoom) && (
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
          viewBox="0 0 1920 1080"
        >
          {/* Thân mầm non vươn lên */}
          <path
            d="M 960 810 Q 958 740 960 670"
            fill="none"
            stroke="#000000"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeDasharray="160"
            strokeDashoffset={interpolate(frame, [0, totalFrames * 0.6], [160, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          />
          {/* Lá lông vũ 1 (Trái) */}
          <path
            d="M 960 690 Q 915 675 885 695 Q 920 710 960 695"
            fill="#000000"
            opacity={interpolate(frame, [totalFrames * 0.35, totalFrames * 0.8], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          />
          {/* Lá lông vũ 2 (Phải) */}
          <path
            d="M 960 675 Q 1005 655 1035 675 Q 1000 690 960 680"
            fill="#000000"
            opacity={interpolate(frame, [totalFrames * 0.45, totalFrames * 0.9], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          />
        </svg>
      )}

      {/* LỚP 7: ĐÚNG 4 QUẢ ĐẦU LÂU LÔNG VŨ ĐUNG ĐƯA TRÊN CÀNH (SCENE 08) */}
      {isFruitsSway && (
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
          viewBox="0 0 1920 1080"
        >
          {/* Cuống và Quả sọ 1 (Cành trái cao) */}
          <g transform={`rotate(${fruitWindAngles[0]}, 680, 390)`}>
            <line x1="680" y1="390" x2="680" y2="440" stroke="#000000" strokeWidth="3" />
            <circle cx="680" cy="460" r="18" fill="#000000" />
            <polygon points="675,475 685,475 680,488" fill="#000000" />
          </g>

          {/* Cuống và Quả sọ 2 (Cành giữa đỉnh) */}
          <g transform={`rotate(${fruitWindAngles[1]}, 960, 270)`}>
            <line x1="960" y1="270" x2="960" y2="320" stroke="#000000" strokeWidth="3" />
            <circle cx="960" cy="340" r="20" fill="#000000" />
            <polygon points="954,357 966,357 960,372" fill="#000000" />
          </g>

          {/* Cuống và Quả sọ 3 (Cành phải) */}
          <g transform={`rotate(${fruitWindAngles[2]}, 1240, 380)`}>
            <line x1="1240" y1="380" x2="1240" y2="430" stroke="#000000" strokeWidth="3" />
            <circle cx="1240" cy="450" r="19" fill="#000000" />
            <polygon points="1235,466 1245,466 1240,480" fill="#000000" />
          </g>

          {/* Cuống và Quả sọ 4 (Cành thấp) */}
          <g transform={`rotate(${fruitWindAngles[3]}, 830, 480)`}>
            <line x1="830" y1="480" x2="830" y2="525" stroke="#000000" strokeWidth="2.5" />
            <circle cx="830" cy="545" r="17" fill="#000000" />
            <polygon points="825,560 835,560 830,572" fill="#000000" />
          </g>
        </svg>
      )}

      {/* LỚP 8: ĐÚNG 1 QUẢ SỌ ĐỨT CUỐNG RƠI THEO GIA TỐC TRỌNG TRƯỜNG RA KHỎI ĐÁY KHUNG HÌNH (SCENE 09) */}
      {isFruitFalling && (
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
          viewBox="0 0 1920 1080"
        >
          {/* Quả sọ đang rơi tự do qua trọng lực */}
          <g
            transform={`translate(960, ${fruitGravityY}) rotate(${fruitRotate})`}
          >
            <circle cx="0" cy="0" r="32" fill="#000000" />
            {/* Hốc mắt sọ rỗng */}
            <circle cx="-10" cy="-4" r="7" fill="#FFFFFF" />
            <circle cx="10" cy="-4" r="7" fill="#FFFFFF" />
            {/* Hàm răng và lông vũ sắc nhọn */}
            <polygon points="-12,18 12,18 0,36" fill="#000000" />
            <path
              d="M -28 -15 Q -42 -25 -25 -32 Q -18 -22 -15 -10"
              fill="#000000"
            />
            <path
              d="M 28 -15 Q 42 -25 25 -32 Q 18 -22 15 -10"
              fill="#000000"
            />
          </g>
        </svg>
      )}

      {/* LỚP 9: PHỤ ĐỀ / TIÊU ĐỀ NGHỆ THUẬT TỐI GIẢN */}
      {onScreenText?.title && (
        <div
          style={{
            position: "absolute",
            top: isTitle ? "45%" : "8%",
            left: 0,
            width: "100%",
            textAlign: "center",
            transform: `translateY(${textTranslateY}px)`,
            opacity: textOpacity,
            zIndex: 10,
          }}
        >
          <h1
            style={{
              fontFamily: "'Playfair Display', serif, Georgia",
              fontSize: isTitle ? "64px" : "36px",
              fontWeight: 400,
              letterSpacing: "0.22em",
              color: isTitle ? "#FFFFFF" : "#111111",
              margin: 0,
              textTransform: "uppercase",
            }}
          >
            {onScreenText.title}
          </h1>
          {onScreenText.subtitle && (
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "16px",
                fontWeight: 300,
                letterSpacing: "0.15em",
                color: isTitle ? "#AAAAAA" : "#666666",
                marginTop: "14px",
                textTransform: "uppercase",
              }}
            >
              {onScreenText.subtitle}
            </p>
          )}
        </div>
      )}

      {/* LỚP 10: SUBTITLES PHỤ ĐỀ (NẾU CÓ) */}
      {subtitles && subtitles.length > 0 && (
        <Subtitles voiceoverText={voiceoverText} cues={subtitles} />
      )}
    </div>
  );
};
