export const COLORS = {
	background: "#0e1018",
	terminalBg: "#0d1117",
	magenta: "#ff79c6",
	cyan: "#8be9fd",
	green: "#50fa7b",
	yellow: "#f1fa8c",
	white: "#f8f8f2",
	gray: "#6272a4",
	red: "#ff5555",
	blue: "#6272a7",
	titleBar: "#282a36",
	dimGray: "#44475a",
	deepBlue: "#1d4f9c",
	// Flatt brand, same hex as the sponsor CTA badge in both READMEs
	sponsor: "#4b3fe6",
};

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

// Bump on every release — these are the versions the video shows on screen.
export const MCLAUDE_VERSION = "2.0.0";
export const CLAUDE_CODE_VERSION = "2.1.72";

// Tuned so the finished video lands on exactly 600 frames = 20.000s:
// sum(SCENE_DURATIONS) - 6 * TRANSITION_FRAMES = 648 - 48 = 600.
export const SCENE_DURATIONS = {
	intro: 86,
	terminalOpen: 71,
	mainMenu: 101,
	modelSelect: 101,
	flags: 71,
	launch: 101,
	outro: 117,
};

export const TRANSITION_FRAMES = 8;

export const TOTAL_DURATION =
	Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0) - 6 * TRANSITION_FRAMES; // 6 transitions between 7 scenes

export const TERMINAL = {
	width: 1720,
	height: 860,
	borderRadius: 16,
	titleBarHeight: 48,
	padding: 32,
	fontSize: 26,
	lineHeight: 38,
};

// One row height across GroupedMenu, ChecklistMenu and the model list, so the
// sliding HighlightBar can be positioned from a flat row index.
export const ROW_HEIGHT = 40;
export const ROW_GAP = 4;
