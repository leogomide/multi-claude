import { COLORS } from "../constants";

type MenuItem = {
	icon: string;
	label: string;
};

type MenuGroup = {
	label: string;
	items: MenuItem[];
};

export const GroupedMenu: React.FC<{
	groups: MenuGroup[];
	activeIndex: number;
	visibleCount?: number;
}> = ({ groups, activeIndex, visibleCount }) => {
	const rows: Array<
		| { type: "header"; label: string }
		| { type: "item"; icon: string; label: string; flatIndex: number }
	> = [];

	let flatIndex = 0;
	for (const group of groups) {
		rows.push({ type: "header", label: group.label });
		for (const item of group.items) {
			rows.push({ type: "item", ...item, flatIndex });
			flatIndex++;
		}
	}

	const displayRows = visibleCount ? rows.slice(0, visibleCount) : rows;

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
			{displayRows.map((row, i) => {
				if (row.type === "header") {
					return (
						<div
							key={`h-${i}`}
							style={{
								color: COLORS.gray,
								fontWeight: 700,
								fontSize: 22,
								marginTop: i > 0 ? 18 : 0,
								marginBottom: 6,
							}}
						>
							── {row.label} ──
						</div>
					);
				}
				const isActive = row.flatIndex === activeIndex;
				return (
					<div
						key={`i-${i}`}
						style={{
							color: isActive ? COLORS.cyan : COLORS.white,
							fontWeight: isActive ? 700 : 400,
							fontSize: 26,
							display: "flex",
							alignItems: "center",
							height: 40,
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
						<span style={{ marginRight: 12 }}>{row.icon}</span>
						<span>{row.label}</span>
					</div>
				);
			})}
		</div>
	);
};
