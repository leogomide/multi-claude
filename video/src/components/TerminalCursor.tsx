import { interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../constants";

const BLINK_FRAMES = 16;

export const TerminalCursor: React.FC<{ color?: string }> = ({
  color = COLORS.white,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame % BLINK_FRAMES,
    [0, BLINK_FRAMES / 2, BLINK_FRAMES],
    [1, 0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return <span style={{ opacity, color }}>{"\u258C"}</span>;
};
