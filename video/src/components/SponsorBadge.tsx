import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { enter } from "../animations";
import { COLORS } from "../constants";
import { LITERAL } from "../copy";
import { useCopy } from "../LocaleContext";
import { sans } from "../fonts";

/**
 * Sponsor credit for the final frames. It arrives after the install command has
 * been read and settles below full opacity so it reads as a credit line rather
 * than a second call to action.
 */
export const SponsorBadge: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const copy = useCopy();

	const progress = enter({ frame, fps, delay });
	const opacity = progress * 0.78;

	if (opacity <= 0.001) return null;

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				gap: 12,
				opacity,
				transform: `translateY(${interpolate(progress, [0, 1], [14, 0])}px)`,
			}}
		>
			<div
				style={{
					fontFamily: sans,
					fontSize: 22,
					fontWeight: 600,
					letterSpacing: 5,
					color: COLORS.gray,
				}}
			>
				{copy.outro.sponsoredBy}
			</div>
			<div style={{ display: "flex", alignItems: "center", gap: 22 }}>
				<Img src={staticFile("flatt.png")} style={{ height: 72, width: "auto" }} />
				<span
					style={{
						fontFamily: sans,
						fontSize: 46,
						fontWeight: 600,
						color: COLORS.white,
						letterSpacing: 0.5,
					}}
				>
					{LITERAL.sponsorName}
				</span>
			</div>
		</div>
	);
};
