import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { COLORS } from "../constants";
import { mono, sans } from "../fonts";

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Heading spring
  const headingScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  // Install command typewriter
  const installCmd = "bun install -g github:leogomide/multi-claude#latest";
  const typeStart = 30;
  const charFrames = 1;
  const typedChars = Math.min(
    installCmd.length,
    Math.max(0, Math.floor((frame - typeStart) / charFrames))
  );
  const typedInstall = installCmd.slice(0, typedChars);

  // mclaude command appears
  const cmdFrame = typeStart + installCmd.length * charFrames + 15;
  const cmdOpacity = spring({
    frame: frame - cmdFrame,
    fps,
    config: { damping: 200 },
  });

  // Cursor blink
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
        gap: 32,
      }}
    >
      {/* Heading */}
      <div
        style={{
          fontFamily: sans,
          fontSize: 64,
          fontWeight: 700,
          color: COLORS.white,
          transform: `scale(${headingScale})`,
        }}
      >
        Get Started
      </div>

      {/* Install command */}
      <div
        style={{
          backgroundColor: COLORS.terminalBg,
          border: `1px solid ${COLORS.dimGray}`,
          borderRadius: 12,
          padding: "20px 32px",
          fontFamily: mono,
          fontSize: 28,
        }}
      >
        <span style={{ color: COLORS.gray }}>$ </span>
        <span style={{ color: COLORS.green }}>{typedInstall}</span>
        {frame >= typeStart && typedChars < installCmd.length && (
          <span style={{ opacity: cursorOpacity, color: COLORS.green }}>
            {"\u258C"}
          </span>
        )}
      </div>

      {/* mclaude command */}
      <div
        style={{
          opacity: cmdOpacity,
          fontFamily: mono,
          fontSize: 40,
          color: COLORS.cyan,
          fontWeight: 700,
          transform: `translateY(${interpolate(cmdOpacity, [0, 1], [10, 0])}px)`,
        }}
      >
        $ mclaude
      </div>

    </AbsoluteFill>
  );
};
