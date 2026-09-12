import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { pop } from "../animations";
import { COLORS, TERMINAL } from "../constants";
import { LITERAL } from "../copy";
import { mono } from "../fonts";
import { SceneBackground } from "./SceneBackground";

export const TerminalWindow: React.FC<{
	children: React.ReactNode;
	showTitleBar?: boolean;
	/** Tilt-and-settle entrance. Only the first scene the window appears in. */
	entry?: boolean;
}> = ({ children, showTitleBar = true, entry = false }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const progress = entry ? pop({ frame, fps }) : 1;
	const scale = entry ? interpolate(progress, [0, 1], [0.88, 1]) : 1;
	const tilt = entry ? interpolate(progress, [0, 1], [7, 0]) : 0;

	return (
		<AbsoluteFill
			style={{
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				fontFamily: mono,
				perspective: 2400,
			}}
		>
			<SceneBackground />
			<div
				style={{
					width: TERMINAL.width,
					height: TERMINAL.height,
					backgroundColor: COLORS.terminalBg,
					borderRadius: TERMINAL.borderRadius,
					boxShadow: `0 30px 90px rgba(0, 0, 0, 0.65), 0 0 0 1px ${COLORS.dimGray}, 0 0 90px rgba(139, 233, 253, 0.08)`,
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
					transform: `scale(${scale}) rotateX(${tilt}deg)`,
					position: "relative",
					zIndex: 1,
				}}
			>
				{showTitleBar && (
					<div
						style={{
							height: TERMINAL.titleBarHeight,
							background: `linear-gradient(180deg, #30323f 0%, ${COLORS.titleBar} 100%)`,
							display: "flex",
							alignItems: "center",
							paddingLeft: 20,
							gap: 8,
							flexShrink: 0,
							borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
						}}
					>
						<div
							style={{
								width: 16,
								height: 16,
								borderRadius: "50%",
								backgroundColor: COLORS.red,
							}}
						/>
						<div
							style={{
								width: 16,
								height: 16,
								borderRadius: "50%",
								backgroundColor: COLORS.yellow,
							}}
						/>
						<div
							style={{
								width: 16,
								height: 16,
								borderRadius: "50%",
								backgroundColor: COLORS.green,
							}}
						/>
						<div
							style={{
								flex: 1,
								textAlign: "center",
								color: COLORS.gray,
								fontSize: 18,
								marginRight: 60,
							}}
						>
							{LITERAL.command}
						</div>
					</div>
				)}
				<div
					style={{
						flex: 1,
						padding: TERMINAL.padding,
						display: "flex",
						flexDirection: "column",
						fontSize: TERMINAL.fontSize,
						lineHeight: `${TERMINAL.lineHeight}px`,
						color: COLORS.white,
						overflow: "hidden",
					}}
				>
					{children}
				</div>
			</div>
		</AbsoluteFill>
	);
};
