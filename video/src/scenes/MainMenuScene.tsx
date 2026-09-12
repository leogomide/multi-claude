import { useCurrentFrame, useVideoConfig } from "remotion";
import { enter } from "../animations";
import { Flash } from "../components/Flash";
import { GroupedMenu } from "../components/GroupedMenu";
import { KeyBadge } from "../components/KeyBadge";
import { Sidebar } from "../components/Sidebar";
import { TerminalFooter } from "../components/TerminalFooter";
import { TerminalHeader } from "../components/TerminalHeader";
import { TerminalWindow } from "../components/TerminalWindow";
import { TextOverlay } from "../components/TextOverlay";
import { COLORS } from "../constants";
import { LITERAL } from "../copy";
import { useCopy } from "../LocaleContext";

const MOVE_FRAME = 30;
const SELECT_FRAME = 72;

export const MainMenuScene: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const copy = useCopy();

	const fadeIn = enter({ frame, fps });

	// Cursor starts on the default launch and moves down to the Z.AI provider.
	const activeIndex = frame < MOVE_FRAME ? 0 : 1;

	const groups = [
		{
			label: copy.mainMenu.groupStart,
			items: [
				{ icon: "🏠", label: copy.mainMenu.defaultLaunch },
				{ icon: "🚀", label: LITERAL.provider },
				{ icon: "🚀", label: "OpenRouter" },
				{ icon: "🚀", label: "DeepSeek" },
			],
		},
		{
			label: copy.mainMenu.groupOptions,
			items: [
				{ icon: "🔧", label: copy.mainMenu.manageProviders },
				{ icon: "📁", label: copy.mainMenu.manageInstallations },
				{ icon: "⚙️", label: copy.mainMenu.settings },
				{ icon: "🚪", label: copy.mainMenu.exit },
			],
		},
	];

	const sidebarEntries =
		activeIndex === 0
			? [
					{ label: copy.mainMenu.name, value: copy.mainMenu.defaultLaunch },
					{ label: copy.mainMenu.template, value: "Anthropic" },
					{ label: copy.mainMenu.auth, value: "OAuth", color: COLORS.green },
				]
			: [
					{ label: copy.mainMenu.name, value: LITERAL.provider },
					{ label: copy.mainMenu.template, value: LITERAL.provider },
					{ label: copy.mainMenu.models, value: copy.mainMenu.modelsValue, color: COLORS.cyan },
					{ label: copy.mainMenu.baseUrl, value: LITERAL.providerBaseUrl, color: COLORS.gray },
				];

	return (
		<div style={{ width: "100%", height: "100%", position: "absolute", opacity: fadeIn }}>
			<TerminalWindow>
				<TerminalHeader />
				<div
					style={{
						flex: 1,
						display: "flex",
						flexDirection: "row",
						gap: 24,
						overflow: "hidden",
					}}
				>
					<div style={{ flex: 1 }}>
						<GroupedMenu
							groups={groups}
							activeIndex={activeIndex}
							previousIndex={0}
							moveFrame={MOVE_FRAME}
							appearFrame={4}
						/>
					</div>
					<div style={{ width: 400 }}>
						<Sidebar title={copy.mainMenu.providerInfo} entries={sidebarEntries} />
					</div>
				</div>
				<TerminalFooter
					shortcuts={[
						{ key: "↑↓", label: copy.footer.navigate },
						{ key: "⏎", label: copy.footer.select },
						{ key: "esc", label: copy.footer.quit },
					]}
				/>
			</TerminalWindow>

			<KeyBadge label="↓" startFrame={MOVE_FRAME - 4} />
			<KeyBadge label="⏎" startFrame={SELECT_FRAME - 4} />
			<Flash startFrame={SELECT_FRAME} rgb="139, 233, 253" />

			<TextOverlay text={copy.mainMenu.caption} startFrame={4} durationFrames={54} />
		</div>
	);
};
