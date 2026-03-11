import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Sequence,
} from "remotion";
import { COLORS, TERMINAL } from "../constants";
import { mono } from "../fonts";
import { TerminalWindow } from "../components/TerminalWindow";
import { TextOverlay } from "../components/TextOverlay";

export const LaunchScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Loading dots
  const dots = ".".repeat((Math.floor(frame / 8) % 3) + 1);

  // Checkmarks appear sequentially
  const check1Frame = 20;
  const check2Frame = 35;
  const check3Frame = 50;

  const check1 = spring({ frame: frame - check1Frame, fps, config: { damping: 200 } });
  const check2 = spring({ frame: frame - check2Frame, fps, config: { damping: 200 } });
  const check3 = spring({ frame: frame - check3Frame, fps, config: { damping: 200 } });

  // Success banner
  const bannerFrame = 60;
  const bannerScale = spring({
    frame: frame - bannerFrame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  return (
    <div style={{ width: "100%", height: "100%", position: "absolute" }}>
      <TerminalWindow>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 16,
          }}
        >
          {/* Loading phase */}
          {frame < check1Frame && (
            <div style={{ color: COLORS.cyan, fontSize: 24 }}>
              Starting Claude Code{dots}
            </div>
          )}

          {/* Checklist */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            {frame >= check1Frame && (
              <div
                style={{
                  opacity: check1,
                  color: COLORS.green,
                  fontSize: 22,
                  transform: `translateX(${interpolate(check1, [0, 1], [-20, 0])}px)`,
                }}
              >
                ✔ Provider: OpenRouter
              </div>
            )}
            {frame >= check2Frame && (
              <div
                style={{
                  opacity: check2,
                  color: COLORS.green,
                  fontSize: 22,
                  transform: `translateX(${interpolate(check2, [0, 1], [-20, 0])}px)`,
                }}
              >
                ✔ Model: claude-sonnet-4
              </div>
            )}
            {frame >= check3Frame && (
              <div
                style={{
                  opacity: check3,
                  color: COLORS.green,
                  fontSize: 22,
                  transform: `translateX(${interpolate(check3, [0, 1], [-20, 0])}px)`,
                }}
              >
                ✔ Flags: --resume
              </div>
            )}
          </div>

          {/* Success banner */}
          {frame >= bannerFrame && (
            <div
              style={{
                marginTop: 24,
                transform: `scale(${bannerScale})`,
                backgroundColor: "rgba(80, 250, 123, 0.1)",
                border: `2px solid ${COLORS.green}`,
                borderRadius: 12,
                padding: "16px 32px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  color: COLORS.green,
                  fontSize: 28,
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                🚀 Claude Code is running!
              </div>
              <div style={{ color: COLORS.gray, fontSize: 16 }}>
                OpenRouter / anthropic/claude-sonnet-4
              </div>
            </div>
          )}
        </div>
      </TerminalWindow>

      <TextOverlay text="Ready to code" startFrame={60} durationFrames={30} />
    </div>
  );
};
