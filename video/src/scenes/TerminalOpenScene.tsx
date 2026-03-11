import {
  spring,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { COLORS } from "../constants";
import { TerminalWindow } from "../components/TerminalWindow";
import { TerminalCursor } from "../components/TerminalCursor";
import { TextOverlay } from "../components/TextOverlay";

const COMMAND = "mclaude";
const CHAR_FRAMES = 3;
const TYPE_START = 30;
const ENTER_FRAME = TYPE_START + COMMAND.length * CHAR_FRAMES + 15;

export const TerminalOpenScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Terminal scale in
  const terminalScale = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  // Typewriter
  const typedChars = Math.min(
    COMMAND.length,
    Math.max(0, Math.floor((frame - TYPE_START) / CHAR_FRAMES))
  );
  const typedText = COMMAND.slice(0, typedChars);
  const doneTyping = typedChars >= COMMAND.length;

  // Enter flash
  const showEnter = frame >= ENTER_FRAME;
  const enterFlash = showEnter
    ? interpolate(frame - ENTER_FRAME, [0, 4, 8], [0, 0.3, 0], {
        extrapolateRight: "clamp",
      })
    : 0;

  // After enter: show TUI loading
  const showLoading = frame >= ENTER_FRAME + 10;
  const loadingDots = showLoading
    ? ".".repeat((Math.floor((frame - ENTER_FRAME - 10) / 8) % 3) + 1)
    : "";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        transform: `scale(${terminalScale})`,
        position: "absolute",
      }}
    >
      <TerminalWindow>
        {/* Shell prompt + typing */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ color: COLORS.green, fontWeight: 700 }}>
              ~/projects
            </span>
            <span style={{ color: COLORS.white, margin: "0 8px" }}>$</span>
            <span style={{ color: COLORS.white }}>{typedText}</span>
            {!showEnter && frame >= TYPE_START && <TerminalCursor />}
          </div>

          {showLoading && !showEnter ? null : null}

          {showEnter && (
            <div style={{ marginTop: 16 }}>
              {!showLoading ? (
                <span style={{ color: COLORS.gray }}>
                  Loading{loadingDots}
                </span>
              ) : (
                <>
                  <div style={{ color: COLORS.cyan, marginBottom: 8 }}>
                    Starting mclaude...
                  </div>
                  <div style={{ color: COLORS.green }}>
                    ✔ Configuration loaded
                  </div>
                  <div
                    style={{
                      color: COLORS.green,
                      opacity: interpolate(
                        frame - ENTER_FRAME - 20,
                        [0, 10],
                        [0, 1],
                        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                      ),
                    }}
                  >
                    ✔ 3 providers found
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </TerminalWindow>

      {/* White flash overlay for enter */}
      {enterFlash > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: `rgba(255, 255, 255, ${enterFlash})`,
            pointerEvents: "none",
          }}
        />
      )}

      <TextOverlay
        text="Launch mclaude from any terminal"
        startFrame={15}
        durationFrames={120}
      />
    </div>
  );
};
