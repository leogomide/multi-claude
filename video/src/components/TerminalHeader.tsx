import { COLORS } from "../constants";

export const TerminalHeader: React.FC<{
  breadcrumb?: string[];
}> = ({ breadcrumb }) => {
  return (
    <div style={{ marginBottom: 8, flexShrink: 0 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <span style={{ color: COLORS.magenta, fontWeight: 700 }}>
          ✨ multi-claude v1.0.14
        </span>
        <span style={{ color: COLORS.cyan, fontSize: 16 }}>
          claude code v1.0.39
        </span>
      </div>
      {breadcrumb && breadcrumb.length > 0 && (
        <div style={{ marginBottom: 4, fontSize: 16 }}>
          {breadcrumb.map((item, i) => (
            <span key={i}>
              {i > 0 && (
                <span style={{ color: COLORS.gray, margin: "0 6px" }}>›</span>
              )}
              <span style={{ color: COLORS.white }}>{item}</span>
            </span>
          ))}
        </div>
      )}
      <div
        style={{
          color: COLORS.gray,
          fontSize: 14,
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
