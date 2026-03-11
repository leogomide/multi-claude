import { useCurrentFrame } from "remotion";
import { COLORS } from "../constants";

export const LoadingSpinner: React.FC<{
  text?: string;
  color?: string;
}> = ({ text = "Loading", color = COLORS.cyan }) => {
  const frame = useCurrentFrame();
  const dots = ".".repeat((Math.floor(frame / 8) % 3) + 1);

  return (
    <span style={{ color }}>
      {text}
      {dots}
    </span>
  );
};
