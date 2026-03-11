import { COLORS } from "../constants";

type CheckItem = {
  label: string;
  checked: boolean;
};

type CheckGroup = {
  label: string;
  items: CheckItem[];
};

export const ChecklistMenu: React.FC<{
  groups: CheckGroup[];
  activeIndex: number;
}> = ({ groups, activeIndex }) => {
  let flatIndex = 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {groups.map((group, gi) => {
        const groupItems = group.items.map((item) => {
          const idx = flatIndex++;
          const isActive = idx === activeIndex;
          return (
            <div
              key={`item-${idx}`}
              style={{
                color: isActive ? COLORS.cyan : COLORS.white,
                fontWeight: isActive ? 700 : 400,
                fontSize: 18,
                display: "flex",
                alignItems: "center",
                height: 28,
              }}
            >
              <span
                style={{
                  width: 28,
                  color: COLORS.cyan,
                  flexShrink: 0,
                }}
              >
                {isActive ? "❯" : " "}
              </span>
              <span
                style={{
                  color: item.checked ? COLORS.green : COLORS.gray,
                  marginRight: 10,
                }}
              >
                {item.checked ? "[x]" : "[ ]"}
              </span>
              <span>{item.label}</span>
            </div>
          );
        });

        return (
          <div key={`g-${gi}`}>
            <div
              style={{
                color: COLORS.gray,
                fontWeight: 700,
                fontSize: 16,
                marginTop: gi > 0 ? 12 : 0,
                marginBottom: 4,
              }}
            >
              ── {group.label} ──
            </div>
            {groupItems}
          </div>
        );
      })}
    </div>
  );
};
