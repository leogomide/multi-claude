/** Anything below this is a typo, not a context window. */
const MIN_CONTEXT_TOKENS = 1024;
/** Guards against a slipped zero; the auto-compact clamp lives in buildClaudeEnv. */
const MAX_CONTEXT_TOKENS = 10_000_000;

/**
 * Accepts "128000", "128_000", "128.000", "128k" and "1M".
 * Returns undefined for an empty or unparseable value — the caller decides
 * whether empty means "skip" or "clear".
 */
export function parseContextWindow(value: string): number | undefined {
	const raw = value
		.trim()
		.toLowerCase()
		.replace(/[\s_.,]/g, "");
	if (!raw) return undefined;

	const match = raw.match(/^(\d+)([km])?$/);
	if (!match) return undefined;

	const digits = Number(match[1]);
	if (!Number.isFinite(digits) || digits <= 0) return undefined;

	const multiplier = match[2] === "m" ? 1_000_000 : match[2] === "k" ? 1_000 : 1;
	return digits * multiplier;
}

export function validateContextWindow(
	value: string,
	t: (key: string) => string,
): string | undefined {
	// Optional everywhere: empty means "no override" (RN-04).
	if (!value.trim()) return undefined;

	const parsed = parseContextWindow(value);
	if (parsed === undefined) return t("validation.contextInvalid");
	if (parsed < MIN_CONTEXT_TOKENS || parsed > MAX_CONTEXT_TOKENS) {
		return t("validation.contextRange");
	}
	return undefined;
}

/** Claude Code ignores CLAUDE_CODE_MAX_CONTEXT_TOKENS for these ids (see plan 004). */
export function ignoresContextWindow(model: string): boolean {
	return model.trim().toLowerCase().startsWith("claude-");
}
