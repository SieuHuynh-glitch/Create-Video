import React from "react";
import { Sequence, Audio, staticFile, interpolate, useCurrentFrame } from "remotion";
import { Timeline, TimelineScene } from "./schema";
import {
  TitleScene,
  BulletsScene,
  StatScene,
  QuoteScene,
  OutroScene,
  ImageScene,
  VideoScene,
  LumaParallaxScene,
  ParticleField,
} from "./scenes";

export type MainVideoProps = Timeline;

const SceneContent: React.FC<{
  scene: TimelineScene;
  idx: number;
}> = ({ scene, idx }) => {
  const frame = useCurrentFrame();
  const overlapFrames = 30; // 1.0s melting overlap
  const opacity =
    idx > 0
      ? interpolate(frame, [0, overlapFrames], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1;

  return (
    <div style={{ width: "100%", height: "100%", opacity }}>
      {renderSceneComponent(scene)}
    </div>
  );
};

function renderSceneComponent(scene: TimelineScene) {
  const onScreenText = scene.onScreenText || {};
  const voiceoverText = scene.voiceoverText || "";
  const subtitles = scene.subtitles;

  switch (scene.type) {
    case "title":
      return (
        <TitleScene
          onScreenText={onScreenText}
          voiceoverText={voiceoverText}
          subtitles={subtitles}
        />
      );
    case "bullets":
      return (
        <BulletsScene
          onScreenText={onScreenText}
          voiceoverText={voiceoverText}
          subtitles={subtitles}
        />
      );
    case "stat":
      return (
        <StatScene
          onScreenText={onScreenText}
          voiceoverText={voiceoverText}
          subtitles={subtitles}
        />
      );
    case "quote":
      return (
        <QuoteScene
          onScreenText={onScreenText}
          voiceoverText={voiceoverText}
          subtitles={subtitles}
        />
      );
    case "outro":
      return (
        <OutroScene
          onScreenText={onScreenText}
          voiceoverText={voiceoverText}
          subtitles={subtitles}
        />
      );
    case "image":
      return (
        <ImageScene
          onScreenText={onScreenText}
          voiceoverText={voiceoverText}
          visual={scene.visual}
          durationInFrames={scene.durationInFrames}
          subtitles={subtitles}
        />
      );
    case "video":
      return (
        <VideoScene
          onScreenText={onScreenText}
          voiceoverText={voiceoverText}
          visual={scene.visual}
          durationInFrames={scene.durationInFrames}
          subtitles={subtitles}
        />
      );
    case "luma-parallax":
      return (
        <LumaParallaxScene
          onScreenText={onScreenText}
          voiceoverText={voiceoverText}
          visual={scene.visual}
          durationInFrames={scene.durationInFrames}
          subtitles={subtitles}
        />
      );
    default:
      return (
        <TitleScene
          onScreenText={onScreenText}
          voiceoverText={voiceoverText}
          subtitles={subtitles}
        />
      );
  }
}

export const MainVideo: React.FC<MainVideoProps> = ({
  scenes = [],
  totalDurationInFrames,
  bgm,
  isInstrumental,
}) => {
  const totalVideoFrames =
    totalDurationInFrames ||
    scenes.reduce((acc, s) => acc + (s.durationInFrames || 0), 0) ||
    300;

  const bgmFile = bgm?.file
    ? bgm.file.replace(/^[/\\]+/, "").trim()
    : "system-audio/bgm_ambient.wav";
  const bgmVolume = bgm?.volume ?? 0.08;

  const isInstrumentalVideo = isInstrumental === true;

  return (
    <div
      style={{
        flex: 1,
        width: "100%",
        height: "100%",
        backgroundColor: "#0B0F19",
        position: "relative",
      }}
    >
      {/* 1. Track BGM nền chạy liên tục toàn bộ video có fade in / fade out & Audio Ducking */}
      {bgmFile ? (
        <Audio
          src={staticFile(bgmFile)}
          volume={(f) => {
            // Kiểm tra xem frame f có nằm trong khoảng phát giọng đọc của cảnh nào không
            const isVoiceoverActive = !isInstrumentalVideo && (scenes || []).some((scene) => {
              const start = (scene.startFrame ?? 0) + (scene.audioStartFrame ?? 6);
              const duration =
                scene.audioDurationInFrames ||
                Math.max(1, (scene.durationInFrames ?? 1) - (scene.audioStartFrame ?? 6));
              const end = start + duration;
              return f >= start && f <= end;
            });

            // Audio Ducking: Khi có giọng đọc, hạ âm lượng BGM xuống 60% (khoảng 0.05) để tôn giọng nói
            const baseVol = isVoiceoverActive ? bgmVolume * 0.6 : bgmVolume;

            return interpolate(
              f,
              [0, 30, Math.max(31, totalVideoFrames - 45), totalVideoFrames],
              [0, baseVol, baseVol, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );
          }}
          loop={bgm?.loop !== false}
        />
      ) : null}

      {/* 2. Các phân cảnh thị giác và âm thanh thuyết minh (có pre-roll padding & transition SFX) */}
      {(scenes || []).map((scene, idx) => {
        const audioSrc = scene.audioFile ? scene.audioFile.replace(/^[/\\]+/, "").trim() : "";
        const audioStartFrame = scene.audioStartFrame ?? 6;
        const audioDuration =
          scene.audioDurationInFrames ||
          Math.max(1, (scene.durationInFrames ?? 1) - audioStartFrame);

        return (
          <Sequence
            key={scene.id}
            from={Math.max(0, scene.startFrame ?? 0)}
            durationInFrames={Math.max(1, scene.durationInFrames ?? 1)}
            name={`${scene.id} (${scene.type})`}
          >
            {/* Visual Scene Content với Melting Dissolve Transition (1.0s = 30 frames) */}
            <SceneContent scene={scene} idx={idx} />

            {/* Transition Whoosh SFX cho các cảnh chuyển tiếp (chỉ bật khi không phải instrumental) */}
            {!isInstrumentalVideo && idx > 0 ? (
              <Sequence from={0} durationInFrames={20}>
                <Audio
                  src={staticFile("system-audio/sfx_whoosh.wav")}
                  volume={0.15}
                />
              </Sequence>
            ) : null}

            {/* Voiceover Audio bắt đầu sau pre-roll breathing room (mặc định 6 frames = 0.2s) */}
            {audioSrc ? (
              <Sequence from={audioStartFrame} durationInFrames={audioDuration}>
                <Audio
                  src={staticFile(audioSrc)}
                  volume={1.0}
                />
              </Sequence>
            ) : null}
          </Sequence>
        );
      })}

      {/* 3. Lớp hạt bụi hữu cơ & vi khí quyển (ParticleField) chạy xuyên suốt video */}
      <ParticleField color="#000000" opacity={0.06} />
    </div>
  );
};
