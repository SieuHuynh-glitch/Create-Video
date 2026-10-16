import React from "react";
import { Sequence, Audio, staticFile, interpolate } from "remotion";
import { Timeline, TimelineScene } from "./schema";
import {
  TitleScene,
  BulletsScene,
  StatScene,
  QuoteScene,
  OutroScene,
  ImageScene,
  VideoScene,
} from "./scenes";

export type MainVideoProps = Timeline;

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
}) => {
  const totalVideoFrames =
    totalDurationInFrames ||
    scenes.reduce((acc, s) => acc + (s.durationInFrames || 0), 0) ||
    300;

  const bgmFile = bgm?.file
    ? bgm.file.replace(/^[/\\]+/, "").trim()
    : "system-audio/bgm_ambient.wav";
  const bgmVolume = bgm?.volume ?? 0.08;

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
      {/* 1. Track BGM nền chạy liên tục toàn bộ video có fade in / fade out */}
      {bgmFile ? (
        <Audio
          src={staticFile(bgmFile)}
          volume={(f) =>
            interpolate(
              f,
              [0, 30, Math.max(31, totalVideoFrames - 45), totalVideoFrames],
              [0, bgmVolume, bgmVolume, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            )
          }
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
            {/* Visual Scene Content */}
            {renderSceneComponent(scene)}

            {/* Transition Whoosh SFX cho các cảnh chuyển tiếp (từ cảnh thứ 2 trở đi) */}
            {idx > 0 ? (
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
    </div>
  );
};
