import { COLORS } from "../constants";

type SidebarEntry = {
  label: string;
  value: string;
  color?: string;
};

export const Sidebar: React.FC<{
  title: string;
  entries: SidebarEntry[];
}> = ({ title, entries }) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        height: "100%",
      }}
    >
      <div
        style={{
          width: 1,
          backgroundColor: COLORS.gray,
          marginRight: 24,
          flexShrink: 0,
          opacity: 0.4,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            color: COLORS.cyan,
            fontWeight: 700,
            fontSize: 24,
            marginBottom: 10,
          }}
        >
          {title}
        </div>
        {entries.map((entry, i) => (
          <div key={i} style={{ fontSize: 21 }}>
            <span style={{ color: COLORS.gray }}>{entry.label}: </span>
            <span style={{ color: entry.color || COLORS.white }}>
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
