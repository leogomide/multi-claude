import { COLORS } from "../constants";

type Shortcut = { key: string; label: string };

export const TerminalFooter: React.FC<{
  shortcuts: Shortcut[];
}> = ({ shortcuts }) => {
  return (
    <div style={{ flexShrink: 0, marginTop: "auto" }}>
      <div
        style={{
          color: COLORS.gray,
          fontSize: 14,
          letterSpacing: 2,
          overflow: "hidden",
          whiteSpace: "nowrap",
          marginBottom: 6,
        }}
      >
        {"─".repeat(120)}
      </div>
      <div style={{ display: "flex", gap: 24, fontSize: 16 }}>
        {shortcuts.map((s, i) => (
          <span key={i}>
            <span style={{ color: COLORS.cyan }}>{s.key}</span>{" "}
            <span style={{ color: COLORS.white }}>{s.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
};
