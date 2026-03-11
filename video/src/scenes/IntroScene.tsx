import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Sequence,
} from "remotion";
import { COLORS } from "../constants";
import { mono, sans } from "../fonts";

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title spring in
  const titleScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const titleOpacity = interpolate(titleScale, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Subtitle fade in
  const subtitleProgress = spring({
    frame,
    fps,
    delay: 25,
    config: { damping: 200 },
  });

  // Tagline typewriter
  const tagline = "One CLI. Any Provider.";
  const taglineStart = 50;
  const charFrames = 2;
  const typedChars = Math.min(
    tagline.length,
    Math.max(0, Math.floor((frame - taglineStart) / charFrames))
  );
  const typedTagline = tagline.slice(0, typedChars);

  // Cursor blink for tagline
  const cursorOpacity = interpolate(
    frame % 16,
    [0, 8, 16],
    [1, 0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 40%, #1e2040 0%, ${COLORS.background} 70%)`,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      {/* Logo / Title */}
      <div
        style={{
          transform: `scale(${titleScale})`,
          opacity: titleOpacity,
          fontFamily: mono,
          fontSize: 82,
          fontWeight: 700,
          color: COLORS.magenta,
          marginBottom: 20,
        }}
      >
        ✨ multi-claude
      </div>

      {/* Subtitle */}
      <div
        style={{
          opacity: subtitleProgress,
          fontFamily: sans,
          fontSize: 28,
          color: COLORS.gray,
          marginBottom: 40,
          transform: `translateY(${interpolate(subtitleProgress, [0, 1], [10, 0])}px)`,
        }}
      >
        Manage multiple API providers for Claude Code
      </div>

      {/* Tagline typewriter */}
      <Sequence from={taglineStart} layout="none">
        <div
          style={{
            fontFamily: mono,
            fontSize: 36,
            color: COLORS.cyan,
            fontWeight: 700,
          }}
        >
          {typedTagline}
          {frame >= taglineStart && (
            <span style={{ opacity: cursorOpacity }}>{"\u258C"}</span>
          )}
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
