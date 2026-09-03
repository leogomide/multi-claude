import { getModelSpec, getProviderBaseUrl, getTemplate } from "../providers.ts";
import type { ConfiguredProvider } from "../schema.ts";
import { fetchCustomModels } from "./custom.ts";
import { fetchLiteLLMModels, validateLiteLLMApiKey } from "./litellm.ts";
import { fetchLlamaCppModels } from "./llamacpp.ts";
import { fetchLMStudioModels } from "./lmstudio.ts";
import { fetchNanoGPTModels, validateNanoGPTApiKey } from "./nanogpt.ts";
import { fetchNineRouterModels, validateNineRouterApiKey } from "./ninerouter.ts";
import { fetchOllamaModels } from "./ollama.ts";
import { fetchOmniRouteModels, validateOmniRouteApiKey } from "./omniroute.ts";
import type { OpenRouterModelMeta } from "./openrouter.ts";
import { fetchOpenRouterModels, validateOpenRouterApiKey } from "./openrouter.ts";
import { fetchRequestyModels, validateRequestyApiKey } from "./requesty.ts";
import { fetchZaiModels, validateZaiApiKey } from "./zai.ts";

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
	"9router",
	"zai",
]);
const MODEL_FETCHING_PROVIDERS = new Set([
	"custom",
	"openrouter",
	"requesty",
	"nanogpt",
	"ollama",
	"lmstudio",
	"llamacpp",
	"litellm",
	"omniroute",
	"9router",
	"zai",
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

function applyModelSpecs(provider: ConfiguredProvider, result: ApiFetchResult): ApiFetchResult {
	if (!result.ok) return result;
	return {
		ok: true,
		models: result.models.map((m) => {
			// The user override wins over everything, including a value the API reported.
			const override = provider.modelSpecs?.[m.id.toLowerCase()];
			if (override) {
				return {
					...m,
					context_length: override.context,
					max_output_tokens: override.maxOutput ?? m.max_output_tokens,
				};
			}
			// Between API and table the API is authoritative; the table only fills gaps.
			if (m.context_length !== undefined) return m;
			const spec = getModelSpec(provider.templateId, m.id);
			if (!spec) return m;
			return {
				...m,
				context_length: spec.context,
				max_output_tokens: m.max_output_tokens ?? spec.maxOutput,
			};
		}),
	};
}

export async function fetchApiModels(provider: ConfiguredProvider): Promise<ApiFetchResult> {
	return applyModelSpecs(
		provider,
		await fetchRaw(provider.templateId, provider.apiKey, getProviderBaseUrl(provider)),
	);
}

async function fetchRaw(
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
		case "custom": {
			// No template fallback: the custom template's baseUrl is "" by design.
			if (!customBaseUrl) return { ok: false, error: "unknown" };
			return fetchCustomModels(customBaseUrl, apiKey);
		}
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
		case "9router": {
			const baseUrl = customBaseUrl || getTemplate(templateId)?.baseUrl;
			if (!baseUrl) return { ok: false, error: "unknown" };
			return fetchNineRouterModels(baseUrl, apiKey);
		}
		case "zai": {
			const baseUrl = customBaseUrl || getTemplate(templateId)?.baseUrl;
			if (!baseUrl) return { ok: false, error: "unknown" };
			return fetchZaiModels(baseUrl, apiKey);
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
		case "9router": {
			const baseUrl = customBaseUrl || getTemplate(templateId)?.baseUrl;
			if (!baseUrl) return { valid: false, error: "unknown" };
			return validateNineRouterApiKey(baseUrl, apiKey);
		}
		case "zai": {
			const baseUrl = customBaseUrl || getTemplate(templateId)?.baseUrl;
			if (!baseUrl) return { valid: false, error: "unknown" };
			return validateZaiApiKey(baseUrl, apiKey);
		}
		default:
			return { valid: false, error: "unknown" };
	}
}
