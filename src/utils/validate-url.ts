export function validateBaseUrl(value: string, t: (key: string) => string): string | undefined {
	const trimmed = value.trim();
	if (!trimmed) return t("validation.urlInvalid");
	if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
		return t("validation.urlMustBeHttp");
	}
	try {
		new URL(trimmed);
	} catch {
		return t("validation.urlInvalid");
	}
	return undefined;
}

export function normalizeBaseUrl(value: string): string {
	return value.trim().replace(/\/+$/, "");
}

/**
 * Where an OpenAI-style gateway lists its models: a base already ending in /v1
 * exposes `/models`, any other base exposes `/v1/models`.
 */
export function defaultModelsUrl(baseUrl: string): string {
	const root = normalizeBaseUrl(baseUrl);
	return /\/v1$/i.test(root) ? `${root}/models` : `${root}/v1/models`;
}
