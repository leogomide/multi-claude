import type { ApiFetchResult, ApiKeyValidation, ApiModelMeta } from "./api-models.ts";

interface LiteLLMModelRaw {
	model_name: string;
	litellm_params: {
		model: string;
		[key: string]: unknown;
	};
	model_info?: {
		id?: string;
		max_tokens?: number;
		max_input_tokens?: number;
		max_output_tokens?: number;
		input_cost_per_token?: number;
		output_cost_per_token?: number;
		[key: string]: unknown;
	};
}

interface LiteLLMModelInfoResponse {
	data: LiteLLMModelRaw[];
}

function mapLiteLLMModel(m: LiteLLMModelRaw): ApiModelMeta {
	const info = m.model_info;
	return {
		id: m.model_name,
		name: m.model_name,
		context_length: info?.max_input_tokens ?? undefined,
		max_output_tokens: info?.max_output_tokens ?? info?.max_tokens ?? undefined,
		pricing:
			info?.input_cost_per_token != null && info?.output_cost_per_token != null
				? { prompt: String(info.input_cost_per_token), completion: String(info.output_cost_per_token) }
				: undefined,
	};
}

export async function fetchLiteLLMModels(baseUrl: string, apiKey: string): Promise<ApiFetchResult> {
	try {
		const response = await fetch(`${baseUrl}/model/info`, {
			headers: { Authorization: `Bearer ${apiKey}` },
		});

		if (response.status === 401 || response.status === 403) {
			return { ok: false, error: "auth" };
		}

		if (!response.ok) {
			return { ok: false, error: "unknown" };
		}

		const json = (await response.json()) as LiteLLMModelInfoResponse;
		const models = (json.data ?? []).map(mapLiteLLMModel);
		models.sort((a, b) => a.id.localeCompare(b.id));
		return { ok: true, models };
	} catch {
		return { ok: false, error: "network" };
	}
}

export async function validateLiteLLMApiKey(baseUrl: string, apiKey: string): Promise<ApiKeyValidation> {
	try {
		const response = await fetch(`${baseUrl}/health`, {
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
