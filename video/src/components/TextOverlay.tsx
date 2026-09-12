import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { enter } from "../animations";
import { COLORS } from "../constants";
import { sans } from "../fonts";

export const TextOverlay: React.FC<{
	text: string;
	startFrame?: number;
	durationFrames?: number;
}> = ({ text, startFrame = 10, durationFrames = 60 }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const fadeIn = enter({ frame, fps, delay: startFrame });
	const fadeOut = enter({ frame, fps, delay: startFrame + durationFrames });
	const opacity = fadeIn - fadeOut;

	if (opacity <= 0.001) return null;

	const translateY = interpolate(fadeIn, [0, 1], [24, 0]);

	return (
		<div
			style={{
				position: "absolute",
				bottom: 30,
				left: 0,
				right: 0,
				display: "flex",
				justifyContent: "center",
				opacity,
				transform: `translateY(${translateY}px)`,
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 18,
					backgroundColor: "rgba(13, 17, 23, 0.72)",
					backdropFilter: "blur(14px)",
					border: `1px solid ${COLORS.dimGray}`,
					padding: "14px 34px 14px 26px",
					borderRadius: 999,
					boxShadow: "0 10px 34px rgba(0, 0, 0, 0.45)",
				}}
			>
				<div
					style={{
						width: 4,
						height: 26,
						borderRadius: 2,
						backgroundColor: COLORS.cyan,
						flexShrink: 0,
					}}
				/>
				<span
					style={{
						fontFamily: sans,
						fontSize: 30,
						color: COLORS.white,
						fontWeight: 600,
						whiteSpace: "nowrap",
					}}
				>
					{text}
				</span>
			</div>
		</div>
	);
};
