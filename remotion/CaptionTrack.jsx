import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Word-by-word pop-in captions, bottom third, bold white uppercase + black shadow.
 * captions = [{text, start, duration}] from transcript.json, in absolute video seconds.
 * clipStart = start of this clip in the source video (seconds).
 */
export const CaptionTrack = ({ captions, clipStart }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Current time within the clip (seconds)
  const currentSec = clipStart + frame / fps;

  // Find active caption entry
  const active = captions
    .filter((c) => currentSec >= c.start && currentSec < c.start + c.duration)
    .at(-1);

  if (!active) return null;

  // Split into words and animate each one
  const words = active.text.replace(/\n/g, " ").trim().split(/\s+/);
  const entryFrame = Math.round((active.start - clipStart) * fps);
  // Distribute words evenly across the phrase's actual spoken duration
  const entryDurationFrames = Math.round(active.duration * fps);
  const wordInterval = words.length > 1 ? entryDurationFrames / words.length : 0;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 160,
        paddingLeft: 40,
        paddingRight: 40,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0 12px",
          maxWidth: 960,
        }}
      >
        {words.map((word, i) => {
          const wordFrame = entryFrame + Math.round(i * wordInterval);
          const opacity = interpolate(frame, [wordFrame, wordFrame + 3], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const scale = interpolate(frame, [wordFrame, wordFrame + 3], [0.8, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <span
              key={i}
              style={{
                opacity,
                transform: `scale(${scale})`,
                display: "inline-block",
                fontFamily: "'Arial Black', 'Impact', sans-serif",
                fontWeight: 900,
                fontSize: 72,
                color: "#FFFFFF",
                textTransform: "uppercase",
                textShadow:
                  "-4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000, 4px 4px 0 #000, 0 6px 12px rgba(0,0,0,0.9)",
                lineHeight: 1.15,
                letterSpacing: 2,
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
