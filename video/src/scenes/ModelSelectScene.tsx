import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { enter, typed, typedEnd } from "../animations";
import { Flash } from "../components/Flash";
import { HighlightBar } from "../components/HighlightBar";
import { KeyBadge } from "../components/KeyBadge";
import { Sidebar } from "../components/Sidebar";
import { TerminalCursor } from "../components/TerminalCursor";
import { TerminalFooter } from "../components/TerminalFooter";
import { TerminalHeader } from "../components/TerminalHeader";
import { TerminalWindow } from "../components/TerminalWindow";
import { TextOverlay } from "../components/TextOverlay";
import { COLORS, ROW_GAP, ROW_HEIGHT } from "../constants";
import { LITERAL } from "../copy";
import { useCopy } from "../LocaleContext";

// The Z.AI Coding Plan lineup as it exists in src/providers.ts (defaultModels
// plus every key of modelSpecs), which is what the TUI lists after fetching.
const ALL_MODELS = [
	"GLM-5.3",
	"GLM-5.3-Flash",
	"GLM-5.2",
	"GLM-5.1",
	"GLM-5",
	"GLM-5-Turbo",
	"GLM-4.7",
	"GLM-4.6",
	"GLM-4.5",
	"GLM-4.5-Air",
	"GLM-4.5-AirX",
	"GLM-4-32B-0414-128K",
];

const SEARCH_TEXT = "GLM-5";
const TYPE_START = 6;
const CHAR_FRAMES = 2;
const TYPE_END = typedEnd(SEARCH_TEXT, TYPE_START, CHAR_FRAMES); // 16
const SELECT_FRAME = 76;

export const ModelSelectScene: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const copy = useCopy();

	const fadeIn = enter({ frame, fps });

	const typedSearch = typed(SEARCH_TEXT, frame, TYPE_START, CHAR_FRAMES);
	const doneTyping = frame >= TYPE_END;

	const filteredModels =
		typedSearch.length > 0
			? ALL_MODELS.filter((m) => m.toLowerCase().includes(typedSearch.toLowerCase()))
			: ALL_MODELS;

	return (
		<div style={{ width: "100%", height: "100%", position: "absolute", opacity: fadeIn }}>
			<TerminalWindow>
				<TerminalHeader breadcrumb={[LITERAL.provider]} />
				<div
					style={{
						flex: 1,
						display: "flex",
						flexDirection: "row",
						gap: 24,
						overflow: "hidden",
					}}
				>
					<div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
						<div
							style={{
								color: COLORS.cyan,
								fontWeight: 700,
								fontSize: 28,
								marginBottom: 16,
							}}
						>
							{copy.modelSelect.title}
						</div>

						{/* Search bar */}
						<div
							style={{
								display: "flex",
								alignItems: "center",
								marginBottom: 20,
								fontSize: 24,
							}}
						>
							<span style={{ color: COLORS.green, marginRight: 8 }}>{">"}</span>
							<span style={{ color: COLORS.white }}>{typedSearch}</span>
							{!doneTyping && <TerminalCursor color={COLORS.green} />}
							<span style={{ marginLeft: "auto", color: COLORS.gray, fontSize: 20 }}>
								({filteredModels.length}/{ALL_MODELS.length})
							</span>
						</div>

						{/* Model list */}
						<div
							style={{
								position: "relative",
								height: filteredModels.length * (ROW_HEIGHT + ROW_GAP),
							}}
						>
							{doneTyping && <HighlightBar top={0} appearFrame={TYPE_END} />}
							{filteredModels.map((model, i) => {
								const isActive = i === 0 && doneTyping;
								const itemOpacity = interpolate(frame - TYPE_END - i * 2, [0, 8], [0, 1], {
									extrapolateLeft: "clamp",
									extrapolateRight: "clamp",
								});

								return (
									<div
										key={model}
										style={{
											position: "absolute",
											top: i * (ROW_HEIGHT + ROW_GAP),
											left: 0,
											right: 0,
											height: ROW_HEIGHT,
											color: isActive ? COLORS.cyan : COLORS.white,
											fontWeight: isActive ? 700 : 400,
											fontSize: 26,
											display: "flex",
											alignItems: "center",
											opacity: typedSearch.length > 0 ? itemOpacity : 1,
										}}
									>
										<span style={{ width: 36, color: COLORS.cyan, flexShrink: 0 }}>
											{isActive ? "❯" : " "}
										</span>
										<span>{model}</span>
									</div>
								);
							})}
						</div>
					</div>

					<div style={{ width: 400 }}>
						<Sidebar
							title={copy.modelSelect.modelInfo}
							entries={[
								{ label: copy.modelSelect.name, value: LITERAL.model },
								{
									label: copy.modelSelect.context,
									value: LITERAL.modelContext,
									color: COLORS.cyan,
								},
								{ label: copy.modelSelect.maxOutput, value: LITERAL.modelMaxOutput },
								{ label: copy.modelSelect.tools, value: copy.modelSelect.yes, color: COLORS.green },
								{
									label: copy.modelSelect.reasoning,
									value: copy.modelSelect.yes,
									color: COLORS.green,
								},
							]}
						/>
					</div>
				</div>
				<TerminalFooter
					shortcuts={[
						{ key: "↑↓", label: copy.footer.navigate },
						{ key: "⏎", label: copy.footer.select },
						{ key: "esc", label: copy.footer.back },
						{ key: "/", label: copy.footer.search },
					]}
				/>
			</TerminalWindow>

			<KeyBadge label="⏎" startFrame={SELECT_FRAME - 4} />
			<Flash startFrame={SELECT_FRAME} rgb="139, 233, 253" />

			<TextOverlay text={copy.modelSelect.caption} startFrame={4} durationFrames={54} />
		</div>
	);
};
