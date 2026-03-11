import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
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

// Better contrast colors for the status line
const SL = {
  label: "#8b949e",     // brighter gray for labels
  value: "#e6edf3",     // near-white for values
  accent: "#58a6ff",    // bright blue for model/branch
  cost: "#3fb950",      // bright green for costs
  separator: "#30363d", // subtle separator
  warn: "#d29922",      // amber for bypass warning
};

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
            <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: COLORS.red }} />
            <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: COLORS.yellow }} />
            <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: COLORS.green }} />
            <div
              style={{
                flex: 1,
                textAlign: "center",
                color: SL.label,
                fontSize: 18,
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
              padding: 40,
              paddingBottom: 0,
              display: "flex",
              flexDirection: "column",
              color: COLORS.white,
            }}
          >
            {/* ── Claude Code Header ── */}
            <div
              style={{
                opacity: headerOpacity,
                display: "flex",
                alignItems: "flex-start",
                gap: 20,
                marginBottom: 28,
              }}
            >
              {/* Icon */}
              <Img
                src={staticFile("claude-code-icon.png")}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 10,
                  flexShrink: 0,
                  marginTop: 2,
                }}
              />
              {/* Text block */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                  <span style={{ fontWeight: 700, fontSize: 38, color: "#ffffff" }}>
                    Claude Code
                  </span>
                  <span style={{ color: SL.label, fontSize: 26 }}>v2.1.72</span>
                </div>
                <div style={{ color: SL.value, fontSize: 26 }}>
                  GLM-5 with high effort · <span style={{ color: SL.accent }}>Z.AI</span>
                </div>
                <div style={{ color: SL.label, fontSize: 24 }}>
                  ~/projects/my-app
                </div>
              </div>
            </div>

            {/* ── Tip line ── */}
            <div
              style={{
                opacity: tipOpacity,
                fontSize: 24,
                color: SL.label,
                marginBottom: 32,
              }}
            >
              <span style={{ color: COLORS.cyan }}>↑</span>{" "}
              Powered by <span style={{ color: "#ffffff", fontWeight: 600 }}>Z.AI</span>{" "}
              · Base URL: <span style={{ color: SL.accent }}>api.z.ai/api/anthropic</span>
            </div>

            {/* ── Prompt ── */}
            <div
              style={{
                opacity: promptOpacity,
                display: "flex",
                alignItems: "center",
                fontSize: 34,
                marginBottom: 0,
              }}
            >
              <span style={{ color: "#ffffff", fontWeight: 700, marginRight: 12 }}>
                ›
              </span>
              <TerminalCursor color="#ffffff" />
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* ── Status Line (mclaude statusline) ── */}
            <div
              style={{
                opacity: statusOpacity,
                flexShrink: 0,
                paddingBottom: 32,
              }}
            >
              {/* Separator */}
              <div
                style={{
                  color: SL.separator,
                  fontSize: 20,
                  letterSpacing: 1,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  marginBottom: 10,
                }}
              >
                {"─".repeat(120)}
              </div>

              {/* Line 1: Model + branch */}
              <div style={{ fontSize: 26, marginBottom: 6 }}>
                <span style={{ color: "#ffffff", fontWeight: 700 }}>GLM-5</span>
                {"  "}
                <span style={{ color: SL.accent, fontWeight: 600 }}>(master)</span>
              </div>

              {/* Line 2: Tokens */}
              <div style={{ fontSize: 24, color: SL.label, marginBottom: 5 }}>
                <span>Input:<span style={{ color: SL.value }}>0</span></span>
                <span style={{ color: SL.separator, margin: "0 14px" }}>│</span>
                <span>Output:<span style={{ color: SL.value }}>0</span></span>
                <span style={{ color: SL.separator, margin: "0 14px" }}>│</span>
                <span>Cache:<span style={{ color: SL.value }}>0</span></span>
              </div>

              {/* Line 3: Session + Cost */}
              <div style={{ fontSize: 24, color: SL.label, marginBottom: 5 }}>
                <span>Sessao:<span style={{ color: SL.value }}>0m 3s</span></span>
                <span style={{ color: SL.separator, margin: "0 12px" }}>│</span>
                <span>API:<span style={{ color: SL.value }}>0m 0s</span></span>
                <span style={{ color: SL.separator, margin: "0 16px" }}>│</span>
                <span>Custo:<span style={{ color: SL.cost }}>$0.00</span></span>
                <span style={{ color: SL.separator, margin: "0 12px" }}>│</span>
                <span><span style={{ color: SL.cost }}>$0.00</span>/min</span>
              </div>

              {/* Line 4: Context bar */}
              <div style={{ fontSize: 24, color: SL.label, marginBottom: 5, display: "flex", alignItems: "center" }}>
                <span style={{ color: SL.separator }}>{"─".repeat(35)}</span>
                <span style={{ color: SL.separator, margin: "0 12px" }}>│</span>
                <span><span style={{ color: SL.value }}>0</span>/0%</span>
                <span style={{ color: SL.separator, margin: "0 16px" }}>│</span>
                <span><span style={{ color: SL.value }}>0</span>/0% rest.</span>
              </div>

              {/* Line 5: Bypass permissions */}
              <div style={{ fontSize: 24, marginTop: 6 }}>
                <span style={{ color: SL.warn, fontWeight: 700 }}>››</span>{" "}
                <span style={{ color: SL.warn, fontWeight: 600 }}>bypass permissions on</span>{" "}
                <span style={{ color: SL.label }}>(shift+tab to cycle)</span>
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
