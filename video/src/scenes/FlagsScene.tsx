import { useCurrentFrame, useVideoConfig } from "remotion";
import { enter } from "../animations";
import { ChecklistMenu } from "../components/ChecklistMenu";
import { Flash } from "../components/Flash";
import { KeyBadge } from "../components/KeyBadge";
import { Sidebar } from "../components/Sidebar";
import { TerminalFooter } from "../components/TerminalFooter";
import { TerminalHeader } from "../components/TerminalHeader";
import { TerminalWindow } from "../components/TerminalWindow";
import { TextOverlay } from "../components/TextOverlay";
import { COLORS } from "../constants";
import { LITERAL } from "../copy";
import { useCopy } from "../LocaleContext";

const TOGGLE_SKIP = 22;
const ENTER_LAUNCH = 50;

export const FlagsScene: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const copy = useCopy();

	const fadeIn = enter({ frame, fps });
	const skipChecked = frame >= TOGGLE_SKIP;

	// The four groups the launch screen actually has (src/i18n/locales/en.ts).
	const groups = [
		{
			label: copy.flags.groupPermissions,
			items: [{ label: LITERAL.skipPermissions, checked: skipChecked }],
		},
		{
			label: copy.flags.groupDevelopment,
			items: [{ label: LITERAL.worktree, checked: false }],
		},
		{
			label: copy.flags.groupEnvironment,
			items: [{ label: copy.flags.loadDotenv, checked: false }],
		},
		{
			label: copy.flags.groupExperimental,
			items: [{ label: LITERAL.agentTeams, checked: false }],
		},
	];

	return (
		<div style={{ width: "100%", height: "100%", position: "absolute", opacity: fadeIn }}>
			<TerminalWindow>
				<TerminalHeader breadcrumb={[LITERAL.provider, LITERAL.model]} />
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
						<div
							style={{
								color: COLORS.cyan,
								fontWeight: 700,
								fontSize: 28,
								marginBottom: 16,
							}}
						>
							{copy.flags.title}
						</div>
						<ChecklistMenu groups={groups} activeIndex={0} appearFrame={4} />
					</div>
					<div style={{ width: 400 }}>
						<Sidebar
							title={copy.flags.flagInfo}
							entries={[
								{ label: copy.flags.flag, value: LITERAL.skipPermissions },
								{
									label: copy.flags.description,
									value: copy.flags.descSkipPermissions,
									color: COLORS.yellow,
								},
							]}
						/>
					</div>
				</div>
				<TerminalFooter
					shortcuts={[
						{ key: "↑↓", label: copy.footer.navigate },
						{ key: "space", label: copy.footer.toggle },
						{ key: "⏎", label: copy.footer.launch },
						{ key: "esc", label: copy.footer.back },
					]}
				/>
			</TerminalWindow>

			<KeyBadge label="Space" startFrame={TOGGLE_SKIP - 4} />
			<KeyBadge label="⏎" startFrame={ENTER_LAUNCH - 4} />
			<Flash startFrame={ENTER_LAUNCH} rgb="80, 250, 123" />

			<TextOverlay text={copy.flags.caption} startFrame={3} durationFrames={34} />
		</div>
	);
};
