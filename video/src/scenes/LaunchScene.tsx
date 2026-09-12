import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { enter } from "../animations";
import { SceneBackground } from "../components/SceneBackground";
import { TerminalCursor } from "../components/TerminalCursor";
import { TextOverlay } from "../components/TextOverlay";
import { CLAUDE_CODE_VERSION, COLORS, TERMINAL } from "../constants";
import { LITERAL } from "../copy";
import { useCopy } from "../LocaleContext";
import { mono } from "../fonts";

const HEADER_START = 4;
const PROMPT_START = 26;
const STATUSLINE_START = 40;

// GitHub-dark tones: the statusline needs more contrast than the Dracula
// palette gives at this size.
const SL = {
	label: "#8b949e",
	value: "#e6edf3",
	accent: "#58a6ff",
	cost: "#3fb950",
	separator: "#565e68",
	warn: "#d29922",
};

// Context bar as statusline-script.mjs draws it: '━' filled, '╌' empty.
const BAR_WIDTH = 56;
const CTX_PCT = 1;
const bar = "━".repeat(Math.floor((CTX_PCT * BAR_WIDTH) / 100)).padEnd(BAR_WIDTH, "╌");

export const LaunchScene: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const copy = useCopy();

	const headerOpacity = enter({ frame, fps, delay: HEADER_START });
	const promptOpacity = enter({ frame, fps, delay: PROMPT_START });
	const statusOpacity = enter({ frame, fps, delay: STATUSLINE_START });

	const sep = <span style={{ color: SL.separator, margin: "0 14px" }}>│</span>;

	return (
		<div style={{ width: "100%", height: "100%", position: "absolute" }}>
			<AbsoluteFill
				style={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					fontFamily: mono,
				}}
			>
				<SceneBackground />
				<div
					style={{
						width: TERMINAL.width,
						height: TERMINAL.height,
						backgroundColor: COLORS.terminalBg,
						borderRadius: TERMINAL.borderRadius,
						boxShadow: `0 30px 90px rgba(0, 0, 0, 0.65), 0 0 0 1px ${COLORS.dimGray}, 0 0 90px rgba(139, 233, 253, 0.08)`,
						display: "flex",
						flexDirection: "column",
						overflow: "hidden",
						position: "relative",
						zIndex: 1,
					}}
				>
					{/* Title bar */}
					<div
						style={{
							height: TERMINAL.titleBarHeight,
							background: `linear-gradient(180deg, #30323f 0%, ${COLORS.titleBar} 100%)`,
							display: "flex",
							alignItems: "center",
							paddingLeft: 20,
							gap: 8,
							flexShrink: 0,
							borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
						}}
					>
						<div
							style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: COLORS.red }}
						/>
						<div
							style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: COLORS.yellow }}
						/>
						<div
							style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: COLORS.green }}
						/>
						<div
							style={{
								flex: 1,
								textAlign: "center",
								color: SL.label,
								fontSize: 18,
								marginRight: 60,
							}}
						>
							claude — {LITERAL.cwd}
						</div>
					</div>

					{/* Terminal content */}
					<div
						style={{
							flex: 1,
							padding: 40,
							paddingBottom: 0,
							display: "flex",
							flexDirection: "column",
							color: COLORS.white,
						}}
					>
						{/* ── Claude Code header ── */}
						<div
							style={{
								opacity: headerOpacity,
								display: "flex",
								alignItems: "flex-start",
								gap: 20,
								marginBottom: 28,
							}}
						>
							<Img
								src={staticFile("claude-code-icon.png")}
								style={{ width: 80, height: 80, borderRadius: 10, flexShrink: 0, marginTop: 2 }}
							/>
							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
									<span style={{ fontWeight: 700, fontSize: 38, color: "#ffffff" }}>Claude Code</span>
									<span style={{ color: SL.label, fontSize: 26 }}>v{CLAUDE_CODE_VERSION}</span>
								</div>
								<div style={{ fontSize: 32 }}>
									<span style={{ color: "#ffffff", fontWeight: 700 }}>{LITERAL.model}</span>
									<span style={{ color: SL.label }}>{copy.launch.withEffort}</span>
									<span style={{ color: "#79c0ff", fontWeight: 700 }}>{LITERAL.provider}</span>
								</div>
								<div style={{ color: "#b1bac4", fontSize: 28 }}>{LITERAL.cwd}</div>
							</div>
						</div>

						<div style={{ flex: 1 }} />

						{/* ── Prompt ── */}
						<div style={{ opacity: promptOpacity, flexShrink: 0 }}>
							<div
								style={{
									color: SL.separator,
									fontSize: 20,
									letterSpacing: 1,
									overflow: "hidden",
									whiteSpace: "nowrap",
									marginBottom: 12,
								}}
							>
								{"─".repeat(120)}
							</div>
							<div
								style={{ display: "flex", alignItems: "center", fontSize: 34, marginBottom: 12 }}
							>
								<span style={{ color: "#ffffff", fontWeight: 700, marginRight: 12 }}>›</span>
								<TerminalCursor color="#ffffff" />
							</div>
							<div
								style={{
									color: SL.separator,
									fontSize: 20,
									letterSpacing: 1,
									overflow: "hidden",
									whiteSpace: "nowrap",
									marginBottom: 12,
								}}
							>
								{"─".repeat(120)}
							</div>
						</div>

						{/* ── mclaude statusline (default template) ── */}
						<div style={{ opacity: statusOpacity, flexShrink: 0, paddingBottom: 32 }}>
							<div style={{ fontSize: 28, marginBottom: 6 }}>
								<span style={{ color: "#ffffff", fontWeight: 700 }}>{LITERAL.model}</span>
								{"  "}
								<span style={{ color: "#79c0ff", fontWeight: 700 }}>(master)</span>
							</div>

							<div style={{ fontSize: 24, color: SL.label, marginBottom: 5 }}>
								<span>
									Input:<span style={{ color: SL.value }}>14.2k</span>
								</span>
								{sep}
								<span>
									Output:<span style={{ color: SL.value }}>642</span>
								</span>
								{sep}
								<span>
									Cache:<span style={{ color: SL.value }}>11.9k</span>
								</span>
							</div>

							<div style={{ fontSize: 24, color: SL.label, marginBottom: 5 }}>
								<span>
									{copy.statusline.session}:<span style={{ color: SL.value }}>0m 18s</span>
								</span>
								{sep}
								<span>
									{copy.statusline.api}:<span style={{ color: SL.value }}>0m 5s</span>
								</span>
								{sep}
								<span>
									{copy.statusline.cost}:<span style={{ color: SL.cost }}>$0.00</span>
								</span>
								{sep}
								<span>
									<span style={{ color: SL.cost }}>$0.00</span>/min
								</span>
							</div>

							{/* Context bar — 1M window, barely touched */}
							<div
								style={{
									fontSize: 24,
									color: SL.label,
									marginBottom: 5,
									display: "flex",
									alignItems: "center",
								}}
							>
								<span
									style={{
										color: SL.value,
										letterSpacing: -1,
										flex: 1,
										minWidth: 0,
										overflow: "hidden",
										whiteSpace: "nowrap",
									}}
								>
									{bar}
								</span>
								{sep}
								<span style={{ flexShrink: 0 }}>
									<span style={{ color: SL.value }}>14.2k</span>/{CTX_PCT}%
								</span>
								{sep}
								<span style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
									<span style={{ color: SL.value }}>1.0M</span>/99% {copy.statusline.left}
								</span>
							</div>

							<div style={{ fontSize: 24, marginTop: 6 }}>
								<span style={{ color: SL.warn, fontWeight: 700 }}>››</span>{" "}
								<span style={{ color: SL.warn, fontWeight: 600 }}>bypass permissions on</span>{" "}
								<span style={{ color: SL.label }}>(shift+tab to cycle)</span>
							</div>
						</div>
					</div>
				</div>
			</AbsoluteFill>

			<TextOverlay text={copy.launch.caption} startFrame={PROMPT_START + 2} durationFrames={40} />
		</div>
	);
};
