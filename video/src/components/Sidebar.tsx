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
		<div style={{ display: "flex", flexDirection: "row", height: "100%" }}>
			<div
				style={{
					width: 1,
					background: `linear-gradient(180deg, transparent 0%, ${COLORS.gray} 12%, ${COLORS.gray} 88%, transparent 100%)`,
					marginRight: 24,
					flexShrink: 0,
					opacity: 0.5,
				}}
			/>
			<div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
				<div
					style={{
						color: COLORS.cyan,
						fontWeight: 700,
						fontSize: 24,
						marginBottom: 6,
						letterSpacing: 0.5,
					}}
				>
					{title}
				</div>
				{entries.map((entry) => (
					<div key={entry.label} style={{ fontSize: 21, lineHeight: "30px" }}>
						<span style={{ color: COLORS.gray }}>{entry.label}: </span>
						<span style={{ color: entry.color || COLORS.white, wordBreak: "break-word" }}>
							{entry.value}
						</span>
					</div>
				))}
			</div>
		</div>
	);
};
