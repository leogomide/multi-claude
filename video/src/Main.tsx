import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { SCENE_DURATIONS, TRANSITION_FRAMES } from "./constants";
import { FlagsScene } from "./scenes/FlagsScene";
import { IntroScene } from "./scenes/IntroScene";
import { LaunchScene } from "./scenes/LaunchScene";
import { MainMenuScene } from "./scenes/MainMenuScene";
import { ModelSelectScene } from "./scenes/ModelSelectScene";
import { OutroScene } from "./scenes/OutroScene";
import { TerminalOpenScene } from "./scenes/TerminalOpenScene";

const transition = (
	<TransitionSeries.Transition
		presentation={fade()}
		timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
	/>
);

export const Main: React.FC = () => {
	return (
		<TransitionSeries>
			<TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.intro}>
				<IntroScene />
			</TransitionSeries.Sequence>
			{transition}
			<TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.terminalOpen}>
				<TerminalOpenScene />
			</TransitionSeries.Sequence>
			{transition}
			<TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.mainMenu}>
				<MainMenuScene />
			</TransitionSeries.Sequence>
			{transition}
			<TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.modelSelect}>
				<ModelSelectScene />
			</TransitionSeries.Sequence>
			{transition}
			<TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.flags}>
				<FlagsScene />
			</TransitionSeries.Sequence>
			{transition}
			<TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.launch}>
				<LaunchScene />
			</TransitionSeries.Sequence>
			{transition}
			<TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.outro}>
				<OutroScene />
			</TransitionSeries.Sequence>
		</TransitionSeries>
	);
};
