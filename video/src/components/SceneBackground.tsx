import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS } from "../constants";

type Blob = {
	color: string;
	size: number;
	/** Base position in percent of the canvas. */
	x: number;
	y: number;
	/** Drift amplitude in percent, and how many frames one full cycle takes. */
	ax: number;
	ay: number;
	period: number;
	phase: number;
	opacity: number;
};

const BLOBS: Blob[] = [
	{ color: COLORS.magenta, size: 1500, x: 20, y: 20, ax: 5, ay: 4, period: 560, phase: 0, opacity: 0.2 },
	{ color: COLORS.cyan, size: 1350, x: 84, y: 40, ax: 4, ay: 5, period: 700, phase: 1.9, opacity: 0.17 },
	{ color: COLORS.deepBlue, size: 1700, x: 50, y: -8, ax: 6, ay: 3, period: 880, phase: 3.4, opacity: 0.3 },
];

/**
 * The backdrop every scene sits on. Because it is driven by the frame inside
 * each Sequence and the blobs move slowly, the background reads as one
 * continuous surface across the cuts instead of restarting each scene.
 */
export const SceneBackground: React.FC = () => {
	const frame = useCurrentFrame();

	return (
		<AbsoluteFill
			style={{ backgroundColor: COLORS.background, overflow: "hidden", zIndex: 0 }}
		>
			{BLOBS.map((b, i) => {
				const t = (frame / b.period) * Math.PI * 2 + b.phase;
				const left = b.x + Math.sin(t) * b.ax;
				const top = b.y + Math.cos(t * 0.8) * b.ay;
				return (
					<div
						key={i}
						style={{
							position: "absolute",
							left: `${left}%`,
							top: `${top}%`,
							width: b.size,
							height: b.size,
							marginLeft: -b.size / 2,
							marginTop: -b.size / 2,
							borderRadius: "50%",
							background: `radial-gradient(circle, ${b.color} 0%, transparent 65%)`,
							opacity: b.opacity,
							filter: "blur(80px)",
						}}
					/>
				);
			})}
			{/* Vignette: pulls the eye back to the centre of the frame. */}
			<AbsoluteFill
				style={{
					background:
						"radial-gradient(ellipse at 50% 38%, transparent 28%, rgba(5, 6, 12, 0.92) 95%)",
				}}
			/>
		</AbsoluteFill>
	);
};
