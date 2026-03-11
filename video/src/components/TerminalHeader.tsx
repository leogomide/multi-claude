import { COLORS } from "../constants";

export const TerminalHeader: React.FC<{
  breadcrumb?: string[];
}> = ({ breadcrumb }) => {
  return (
    <div style={{ marginBottom: 12, flexShrink: 0 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <span style={{ color: COLORS.magenta, fontWeight: 700, fontSize: 28 }}>
          ✨ multi-claude v1.0.14
        </span>
        <span style={{ color: COLORS.cyan, fontSize: 22 }}>
          claude code v1.0.39
        </span>
      </div>
      {breadcrumb && breadcrumb.length > 0 && (
        <div style={{ marginBottom: 6, fontSize: 22 }}>
          {breadcrumb.map((item, i) => (
            <span key={i}>
              {i > 0 && (
                <span style={{ color: COLORS.gray, margin: "0 8px" }}>›</span>
              )}
              <span style={{ color: COLORS.white }}>{item}</span>
            </span>
          ))}
        </div>
      )}
      <div
        style={{
          color: COLORS.gray,
          fontSize: 18,
          letterSpacing: 2,
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}
      >
        {"─".repeat(120)}
      </div>
    </div>
  );
};
