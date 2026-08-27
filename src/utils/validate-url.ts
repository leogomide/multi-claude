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
