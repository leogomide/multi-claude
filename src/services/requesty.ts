import type { ApiModelMeta, ApiFetchResult, ApiKeyValidation } from "./api-models.ts";

interface RequestyModelRaw {
	id: string;
	object: string;
	created: number;
	owned_by: string;
	input_price?: number;
	caching_price?: number;
	cached_price?: number;
	output_price?: number;
	max_output_tokens?: number;
	context_window?: number;
	supports_caching?: boolean;
	supports_vision?: boolean;
	supports_computer_use?: boolean;
	supports_reasoning?: boolean;
	description?: string;
}

interface RequestyResponse {
	object: string;
	data: RequestyModelRaw[];
}

function mapRequestyModel(m: RequestyModelRaw): ApiModelMeta {
	const modalities: string[] = ["text"];
	if (m.supports_vision) modalities.push("image");

	const params: string[] = [];
	if (m.supports_reasoning) params.push("reasoning");

	return {
		id: m.id,
		name: undefined,
		context_length: m.context_window,
		max_output_tokens: m.max_output_tokens,
		pricing:
			m.input_price != null && m.output_price != null
				? { prompt: String(m.input_price), completion: String(m.output_price) }
				: undefined,
		input_modalities: modalities,
		supported_parameters: params.length > 0 ? params : undefined,
		is_moderated: undefined,
	};
}

export async function fetchRequestyModels(apiKey: string): Promise<ApiFetchResult> {
	try {
		const response = await fetch("https://router.requesty.ai/v1/models", {
			headers: { Authorization: `Bearer ${apiKey}` },
		});

		if (response.status === 401 || response.status === 403) {
			return { ok: false, error: "auth" };
		}

		if (!response.ok) {
			return { ok: false, error: "unknown" };
		}

		const json = (await response.json()) as RequestyResponse;
		const models = json.data.map(mapRequestyModel);
		models.sort((a, b) => a.id.localeCompare(b.id));
		return { ok: true, models };
	} catch {
		return { ok: false, error: "network" };
	}
}

export async function validateRequestyApiKey(apiKey: string): Promise<ApiKeyValidation> {
	try {
		const response = await fetch("https://router.requesty.ai/v1/models", {
			headers: { Authorization: `Bearer ${apiKey}` },
		});

		if (response.status === 401 || response.status === 403) {
			return { valid: false, error: "auth" };
		}

		if (!response.ok) {
			return { valid: false, error: "unknown" };
		}

		return { valid: true };
	} catch {
		return { valid: false, error: "network" };
	}
}
