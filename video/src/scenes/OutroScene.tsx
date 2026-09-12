import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { enter, typed, typedEnd } from "../animations";
import { Logo } from "../components/Logo";
import { SceneBackground } from "../components/SceneBackground";
import { SponsorBadge } from "../components/SponsorBadge";
import { COLORS } from "../constants";
import { LITERAL } from "../copy";
import { useCopy } from "../LocaleContext";
import { mono, sans } from "../fonts";

const TYPE_START = 18;
const CHAR_FRAMES = 1;
const TYPE_END = typedEnd(LITERAL.installCmd, TYPE_START, CHAR_FRAMES); // 49
const REQUIRES_FRAME = 54;
const RUN_FRAME = 60;
const SPONSOR_FRAME = 76;

export const OutroScene: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const copy = useCopy();

	const headingProgress = enter({ frame, fps, delay: 8 });
	const typedInstall = typed(LITERAL.installCmd, frame, TYPE_START, CHAR_FRAMES);
	const stillTyping = frame >= TYPE_START && frame < TYPE_END;

	const requires = enter({ frame, fps, delay: REQUIRES_FRAME });
	const run = enter({ frame, fps, delay: RUN_FRAME });

	const cursorOpacity = interpolate(frame % 16, [0, 8, 16], [1, 0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	return (
		<AbsoluteFill>
			<SceneBackground />
			<AbsoluteFill
				style={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					flexDirection: "column",
					gap: 26,
					zIndex: 1,
				}}
			>
				<Logo variant="hero" size={88} />

				{/* Heading */}
				<div
					style={{
						fontFamily: sans,
						fontSize: 44,
						fontWeight: 700,
						color: COLORS.white,
						opacity: headingProgress,
						transform: `translateY(${interpolate(headingProgress, [0, 1], [12, 0])}px)`,
					}}
				>
					{copy.outro.heading}
				</div>

				{/* Install command */}
				<div
					style={{
						backgroundColor: "rgba(13, 17, 23, 0.85)",
						border: `1px solid ${COLORS.dimGray}`,
						borderRadius: 14,
						padding: "20px 34px",
						fontFamily: mono,
						fontSize: 30,
						boxShadow: "0 14px 40px rgba(0, 0, 0, 0.45)",
					}}
				>
					<span style={{ color: COLORS.gray }}>$ </span>
					<span style={{ color: COLORS.green }}>{typedInstall}</span>
					{stillTyping && (
						<span style={{ opacity: cursorOpacity, color: COLORS.green }}>{"\u258C"}</span>
					)}
				</div>

				{/* Requirement note */}
				<div
					style={{
						opacity: requires * 0.85,
						fontFamily: sans,
						fontSize: 24,
						color: COLORS.gray,
						marginTop: -12,
					}}
				>
					{copy.outro.requires}
				</div>

				{/* Then just run it */}
				<div
					style={{
						opacity: run,
						fontFamily: mono,
						fontSize: 42,
						color: COLORS.cyan,
						fontWeight: 700,
						transform: `translateY(${interpolate(run, [0, 1], [12, 0])}px)`,
					}}
				>
					{LITERAL.runCmd}
				</div>

				{/* Sponsor, quietly, at the bottom */}
				<div style={{ position: "absolute", bottom: 54 }}>
					<SponsorBadge delay={SPONSOR_FRAME} />
				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
