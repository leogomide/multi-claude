import type {
	ApiFetchResult,
	ApiKeyValidation,
	ApiModelError,
	ApiModelMeta,
} from "./api-models.ts";

interface ZaiModelRaw {
	id: string;
	// Anthropic-compat only; absent on the OpenAI-compat endpoint
	display_name?: string;
}

interface ZaiModelsResponse {
	data?: ZaiModelRaw[];
	// Error payloads arrive with HTTP 200 on the Anthropic-compat endpoint
	code?: string | number;
	msg?: string;
	success?: boolean;
	error?: { code?: string | number; message?: string };
}

function zaiHeaders(apiKey: string): Record<string, string> {
	return {
		Authorization: `Bearer ${apiKey}`,
		"x-api-key": apiKey,
		"anthropic-version": "2023-06-01",
	};
}

function classifyErrorCode(code: string | number | undefined): ApiModelError {
	const n = Number(code);
	return n === 401 || n === 403 ? "auth" : "unknown";
}

export async function fetchZaiModels(baseUrl: string, apiKey: string): Promise<ApiFetchResult> {
	try {
		const url = `${baseUrl.replace(/\/+$/, "")}/v1/models`;
		const response = await fetch(url, { headers: zaiHeaders(apiKey) });

		if (response.status === 401 || response.status === 403) {
			return { ok: false, error: "auth" };
		}

		const json = (await response.json().catch(() => null)) as ZaiModelsResponse | null;

		// Z.AI answers auth failures with HTTP 200 and the error inside the body.
		if (!json || !Array.isArray(json.data)) {
			if (!response.ok) return { ok: false, error: "unknown" };
			return { ok: false, error: classifyErrorCode(json?.code ?? json?.error?.code) };
		}

		const models = json.data.map((m): ApiModelMeta => ({ id: m.id, name: m.display_name ?? m.id }));
		models.sort((a, b) => a.id.localeCompare(b.id));
		return { ok: true, models };
	} catch {
		return { ok: false, error: "network" };
	}
}

export async function validateZaiApiKey(
	baseUrl: string,
	apiKey: string,
): Promise<ApiKeyValidation> {
	const result = await fetchZaiModels(baseUrl, apiKey);
	return result.ok ? { valid: true } : { valid: false, error: result.error };
}
