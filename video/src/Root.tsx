import { Composition, Folder } from "remotion";
import { FPS, HEIGHT, SCENE_DURATIONS, TOTAL_DURATION, WIDTH } from "./constants";
import type { Locale } from "./copy";
import { LocaleProvider } from "./LocaleContext";
import { Main } from "./Main";
import { FlagsScene } from "./scenes/FlagsScene";
import { IntroScene } from "./scenes/IntroScene";
import { LaunchScene } from "./scenes/LaunchScene";
import { MainMenuScene } from "./scenes/MainMenuScene";
import { ModelSelectScene } from "./scenes/ModelSelectScene";
import { OutroScene } from "./scenes/OutroScene";
import { TerminalOpenScene } from "./scenes/TerminalOpenScene";

const video = { fps: FPS, width: WIDTH, height: HEIGHT } as const;

/** Scene previews render in English; the full cuts carry the locale. */
const preview =
	(Scene: React.FC): React.FC =>
	() => (
		<LocaleProvider locale="en">
			<Scene />
		</LocaleProvider>
	);

export const RemotionRoot: React.FC = () => {
	return (
		<>
			<Composition
				id="MainEN"
				component={Main}
				defaultProps={{ locale: "en" as Locale }}
				durationInFrames={TOTAL_DURATION}
				{...video}
			/>
			<Composition
				id="MainPT"
				component={Main}
				defaultProps={{ locale: "pt-BR" as Locale }}
				durationInFrames={TOTAL_DURATION}
				{...video}
			/>
			<Folder name="Scenes">
				<Composition
					id="Intro"
					component={preview(IntroScene)}
					durationInFrames={SCENE_DURATIONS.intro}
					{...video}
				/>
				<Composition
					id="TerminalOpen"
					component={preview(TerminalOpenScene)}
					durationInFrames={SCENE_DURATIONS.terminalOpen}
					{...video}
				/>
				<Composition
					id="MainMenu"
					component={preview(MainMenuScene)}
					durationInFrames={SCENE_DURATIONS.mainMenu}
					{...video}
				/>
				<Composition
					id="ModelSelect"
					component={preview(ModelSelectScene)}
					durationInFrames={SCENE_DURATIONS.modelSelect}
					{...video}
				/>
				<Composition
					id="Flags"
					component={preview(FlagsScene)}
					durationInFrames={SCENE_DURATIONS.flags}
					{...video}
				/>
				<Composition
					id="Launch"
					component={preview(LaunchScene)}
					durationInFrames={SCENE_DURATIONS.launch}
					{...video}
				/>
				<Composition
					id="Outro"
					component={preview(OutroScene)}
					durationInFrames={SCENE_DURATIONS.outro}
					{...video}
				/>
			</Folder>
		</>
	);
};
