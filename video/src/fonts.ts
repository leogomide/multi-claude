import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadJetBrains } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadEmoji } from "@remotion/google-fonts/NotoColorEmoji";

const { fontFamily: mono } = loadJetBrains("normal", {
	weights: ["400", "700"],
	subsets: ["latin"],
});

const { fontFamily: sans } = loadInter("normal", {
	weights: ["400", "600", "700"],
	subsets: ["latin"],
});

// Noto Color Emoji is declared with unicode-range, so it only claims emoji
// codepoints — latin text falls through to the next family in the stack.
// Listing it first keeps the octopus identical on any render machine instead
// of inheriting whatever the OS ships (Segoe UI Emoji on Windows).
// Subsets are deliberately not narrowed: the package types the subset as
// "emoji" while its data is keyed by the ten unicode-range chunks ([0]..[9]),
// so there is no type-safe way to ask for just the chunks we draw. Omitting
// the option loads all of them, which is a one-time fetch at render time.
const { fontFamily: emoji } = loadEmoji("normal", { weights: ["400"] });

export { emoji, mono, sans };
