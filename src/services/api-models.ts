import { getTemplate } from "../providers.ts";
import { fetchLiteLLMModels, validateLiteLLMApiKey } from "./litellm.ts";
import { fetchLlamaCppModels } from "./llamacpp.ts";
import { fetchLMStudioModels } from "./lmstudio.ts";
import { fetchNanoGPTModels, validateNanoGPTApiKey } from "./nanogpt.ts";
import { fetchOllamaModels } from "./ollama.ts";
import { fetchOmniRouteModels, validateOmniRouteApiKey } from "./omniroute.ts";
import type { OpenRouterModelMeta } from "./openrouter.ts";
import { fetchOpenRouterModels, validateOpenRouterApiKey } from "./openrouter.ts";
import { fetchRequestyModels, validateRequestyApiKey } from "./requesty.ts";

export interface ApiModelMeta {
	id: string;
	name?: string;
	context_length?: number;
	max_output_tokens?: number;
	pricing?: {
		prompt: string;
		completion: string;
	};
	input_modalities?: string[];
	supported_parameters?: string[];
	is_moderated?: boolean;
	parameter_size?: string;
	quantization?: string;
	architecture?: string;
	file_size?: number;
}

export type ApiModelError = "auth" | "network" | "unknown";

export type ApiFetchResult =
	| { ok: true; models: ApiModelMeta[] }
	| { ok: false; error: ApiModelError };

export type ApiKeyValidation = { valid: true } | { valid: false; error: ApiModelError };

const API_KEY_VALIDATION_PROVIDERS = new Set([
	"openrouter",
	"requesty",
	"nanogpt",
	"litellm",
	"omniroute",
]);
const MODEL_FETCHING_PROVIDERS = new Set([
	"openrouter",
	"requesty",
	"nanogpt",
	"ollama",
	"lmstudio",
	"llamacpp",
	"litellm",
	"omniroute",
]);

export function hasApiModelFetching(templateId: string): boolean {
	return MODEL_FETCHING_PROVIDERS.has(templateId);
}

export function hasApiKeyValidation(templateId: string): boolean {
	return API_KEY_VALIDATION_PROVIDERS.has(templateId);
}

function mapOpenRouterModel(m: OpenRouterModelMeta): ApiModelMeta {
	return {
		id: m.id,
		name: m.name,
		context_length: m.context_length,
		max_output_tokens: m.top_provider?.max_completion_tokens ?? undefined,
		pricing: m.pricing ? { prompt: m.pricing.prompt, completion: m.pricing.completion } : undefined,
		input_modalities: m.architecture?.input_modalities,
		supported_parameters: m.supported_parameters,
		is_moderated: m.top_provider?.is_moderated,
	};
}

export async function fetchApiModels(
	templateId: string,
	apiKey: string,
	customBaseUrl?: string,
): Promise<ApiFetchResult> {
	switch (templateId) {
		case "openrouter": {
			const result = await fetchOpenRouterModels(apiKey);
			if (!result.ok) return result;
			return { ok: true, models: result.models.map(mapOpenRouterModel) };
		}
		case "requesty":
			return fetchRequestyModels(apiKey);
		case "nanogpt":
			return fetchNanoGPTModels(apiKey);
		case "litellm": {
			const baseUrl = customBaseUrl || getTemplate(templateId)?.baseUrl;
			if (!baseUrl) return { ok: false, error: "unknown" };
			return fetchLiteLLMModels(baseUrl, apiKey);
		}
		case "omniroute": {
			const baseUrl = customBaseUrl || getTemplate(templateId)?.baseUrl;
			if (!baseUrl) return { ok: false, error: "unknown" };
			return fetchOmniRouteModels(baseUrl, apiKey);
		}
		case "ollama":
		case "lmstudio":
		case "llamacpp": {
			const baseUrl = customBaseUrl || getTemplate(templateId)?.baseUrl;
			if (!baseUrl) return { ok: false, error: "unknown" };
			if (templateId === "ollama") return fetchOllamaModels(baseUrl);
			if (templateId === "lmstudio") return fetchLMStudioModels(baseUrl);
			return fetchLlamaCppModels(baseUrl);
		}
		default:
			return { ok: false, error: "unknown" };
	}
}

export async function validateApiKey(
	templateId: string,
	apiKey: string,
	customBaseUrl?: string,
): Promise<ApiKeyValidation> {
	switch (templateId) {
		case "openrouter":
			return validateOpenRouterApiKey(apiKey);
		case "requesty":
			return validateRequestyApiKey(apiKey);
		case "nanogpt":
			return validateNanoGPTApiKey(apiKey);
		case "litellm": {
			const baseUrl = customBaseUrl || getTemplate(templateId)?.baseUrl;
			if (!baseUrl) return { valid: false, error: "unknown" };
			return validateLiteLLMApiKey(baseUrl, apiKey);
		}
		case "omniroute": {
			const baseUrl = customBaseUrl || getTemplate(templateId)?.baseUrl;
			if (!baseUrl) return { valid: false, error: "unknown" };
			return validateOmniRouteApiKey(baseUrl, apiKey);
		}
		default:
			return { valid: false, error: "unknown" };
	}
}
