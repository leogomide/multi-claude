import { COLORS, ROW_GAP, ROW_HEIGHT } from "../constants";
import { emoji } from "../fonts";
import { HighlightBar } from "./HighlightBar";

type MenuItem = { icon: string; label: string };
type MenuGroup = { label: string; items: MenuItem[] };

const HEADER_HEIGHT = 34;
const GROUP_GAP = 18;

/**
 * Rows sit on an explicit pixel grid rather than in a flex flow, so the
 * HighlightBar can be placed from a flat row index and animate between rows.
 */
const layout = (groups: MenuGroup[]) => {
	const headers: Array<{ label: string; top: number }> = [];
	const items: Array<{ icon: string; label: string; top: number; index: number }> = [];
	let y = 0;
	let index = 0;

	groups.forEach((group, gi) => {
		if (gi > 0) y += GROUP_GAP;
		headers.push({ label: group.label, top: y });
		y += HEADER_HEIGHT + ROW_GAP;
		for (const item of group.items) {
			items.push({ ...item, top: y, index });
			index++;
			y += ROW_HEIGHT + ROW_GAP;
		}
	});

	return { headers, items, height: y };
};

export const GroupedMenu: React.FC<{
	groups: MenuGroup[];
	activeIndex: number;
	previousIndex?: number;
	moveFrame?: number;
	appearFrame?: number;
}> = ({ groups, activeIndex, previousIndex, moveFrame, appearFrame }) => {
	const { headers, items, height } = layout(groups);
	const activeTop = items.find((i) => i.index === activeIndex)?.top ?? 0;
	const previousTop =
		previousIndex === undefined ? undefined : items.find((i) => i.index === previousIndex)?.top;

	return (
		<div style={{ position: "relative", height }}>
			<HighlightBar
				top={activeTop}
				fromTop={previousTop}
				moveFrame={moveFrame}
				appearFrame={appearFrame}
			/>
			{headers.map((header) => (
				<div
					key={header.label}
					style={{
						position: "absolute",
						top: header.top,
						left: 0,
						height: HEADER_HEIGHT,
						display: "flex",
						alignItems: "center",
						color: COLORS.gray,
						fontWeight: 700,
						fontSize: 22,
						letterSpacing: 1,
					}}
				>
					── {header.label} ──
				</div>
			))}
			{items.map((item) => {
				const isActive = item.index === activeIndex;
				return (
					<div
						key={item.label}
						style={{
							position: "absolute",
							top: item.top,
							left: 0,
							right: 0,
							height: ROW_HEIGHT,
							color: isActive ? COLORS.cyan : COLORS.white,
							fontWeight: isActive ? 700 : 400,
							fontSize: 26,
							display: "flex",
							alignItems: "center",
						}}
					>
						<span style={{ width: 36, color: COLORS.cyan, flexShrink: 0 }}>
							{isActive ? "❯" : " "}
						</span>
						<span style={{ marginRight: 12, fontFamily: emoji }}>{item.icon}</span>
						<span>{item.label}</span>
					</div>
				);
			})}
		</div>
	);
};
