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
import { Sidebar } from "../components/Sidebar";
import { TextOverlay } from "../components/TextOverlay";
import { TerminalCursor } from "../components/TerminalCursor";

const ALL_MODELS = [
  "GLM-5",
  "GLM-5-Code",
  "GLM-4.7",
  "GLM-4.7-FlashX",
  "GLM-4.7-Flash",
  "GLM-4.6",
  "GLM-4.5",
  "GLM-4.5-Air",
  "GLM-4.5-AirX",
  "GLM-4.5-Flash",
  "GLM-4.5-X",
  "GLM-4-32B-0414-128K",
];

const SEARCH_TEXT = "GLM-5";
const TYPE_START = 20;
const CHAR_FRAMES = 3;

export const ModelSelectScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  // Typewriter for search
  const typedChars = Math.min(
    SEARCH_TEXT.length,
    Math.max(0, Math.floor((frame - TYPE_START) / CHAR_FRAMES))
  );
  const typedSearch = SEARCH_TEXT.slice(0, typedChars);

  // Filter models
  const filteredModels =
    typedSearch.length > 0
      ? ALL_MODELS.filter((m) =>
          m.toLowerCase().includes(typedSearch.toLowerCase())
        )
      : ALL_MODELS;

  // Cursor on first filtered result after typing done
  const doneTyping = typedChars >= SEARCH_TEXT.length;
  const selectFrame = 90;
  const activeIndex = 0;

  // Select flash
  const selectFlash =
    frame >= selectFrame
      ? interpolate(frame - selectFrame, [0, 5, 10], [0, 0.2, 0], {
          extrapolateRight: "clamp",
        })
      : 0;

  const selectedModel = filteredModels[0] || ALL_MODELS[0];

  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", opacity: fadeIn }}>
      <TerminalWindow>
        <TerminalHeader breadcrumb={["Z.AI"]} />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "row",
            gap: 24,
            overflow: "hidden",
          }}
        >
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {/* Title */}
            <div
              style={{
                color: COLORS.cyan,
                fontWeight: 700,
                fontSize: 28,
                marginBottom: 16,
              }}
            >
              Select a model
            </div>

            {/* Search bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 20,
                fontSize: 24,
              }}
            >
              <span style={{ color: COLORS.green, marginRight: 8 }}>{">"}</span>
              <span style={{ color: COLORS.white }}>{typedSearch}</span>
              {frame >= TYPE_START && <TerminalCursor color={COLORS.green} />}
              <span
                style={{
                  marginLeft: "auto",
                  color: COLORS.gray,
                  fontSize: 20,
                }}
              >
                ({filteredModels.length}/{ALL_MODELS.length})
              </span>
            </div>

            {/* Model list */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              {filteredModels.map((model, i) => {
                const isActive = i === activeIndex && doneTyping;
                // Staggered appearance
                const itemDelay = i * 3;
                const itemOpacity = interpolate(
                  frame - TYPE_START - typedChars * CHAR_FRAMES - itemDelay,
                  [0, 8],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                );

                return (
                  <div
                    key={model}
                    style={{
                      color: isActive ? COLORS.cyan : COLORS.white,
                      fontWeight: isActive ? 700 : 400,
                      fontSize: 26,
                      display: "flex",
                      alignItems: "center",
                      height: 40,
                      opacity: typedSearch.length > 0 ? itemOpacity : 1,
                    }}
                  >
                    <span
                      style={{
                        width: 36,
                        color: COLORS.cyan,
                        flexShrink: 0,
                      }}
                    >
                      {isActive ? "❯" : " "}
                    </span>
                    <span>{model}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ width: 380 }}>
            <Sidebar
              title="Model Info"
              entries={[
                { label: "Name", value: "GLM-5" },
                { label: "Context", value: "128K tokens", color: COLORS.cyan },
                { label: "Max Output", value: "16K tokens" },
                {
                  label: "Input",
                  value: "$0.50 / 1M tokens",
                  color: COLORS.green,
                },
                {
                  label: "Output",
                  value: "$2.00 / 1M tokens",
                  color: COLORS.yellow,
                },
                { label: "Tools", value: "Yes", color: COLORS.green },
                { label: "Vision", value: "Yes", color: COLORS.green },
              ]}
            />
          </div>
        </div>
        <TerminalFooter
          shortcuts={[
            { key: "↑↓", label: "navigate" },
            { key: "⏎", label: "select" },
            { key: "esc", label: "back" },
            { key: "/", label: "search" },
          ]}
        />
      </TerminalWindow>

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
        text="Browse and search models from any provider"
        startFrame={10}
        durationFrames={120}
      />
    </div>
  );
};
