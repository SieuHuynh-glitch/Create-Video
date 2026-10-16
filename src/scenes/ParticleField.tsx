import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

export interface ParticleFieldProps {
  particleCount?: number;
  color?: string;
  opacity?: number;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  seed: number;
}

// Sinh mảng hạt cố định dựa trên seed ngẫu nhiên nhưng xác định
const PARTICLES: Particle[] = Array.from({ length: 36 }).map((_, i) => ({
  x: (i * 53.7) % 1920,
  y: (i * 91.3) % 1080,
  size: 1.5 + (i % 4) * 0.8,
  speedX: ((i % 5) - 2) * 0.35,
  speedY: -0.4 - (i % 3) * 0.25,
  seed: i * 17.3,
}));

export const ParticleField: React.FC<ParticleFieldProps> = ({
  color = "#000000",
  opacity = 0.08,
}) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 5,
        overflow: "hidden",
      }}
    >
      <svg
        width="1920"
        height="1080"
        viewBox="0 0 1920 1080"
        style={{ width: "100%", height: "100%", opacity }}
      >
        {PARTICLES.map((p, idx) => {
          // Vị trí di chuyển tuần hoàn vô tận
          const currentX = (p.x + frame * p.speedX + 1920) % 1920;
          const currentY = (p.y + frame * p.speedY + 1080) % 1080;
          const pulse = interpolate(
            Math.sin(frame * 0.05 + p.seed),
            [-1, 1],
            [0.4, 1.0]
          );

          return (
            <circle
              key={idx}
              cx={currentX}
              cy={currentY}
              r={p.size * pulse}
              fill={color}
              opacity={pulse}
            />
          );
        })}
      </svg>
    </div>
  );
};
