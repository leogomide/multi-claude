import { interpolate, useCurrentFrame } from "remotion";

/** Short full-frame colour pulse used to punctuate a selection. */
export const Flash: React.FC<{ startFrame: number; rgb: string; peak?: number }> = ({
	startFrame,
	rgb,
	peak = 0.2,
}) => {
	const frame = useCurrentFrame();
	const alpha = interpolate(frame - startFrame, [0, 4, 10], [0, peak, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	if (alpha <= 0.001) return null;

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				backgroundColor: `rgba(${rgb}, ${alpha})`,
				pointerEvents: "none",
			}}
		/>
	);
};
