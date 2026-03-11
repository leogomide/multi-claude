import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadJetBrains } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: mono } = loadJetBrains("normal", {
	weights: ["400", "700"],
	subsets: ["latin"],
});

const { fontFamily: sans } = loadInter("normal", {
	weights: ["400", "600", "700"],
	subsets: ["latin"],
});

export { mono, sans };
