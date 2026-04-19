import {
  AbsoluteFill,
  interpolate,
  OffthreadVideo,
  useCurrentFrame,
  useVideoConfig,
  Audio,
} from "remotion";
import { CaptionTrack } from "./CaptionTrack";

export const VerticalShort = ({ videoSrc, captions, clipStart, clipDuration, musicSrc }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Slow zoom: 1.3x → 1.38x over the clip
  const scale = interpolate(frame, [0, durationInFrames], [1.3, 1.38], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {/* Video layer — cropped 16:9 → 9:16, centered on speaker */}
      <AbsoluteFill
        style={{
          transform: `scale(${scale}) translateX(10%) translateY(-8%)`,
          transformOrigin: "center center",
        }}
      >
        <OffthreadVideo
          src={videoSrc}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>

      {/* Lo-fi background music at 12% volume */}
      {musicSrc && <Audio src={musicSrc} volume={0.12} />}

      {/* Captions */}
      <CaptionTrack captions={captions} clipStart={clipStart} />
    </AbsoluteFill>
  );
};
