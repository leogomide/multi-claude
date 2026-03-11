import {
  spring,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { COLORS } from "../constants";
import { TerminalWindow } from "../components/TerminalWindow";
import { TerminalHeader } from "../components/TerminalHeader";
import { TerminalFooter } from "../components/TerminalFooter";
import { GroupedMenu } from "../components/GroupedMenu";
import { Sidebar } from "../components/Sidebar";
import { TextOverlay } from "../components/TextOverlay";

const MENU_GROUPS = [
  {
    label: "Start Claude Code",
    items: [
      { icon: "🏠", label: "Claude Code (default)" },
      { icon: "🚀", label: "Z.AI" },
      { icon: "🚀", label: "OpenRouter" },
      { icon: "🚀", label: "DeepSeek" },
    ],
  },
  {
    label: "Options",
    items: [
      { icon: "🔧", label: "Manage providers" },
      { icon: "📁", label: "Manage installations" },
      { icon: "⚙️", label: "Settings" },
      { icon: "🚪", label: "Exit" },
    ],
  },
];

const SIDEBAR_DEFAULT = {
  title: "Provider Info",
  entries: [
    { label: "Name", value: "Anthropic (Default)" },
    { label: "Auth", value: "OAuth", color: COLORS.green },
    { label: "Status", value: "Authenticated", color: COLORS.green },
  ],
};

const SIDEBAR_ZAI = {
  title: "Provider Info",
  entries: [
    { label: "Name", value: "Z.AI" },
    { label: "Template", value: "Z.AI" },
    { label: "Models", value: "12 models", color: COLORS.cyan },
    { label: "Base URL", value: "api.z.ai/api/anthropic", color: COLORS.gray },
  ],
};

export const MainMenuScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade in
  const fadeIn = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  // Cursor movement: starts at 0, moves to 1 (OpenRouter) at frame 60
  const cursorFrame = 60;
  const activeIndex = frame < cursorFrame ? 0 : 1;

  // Select flash at end
  const selectFrame = 120;
  const selectFlash =
    frame >= selectFrame
      ? interpolate(frame - selectFrame, [0, 5, 10], [0, 0.2, 0], {
          extrapolateRight: "clamp",
        })
      : 0;

  const sidebar = activeIndex === 0 ? SIDEBAR_DEFAULT : SIDEBAR_ZAI;

  // Keystroke indicator
  const showDownKey = frame >= cursorFrame - 5 && frame < cursorFrame + 15;
  const showEnterKey = frame >= selectFrame - 5 && frame < selectFrame + 15;

  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", opacity: fadeIn }}>
      <TerminalWindow>
        <TerminalHeader />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "row",
            gap: 24,
            overflow: "hidden",
          }}
        >
          <div style={{ flex: 1 }}>
            <GroupedMenu groups={MENU_GROUPS} activeIndex={activeIndex} />
          </div>
          <div style={{ width: 280 }}>
            <Sidebar title={sidebar.title} entries={sidebar.entries} />
          </div>
        </div>
        <TerminalFooter
          shortcuts={[
            { key: "↑↓", label: "navigate" },
            { key: "⏎", label: "select" },
            { key: "esc", label: "quit" },
          ]}
        />
      </TerminalWindow>

      {/* Keystroke indicators */}
      {showDownKey && (
        <KeyIndicator label="↓" frame={frame} startFrame={cursorFrame - 5} />
      )}
      {showEnterKey && (
        <KeyIndicator label="⏎" frame={frame} startFrame={selectFrame - 5} />
      )}

      {selectFlash > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: `rgba(139, 233, 253, ${selectFlash})`,
            pointerEvents: "none",
          }}
        />
      )}

      <TextOverlay
        text="Select your preferred AI provider"
        startFrame={10}
        durationFrames={120}
      />
    </div>
  );
};

const KeyIndicator: React.FC<{
  label: string;
  frame: number;
  startFrame: number;
}> = ({ label, frame, startFrame }) => {
  const progress = interpolate(frame - startFrame, [0, 5, 15, 20], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 110,
        right: 80,
        opacity: progress,
        transform: `scale(${0.8 + progress * 0.2})`,
      }}
    >
      <div
        style={{
          backgroundColor: COLORS.titleBar,
          border: `2px solid ${COLORS.gray}`,
          borderRadius: 8,
          padding: "8px 16px",
          fontSize: 28,
          color: COLORS.white,
          fontWeight: 700,
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        }}
      >
        {label}
      </div>
    </div>
  );
};
