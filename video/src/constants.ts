export const COLORS = {
  background: "#1a1a2e",
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
};

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const SCENE_DURATIONS = {
  intro: 4 * FPS,
  terminalOpen: 5 * FPS,
  mainMenu: 5 * FPS,
  modelSelect: 5 * FPS,
  flags: 4 * FPS,
  launch: 4 * FPS,
  outro: 5 * FPS,
};

export const TRANSITION_FRAMES = 12;

export const TOTAL_DURATION =
  Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0) -
  6 * TRANSITION_FRAMES; // 6 transitions between 7 scenes

export const TERMINAL = {
  width: 1480,
  height: 820,
  borderRadius: 16,
  titleBarHeight: 44,
  padding: 24,
  fontSize: 20,
  lineHeight: 30,
};
