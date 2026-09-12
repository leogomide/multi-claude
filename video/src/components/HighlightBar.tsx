import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { settle } from "../animations";
import { COLORS, ROW_HEIGHT } from "../constants";

/**
 * The sliding selection bar. Rows are laid out on a fixed grid, so the bar only
 * needs the pixel offset of the active row and the offset it came from; the
 * spring does the rest. Without it a selection change is invisible in motion —
 * only the text colour changes.
 */
export const HighlightBar: React.FC<{
	/** Pixel offset of the active row from the top of the list container. */
	top: number;
	/** Offset it is travelling from, and the frame the move starts on. */
	fromTop?: number;
	moveFrame?: number;
	/** Frame the bar itself fades in on. */
	appearFrame?: number;
	height?: number;
}> = ({ top, fromTop, moveFrame, appearFrame = 0, height = ROW_HEIGHT }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const moveProgress =
		fromTop === undefined || moveFrame === undefined
			? 1
			: settle({ frame, fps, delay: moveFrame });
	const y = interpolate(moveProgress, [0, 1], [fromTop ?? top, top]);

	const opacity = interpolate(frame - appearFrame, [0, 8], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	return (
		<div
			style={{
				position: "absolute",
				left: -12,
				right: 0,
				top: y,
				height,
				opacity,
				borderRadius: 8,
				background: `linear-gradient(90deg, rgba(139, 233, 253, 0.16) 0%, rgba(139, 233, 253, 0.04) 70%, transparent 100%)`,
				borderLeft: `3px solid ${COLORS.cyan}`,
				pointerEvents: "none",
			}}
		/>
	);
};
