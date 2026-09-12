import { spring } from "remotion";

type At = { frame: number; fps: number; delay?: number };

/**
 * The three springs every scene shares, so the whole video moves with one
 * vocabulary instead of the ad-hoc damping values each scene used to pick.
 */

/** Soft, no overshoot. Fades and content that should just arrive. */
export const enter = ({ frame, fps, delay = 0 }: At) =>
	spring({ frame: frame - delay, fps, config: { damping: 200 } });

/** Overshoots. Hero elements that should feel like they land. */
export const pop = ({ frame, fps, delay = 0 }: At) =>
	spring({ frame: frame - delay, fps, config: { damping: 11, stiffness: 120 } });

/** Barely overshoots. Things that move between two places (selection bars). */
export const settle = ({ frame, fps, delay = 0 }: At) =>
	spring({ frame: frame - delay, fps, config: { damping: 26, stiffness: 190 } });

/** Typewriter: how many characters of `text` are visible at `frame`. */
export const typed = (text: string, frame: number, start: number, charFrames: number) =>
	text.slice(0, Math.min(text.length, Math.max(0, Math.floor((frame - start) / charFrames))));

/** Frame at which a typewriter started at `start` finishes `text`. */
export const typedEnd = (text: string, start: number, charFrames: number) =>
	start + text.length * charFrames;
