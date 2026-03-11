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
  const { fps, durationInFrames } = useVideoConfig();

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
        bottom: 50,
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
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          padding: "12px 32px",
          borderRadius: 12,
          fontFamily: sans,
          fontSize: 24,
          color: COLORS.white,
          fontWeight: 600,
          backdropFilter: "blur(8px)",
        }}
      >
        {text}
      </div>
    </div>
  );
};
