import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { enter, typed, typedEnd } from "../animations";
import { Logo } from "../components/Logo";
import { SceneBackground } from "../components/SceneBackground";
import { COLORS } from "../constants";
import { useCopy } from "../LocaleContext";
import { mono, sans } from "../fonts";

const TAGLINE_START = 26;
const TAGLINE_CHAR_FRAMES = 1;

export const IntroScene: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const copy = useCopy();

	const tagline = copy.intro.tagline;
	const typedTagline = typed(tagline, frame, TAGLINE_START, TAGLINE_CHAR_FRAMES);
	const stillTyping =
		frame >= TAGLINE_START && frame < typedEnd(tagline, TAGLINE_START, TAGLINE_CHAR_FRAMES);

	const footnote = enter({ frame, fps, delay: 54 });

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
					gap: 34,
					zIndex: 1,
				}}
			>
				<Logo variant="hero" size={132} />

				{/* Tagline typewriter */}
				<div
					style={{
						fontFamily: mono,
						fontSize: 46,
						color: COLORS.cyan,
						fontWeight: 700,
						height: 56,
						display: "flex",
						alignItems: "center",
					}}
				>
					{typedTagline}
					{stillTyping && <span style={{ opacity: cursorOpacity }}>{"\u258C"}</span>}
				</div>

				{/* Footnote */}
				<div
					style={{
						opacity: footnote,
						transform: `translateY(${interpolate(footnote, [0, 1], [12, 0])}px)`,
						fontFamily: sans,
						fontSize: 28,
						color: COLORS.gray,
						letterSpacing: 1,
					}}
				>
					{copy.intro.footnote}
				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
