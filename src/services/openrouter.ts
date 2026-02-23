export interface OpenRouterModelMeta {
	id: string;
	name?: string;
	context_length?: number;
	architecture?: {
		input_modalities: string[];
		modality: string;
	};
	pricing?: {
		prompt: string;
		completion: string;
		internal_reasoning?: string;
		input_cache_read?: string;
		input_cache_write?: string;
		web_search?: string;
		image?: string;
	};
	top_provider?: {
		max_completion_tokens?: number;
		is_moderated?: boolean;
	};
	supported_parameters?: string[];
}

interface OpenRouterResponse {
	data: OpenRouterModelMeta[];
}

export type OpenRouterError = "auth" | "network" | "unknown";

export type OpenRouterFetchResult =
	| { ok: true; models: OpenRouterModelMeta[] }
	| { ok: false; error: OpenRouterError };

export type OpenRouterKeyValidation =
	| { valid: true }
	| { valid: false; error: OpenRouterError };

export async function fetchOpenRouterModels(apiKey: string): Promise<OpenRouterFetchResult> {
	try {
		const response = await fetch("https://openrouter.ai/api/v1/models/user", {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		});

		if (response.status === 401 || response.status === 403) {
			return { ok: false, error: "auth" };
		}

		if (!response.ok) {
			return { ok: false, error: "unknown" };
		}

		const json = (await response.json()) as OpenRouterResponse;
		const models = json.data;
		models.sort((a, b) => a.id.localeCompare(b.id));
		return { ok: true, models };
	} catch {
		return { ok: false, error: "network" };
	}
}

export async function validateOpenRouterApiKey(apiKey: string): Promise<OpenRouterKeyValidation> {
	try {
		const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
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
