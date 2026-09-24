import type { ApiFetchResult, ApiKeyValidation, ApiModelMeta } from "./api-models.ts";

interface FlattModelRaw {
	id: string;
	max_input_tokens?: number;
	max_output_tokens?: number;
	architecture?: { input_modalities?: string[] };
	supported_parameters?: string[];
}

interface FlattModelsResponse {
	data?: FlattModelRaw[];
}

function flattHeaders(apiKey: string): Record<string, string> {
	// ANTHROPIC_AUTH_TOKEN goes out as a Bearer token, so validate the same way.
	return { Authorization: `Bearer ${apiKey}` };
}

function mapFlattModel(m: FlattModelRaw): ApiModelMeta {
	return {
		id: m.id,
		name: m.id,
		context_length: m.max_input_tokens,
		max_output_tokens: m.max_output_tokens,
		input_modalities: m.architecture?.input_modalities,
		supported_parameters: m.supported_parameters,
	};
}

export async function fetchFlattModels(baseUrl: string, apiKey: string): Promise<ApiFetchResult> {
	try {
		const url = `${baseUrl.replace(/\/+$/, "")}/v1/models`;
		const response = await fetch(url, { headers: flattHeaders(apiKey) });

		if (response.status === 401 || response.status === 403) {
			return { ok: false, error: "auth" };
		}

		if (!response.ok) {
			return { ok: false, error: "unknown" };
		}

		const json = (await response.json().catch(() => null)) as FlattModelsResponse | null;
		if (!json || !Array.isArray(json.data)) {
			return { ok: false, error: "unknown" };
		}

		const models = json.data
			.filter((m) => typeof m?.id === "string" && m.id.length > 0)
			.map(mapFlattModel);
		models.sort((a, b) => a.id.localeCompare(b.id));
		return { ok: true, models };
	} catch {
		return { ok: false, error: "network" };
	}
}

export async function validateFlattApiKey(
	baseUrl: string,
	apiKey: string,
): Promise<ApiKeyValidation> {
	// /v1/models answers anonymous requests, so an empty key would always pass.
	if (!apiKey.trim()) return { valid: false, error: "auth" };
	const result = await fetchFlattModels(baseUrl, apiKey);
	return result.ok ? { valid: true } : { valid: false, error: result.error };
}
