import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Img,
  staticFile,
} from "remotion";
import { COLORS, TERMINAL } from "../constants";
import { mono } from "../fonts";
import { TerminalCursor } from "../components/TerminalCursor";
import { TextOverlay } from "../components/TextOverlay";

// Timing
const HEADER_START = 8;
const TIP_START = 28;
const PROMPT_START = 45;
const STATUSLINE_START = 55;

export const LaunchScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const terminalFade = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const headerOpacity = spring({ frame: frame - HEADER_START, fps, config: { damping: 200 } });
  const tipOpacity = spring({ frame: frame - TIP_START, fps, config: { damping: 200 } });
  const promptOpacity = spring({ frame: frame - PROMPT_START, fps, config: { damping: 200 } });
  const statusOpacity = spring({ frame: frame - STATUSLINE_START, fps, config: { damping: 200 } });

  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", opacity: terminalFade }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 30%, #1e2040 0%, ${COLORS.background} 70%)`,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: mono,
        }}
      >
        <div
          style={{
            width: TERMINAL.width,
            height: TERMINAL.height,
            backgroundColor: COLORS.terminalBg,
            borderRadius: TERMINAL.borderRadius,
            boxShadow: "0 25px 80px rgba(0, 0, 0, 0.6)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            border: `1px solid ${COLORS.dimGray}`,
          }}
        >
          {/* Title bar */}
          <div
            style={{
              height: TERMINAL.titleBarHeight,
              backgroundColor: COLORS.titleBar,
              display: "flex",
              alignItems: "center",
              paddingLeft: 20,
              gap: 8,
              flexShrink: 0,
            }}
          >
            <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: COLORS.red }} />
            <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: COLORS.yellow }} />
            <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: COLORS.green }} />
            <div
              style={{
                flex: 1,
                textAlign: "center",
                color: COLORS.gray,
                fontSize: 14,
                marginRight: 60,
              }}
            >
              claude — ~/projects/my-app
            </div>
          </div>

          {/* Terminal content */}
          <div
            style={{
              flex: 1,
              padding: TERMINAL.padding,
              paddingBottom: 0,
              display: "flex",
              flexDirection: "column",
              fontSize: TERMINAL.fontSize,
              color: COLORS.white,
            }}
          >
            {/* ── Claude Code Header ── */}
            <div
              style={{
                opacity: headerOpacity,
                display: "flex",
                alignItems: "flex-start",
                gap: 16,
                marginBottom: 20,
              }}
            >
              {/* Icon */}
              <Img
                src={staticFile("claude-code-icon.png")}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 8,
                  flexShrink: 0,
                  marginTop: 2,
                }}
              />
              {/* Text block */}
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 22, color: COLORS.white }}>
                    Claude Code
                  </span>
                  <span style={{ color: COLORS.gray, fontSize: 16 }}>v2.1.72</span>
                </div>
                <div style={{ color: COLORS.gray, fontSize: 15 }}>
                  GLM-5 with high effort · Z.AI
                </div>
                <div style={{ color: COLORS.gray, fontSize: 15 }}>
                  ~/projects/my-app
                </div>
              </div>
            </div>

            {/* ── Tip line ── */}
            <div
              style={{
                opacity: tipOpacity,
                fontSize: 15,
                color: COLORS.gray,
                marginBottom: 24,
              }}
            >
              <span style={{ color: COLORS.cyan }}>↑</span>{" "}
              Powered by <span style={{ color: COLORS.white, fontWeight: 600 }}>Z.AI</span>{" "}
              · Base URL: <span style={{ color: COLORS.gray }}>api.z.ai/api/anthropic</span>
            </div>

            {/* ── Prompt ── */}
            <div
              style={{
                opacity: promptOpacity,
                display: "flex",
                alignItems: "center",
                fontSize: 20,
                marginBottom: 0,
              }}
            >
              <span style={{ color: COLORS.white, fontWeight: 700, marginRight: 10 }}>
                ›
              </span>
              <TerminalCursor color={COLORS.white} />
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* ── Status Line (mclaude statusline) ── */}
            <div
              style={{
                opacity: statusOpacity,
                flexShrink: 0,
                paddingBottom: TERMINAL.padding,
              }}
            >
              {/* Separator */}
              <div
                style={{
                  color: COLORS.dimGray,
                  fontSize: 13,
                  letterSpacing: 1,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  marginBottom: 6,
                }}
              >
                {"─".repeat(120)}
              </div>

              {/* Line 1: Model + branch */}
              <div style={{ fontSize: 15, color: COLORS.gray, marginBottom: 3 }}>
                <span style={{ color: COLORS.white, fontWeight: 600 }}>GLM-5</span>
                {"  "}
                <span style={{ color: COLORS.cyan }}>(master)</span>
              </div>

              {/* Line 2: Tokens */}
              <div style={{ fontSize: 14, color: COLORS.gray, marginBottom: 3 }}>
                <span>Input:0</span>
                <span style={{ color: COLORS.dimGray, margin: "0 10px" }}>│</span>
                <span>Output:0</span>
                <span style={{ color: COLORS.dimGray, margin: "0 10px" }}>│</span>
                <span>Cache:0</span>
              </div>

              {/* Line 3: Session + Cost */}
              <div style={{ fontSize: 14, color: COLORS.gray, marginBottom: 3 }}>
                <span>Sessao:0m 3s</span>
                <span style={{ color: COLORS.dimGray, margin: "0 8px" }}>│</span>
                <span>API:0m 0s</span>
                <span style={{ color: COLORS.dimGray, margin: "0 14px" }}>│</span>
                <span>Custo:<span style={{ color: COLORS.green }}>$0.00</span></span>
                <span style={{ color: COLORS.dimGray, margin: "0 8px" }}>│</span>
                <span><span style={{ color: COLORS.green }}>$0.00</span>/min</span>
              </div>

              {/* Line 4: Context bar */}
              <div style={{ fontSize: 14, color: COLORS.gray, marginBottom: 3, display: "flex", alignItems: "center" }}>
                <span style={{ color: COLORS.dimGray }}>{"─".repeat(40)}</span>
                <span style={{ color: COLORS.dimGray, margin: "0 8px" }}>│</span>
                <span>0/0%</span>
                <span style={{ color: COLORS.dimGray, margin: "0 14px" }}>│</span>
                <span>0/0% rest.</span>
              </div>

              {/* Line 5: Bypass permissions */}
              <div style={{ fontSize: 14, marginTop: 2 }}>
                <span style={{ color: COLORS.yellow }}>››</span>{" "}
                <span style={{ color: COLORS.yellow }}>bypass permissions on</span>{" "}
                <span style={{ color: COLORS.gray }}>(shift+tab to cycle)</span>
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>

      <TextOverlay
        text="Claude Code is running with Z.AI"
        startFrame={PROMPT_START + 5}
        durationFrames={40}
      />
    </div>
  );
};
