import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ChecklistMenu } from "../components/ChecklistMenu";
import { Sidebar } from "../components/Sidebar";
import { TerminalFooter } from "../components/TerminalFooter";
import { TerminalHeader } from "../components/TerminalHeader";
import { TerminalWindow } from "../components/TerminalWindow";
import { TextOverlay } from "../components/TextOverlay";
import { COLORS } from "../constants";

// Timing
const TOGGLE_SKIP = 40;
const ENTER_LAUNCH = 90;

export const FlagsScene: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const fadeIn = spring({
		frame,
		fps,
		config: { damping: 200 },
	});

	// Cursor stays on index 0 (--dangerously-skip-permissions)
	const activeIndex = 0;

	// Skip permissions checked after toggle
	const skipChecked = frame >= TOGGLE_SKIP;

	const groups = [
		{
			label: "Permissions",
			items: [{ label: "--dangerously-skip-permissions", checked: skipChecked }],
		},
		{
			label: "Development",
			items: [{ label: "--worktree", checked: false }],
		},
		{
			label: "Experimental",
			items: [{ label: "Agent Teams [experimental]", checked: false }],
		},
	];

	// Sidebar info
	const sidebarEntries = [
		{ label: "Flag", value: "--dangerously-skip-permissions" },
		{
			label: "Description",
			value: "Skip all permission prompts",
			color: COLORS.yellow,
		},
	];

	// Key indicators
	const showSpaceKey = frame >= TOGGLE_SKIP - 5 && frame < TOGGLE_SKIP + 15;
	const showEnterKey = frame >= ENTER_LAUNCH - 5 && frame < ENTER_LAUNCH + 15;

	// Select flash
	const selectFlash =
		frame >= ENTER_LAUNCH
			? interpolate(frame - ENTER_LAUNCH, [0, 5, 10], [0, 0.2, 0], {
					extrapolateRight: "clamp",
				})
			: 0;

	return (
		<div style={{ width: "100%", height: "100%", position: "absolute", opacity: fadeIn }}>
			<TerminalWindow>
				<TerminalHeader breadcrumb={["Z.AI", "GLM-5"]} />
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
						<div
							style={{
								color: COLORS.cyan,
								fontWeight: 700,
								fontSize: 28,
								marginBottom: 16,
							}}
						>
							Launch options
						</div>
						<ChecklistMenu groups={groups} activeIndex={activeIndex} />
					</div>
					<div style={{ width: 380 }}>
						<Sidebar title="Flag Info" entries={sidebarEntries} />
					</div>
				</div>
				<TerminalFooter
					shortcuts={[
						{ key: "↑↓", label: "navigate" },
						{ key: "space", label: "toggle" },
						{ key: "⏎", label: "launch" },
						{ key: "esc", label: "back" },
					]}
				/>
			</TerminalWindow>

			{/* Keystroke indicators */}
			{showSpaceKey && <KeyBadge label="Space" frame={frame} startFrame={TOGGLE_SKIP - 5} />}
			{showEnterKey && <KeyBadge label="⏎" frame={frame} startFrame={ENTER_LAUNCH - 5} />}

			{selectFlash > 0 && (
				<div
					style={{
						position: "absolute",
						inset: 0,
						backgroundColor: `rgba(80, 250, 123, ${selectFlash})`,
						pointerEvents: "none",
					}}
				/>
			)}

			<TextOverlay text="Configure launch options" startFrame={10} durationFrames={100} />
		</div>
	);
};

const KeyBadge: React.FC<{
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
					fontSize: 24,
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
