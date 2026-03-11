import {
  spring,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { COLORS } from "../constants";
import { sans } from "../fonts";

export const TextOverlay: React.FC<{
  text: string;
  startFrame?: number;
  durationFrames?: number;
}> = ({ text, startFrame = 10, durationFrames = 60 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 200 },
  });

  const endFrame = startFrame + durationFrames;
  const fadeOut = spring({
    frame: frame - endFrame,
    fps,
    config: { damping: 200 },
  });

  const opacity = fadeIn - fadeOut;

  if (opacity <= 0) return null;

  const translateY = interpolate(fadeIn, [0, 1], [20, 0]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 20,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          padding: "14px 40px",
          borderRadius: 14,
          fontFamily: sans,
          fontSize: 30,
          color: COLORS.white,
          fontWeight: 600,
        }}
      >
        {text}
      </div>
    </div>
  );
};
