import { springTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { SCENE_DURATIONS, TRANSITION_FRAMES } from "./constants";
import type { Locale } from "./copy";
import { LocaleProvider } from "./LocaleContext";
import { FlagsScene } from "./scenes/FlagsScene";
import { IntroScene } from "./scenes/IntroScene";
import { LaunchScene } from "./scenes/LaunchScene";
import { MainMenuScene } from "./scenes/MainMenuScene";
import { ModelSelectScene } from "./scenes/ModelSelectScene";
import { OutroScene } from "./scenes/OutroScene";
import { TerminalOpenScene } from "./scenes/TerminalOpenScene";

// TransitionSeries checks its children by component identity, so these have to
// be elements — wrapping them in a component of our own is rejected.
const timing = springTiming({
	config: { damping: 200 },
	durationInFrames: TRANSITION_FRAMES,
});

const crossFade = <TransitionSeries.Transition presentation={fade()} timing={timing} />;

/**
 * Drilling into a submenu slides in from the right, the same direction the TUI
 * breadcrumb grows — so the motion carries the meaning of the navigation.
 */
const slideIn = (
	<TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={timing} />
);

const wipeUp = (
	<TransitionSeries.Transition presentation={wipe({ direction: "from-bottom" })} timing={timing} />
);

export const Main: React.FC<{ locale: Locale }> = ({ locale }) => {
	return (
		<LocaleProvider locale={locale}>
			<TransitionSeries>
				<TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.intro}>
					<IntroScene />
				</TransitionSeries.Sequence>
				{crossFade}
				<TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.terminalOpen}>
					<TerminalOpenScene />
				</TransitionSeries.Sequence>
				{crossFade}
				<TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.mainMenu}>
					<MainMenuScene />
				</TransitionSeries.Sequence>
				{slideIn}
				<TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.modelSelect}>
					<ModelSelectScene />
				</TransitionSeries.Sequence>
				{slideIn}
				<TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.flags}>
					<FlagsScene />
				</TransitionSeries.Sequence>
				{crossFade}
				<TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.launch}>
					<LaunchScene />
				</TransitionSeries.Sequence>
				{wipeUp}
				<TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.outro}>
					<OutroScene />
				</TransitionSeries.Sequence>
			</TransitionSeries>
		</LocaleProvider>
	);
};
