import { interpolate, useCurrentFrame } from "remotion";
import { typed, typedEnd } from "../animations";
import { Flash } from "../components/Flash";
import { TerminalCursor } from "../components/TerminalCursor";
import { TerminalWindow } from "../components/TerminalWindow";
import { TextOverlay } from "../components/TextOverlay";
import { COLORS } from "../constants";
import { LITERAL } from "../copy";
import { useCopy } from "../LocaleContext";

const CHAR_FRAMES = 2;
const TYPE_START = 8;
const ENTER_FRAME = typedEnd(LITERAL.command, TYPE_START, CHAR_FRAMES) + 6; // 28
const BOOT_FRAME = ENTER_FRAME + 6;

export const TerminalOpenScene: React.FC = () => {
	const frame = useCurrentFrame();
	const copy = useCopy();

	const typedText = typed(LITERAL.command, frame, TYPE_START, CHAR_FRAMES);
	const showEnter = frame >= ENTER_FRAME;
	const showBoot = frame >= BOOT_FRAME;

	const loadingDots = showEnter ? ".".repeat((Math.floor((frame - ENTER_FRAME) / 4) % 3) + 1) : "";

	const line = (delay: number) =>
		interpolate(frame - BOOT_FRAME - delay, [0, 8], [0, 1], {
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		});

	return (
		<div style={{ width: "100%", height: "100%", position: "absolute" }}>
			<TerminalWindow entry>
				<div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
					<div style={{ display: "flex", alignItems: "center" }}>
						<span style={{ color: COLORS.green, fontWeight: 700 }}>~/projects</span>
						<span style={{ color: COLORS.white, margin: "0 8px" }}>$</span>
						<span style={{ color: COLORS.white }}>{typedText}</span>
						{!showEnter && frame >= TYPE_START && <TerminalCursor />}
					</div>

					{showEnter && (
						<div style={{ marginTop: 16 }}>
							{!showBoot ? (
								<span style={{ color: COLORS.gray }}>
									{copy.terminalOpen.loading}
									{loadingDots}
								</span>
							) : (
								<>
									<div style={{ color: COLORS.cyan, marginBottom: 8, opacity: line(0) }}>
										{copy.terminalOpen.starting}
									</div>
									<div style={{ color: COLORS.green, opacity: line(4) }}>
										✔ {copy.terminalOpen.configLoaded}
									</div>
									<div style={{ color: COLORS.green, opacity: line(12) }}>
										✔ {copy.terminalOpen.providersConfigured}
									</div>
								</>
							)}
						</div>
					)}
				</div>
			</TerminalWindow>

			<Flash startFrame={ENTER_FRAME} rgb="255, 255, 255" peak={0.28} />

			<TextOverlay text={copy.terminalOpen.caption} startFrame={3} durationFrames={40} />
		</div>
	);
};
