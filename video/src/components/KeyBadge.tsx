import { interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../constants";

/**
 * The keycap that flashes in the corner when the demo presses something.
 * Was duplicated in MainMenuScene and FlagsScene; one copy now.
 */
export const KeyBadge: React.FC<{ label: string; startFrame: number }> = ({
	label,
	startFrame,
}) => {
	const frame = useCurrentFrame();
	const progress = interpolate(frame - startFrame, [0, 4, 14, 20], [0, 1, 1, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	if (progress <= 0.001) return null;

	return (
		<div
			style={{
				position: "absolute",
				bottom: 190,
				right: 120,
				opacity: progress,
				transform: `scale(${0.82 + progress * 0.18})`,
			}}
		>
			<div
				style={{
					background: `linear-gradient(180deg, #3a3d4d 0%, ${COLORS.titleBar} 100%)`,
					border: `2px solid ${COLORS.gray}`,
					borderRadius: 10,
					padding: "10px 20px",
					fontSize: 26,
					color: COLORS.white,
					fontWeight: 700,
					boxShadow: "0 6px 18px rgba(0, 0, 0, 0.5)",
				}}
			>
				{label}
			</div>
		</div>
	);
};
