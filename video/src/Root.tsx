import { Composition, Folder } from "remotion";
import { FPS, HEIGHT, SCENE_DURATIONS, TOTAL_DURATION, WIDTH } from "./constants";
import { Main } from "./Main";
import { FlagsScene } from "./scenes/FlagsScene";
import { IntroScene } from "./scenes/IntroScene";
import { LaunchScene } from "./scenes/LaunchScene";
import { MainMenuScene } from "./scenes/MainMenuScene";
import { ModelSelectScene } from "./scenes/ModelSelectScene";
import { OutroScene } from "./scenes/OutroScene";
import { TerminalOpenScene } from "./scenes/TerminalOpenScene";

export const RemotionRoot: React.FC = () => {
	return (
		<>
			<Composition
				id="Main"
				component={Main}
				durationInFrames={TOTAL_DURATION}
				fps={FPS}
				width={WIDTH}
				height={HEIGHT}
			/>
			<Folder name="Scenes">
				<Composition
					id="Intro"
					component={IntroScene}
					durationInFrames={SCENE_DURATIONS.intro}
					fps={FPS}
					width={WIDTH}
					height={HEIGHT}
				/>
				<Composition
					id="TerminalOpen"
					component={TerminalOpenScene}
					durationInFrames={SCENE_DURATIONS.terminalOpen}
					fps={FPS}
					width={WIDTH}
					height={HEIGHT}
				/>
				<Composition
					id="MainMenu"
					component={MainMenuScene}
					durationInFrames={SCENE_DURATIONS.mainMenu}
					fps={FPS}
					width={WIDTH}
					height={HEIGHT}
				/>
				<Composition
					id="ModelSelect"
					component={ModelSelectScene}
					durationInFrames={SCENE_DURATIONS.modelSelect}
					fps={FPS}
					width={WIDTH}
					height={HEIGHT}
				/>
				<Composition
					id="Flags"
					component={FlagsScene}
					durationInFrames={SCENE_DURATIONS.flags}
					fps={FPS}
					width={WIDTH}
					height={HEIGHT}
				/>
				<Composition
					id="Launch"
					component={LaunchScene}
					durationInFrames={SCENE_DURATIONS.launch}
					fps={FPS}
					width={WIDTH}
					height={HEIGHT}
				/>
				<Composition
					id="Outro"
					component={OutroScene}
					durationInFrames={SCENE_DURATIONS.outro}
					fps={FPS}
					width={WIDTH}
					height={HEIGHT}
				/>
			</Folder>
		</>
	);
};
