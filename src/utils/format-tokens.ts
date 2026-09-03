/** 1_048_576 -> "1M", 204_800 -> "205K". Shared by the model list and the model manager. */
export function formatContextLength(tokens: number): string {
	if (tokens >= 1_000_000) {
		const m = tokens / 1_000_000;
		return `${Number.isInteger(m) ? m : m.toFixed(1)}M`;
	}
	const k = tokens / 1_000;
	return `${Number.isInteger(k) ? k : k.toFixed(0)}K`;
}
