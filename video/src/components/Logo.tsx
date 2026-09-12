import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { pop } from "../animations";
import { COLORS, MCLAUDE_VERSION } from "../constants";
import { LITERAL } from "../copy";
import { emoji, mono } from "../fonts";

/**
 * The single source for the `🐙 multi-claude` lockup. The octopus matches the
 * TUI header (src/components/layout/Header.tsx), which has used U+1F419 since
 * v1.0.17.
 */
export const Logo: React.FC<{
	variant?: "hero" | "inline";
	size?: number;
	delay?: number;
	showVersion?: boolean;
}> = ({ variant = "inline", size = 28, delay = 0, showVersion = false }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const isHero = variant === "hero";

	const progress = pop({ frame, fps, delay });
	// Gentle continuous bob so the hero mark never sits perfectly still.
	const bob = isHero ? Math.sin((frame / 44) * Math.PI * 2) * 6 : 0;

	const wordmark = showVersion
		? `${LITERAL.brand} v${MCLAUDE_VERSION}`
		: LITERAL.brand;

	if (!isHero) {
		return (
			<span style={{ color: COLORS.magenta, fontWeight: 700, fontSize: size }}>
				<span style={{ fontFamily: emoji }}>{LITERAL.octopus}</span> {wordmark}
			</span>
		);
	}

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				gap: 10,
					// Starts part-way in rather than from nothing: frame 0 is the video's
			// poster frame, and a blank one is a bad thumbnail.
			opacity: interpolate(progress, [0, 0.3], [0.55, 1], { extrapolateRight: "clamp" }),
			}}
		>
			{/* Octopus + its glow */}
			<div
				style={{
					position: "relative",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					transform: `scale(${interpolate(progress, [0, 1], [0.55, 1])}) translateY(${bob}px)`,
				}}
			>
				<div
					style={{
						position: "absolute",
						width: size * 2.6,
						height: size * 2.6,
						borderRadius: "50%",
						background: `radial-gradient(circle, ${COLORS.magenta} 0%, transparent 62%)`,
						opacity: 0.34,
						filter: "blur(38px)",
					}}
				/>
				<span style={{ fontFamily: emoji, fontSize: size, lineHeight: 1, position: "relative" }}>
					{LITERAL.octopus}
				</span>
			</div>

			{/* Wordmark, magenta -> cyan */}
			<div
				style={{
					fontFamily: mono,
					fontSize: size * 0.72,
					fontWeight: 700,
					letterSpacing: -1,
					background: `linear-gradient(100deg, ${COLORS.magenta} 0%, #c79bf5 45%, ${COLORS.cyan} 100%)`,
					WebkitBackgroundClip: "text",
					backgroundClip: "text",
					color: "transparent",
					transform: `translateY(${interpolate(progress, [0, 1], [14, 0])}px)`,
				}}
			>
				{wordmark}
			</div>
		</div>
	);
};
