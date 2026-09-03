import type { ApiFetchResult, ApiModelError, ApiModelMeta } from "./api-models.ts";

interface CustomModelRaw {
	id: string;
	name?: string;
	display_name?: string;
	// Gateways disagree on how to name the context window; read them all.
	context_length?: number;
	context_window?: number;
	max_context_length?: number;
	max_input_tokens?: number;
	max_model_len?: number;
	max_output_tokens?: number;
	max_tokens?: number;
	max_completion_tokens?: number;
	top_provider?: { context_length?: number; max_completion_tokens?: number };
	meta?: { n_ctx_train?: number };
	model_info?: Record<string, number | undefined>;
}

interface CustomModelsResponse {
	data?: CustomModelRaw[];
	// Some Anthropic-compatible gateways answer auth failures with HTTP 200
	// and the error inside the body (verified on Z.AI, plan 002-A).
	code?: string | number;
	msg?: string;
	success?: boolean;
	error?: { code?: string | number; message?: string };
}

function customHeaders(apiKey: string): Record<string, string> {
	const headers: Record<string, string> = { "anthropic-version": "2023-06-01" };
	// Gateways disagree on the auth header; sending both covers either one.
	if (apiKey) {
		headers.Authorization = `Bearer ${apiKey}`;
		headers["x-api-key"] = apiKey;
	}
	return headers;
}

function classifyErrorCode(code: string | number | undefined): ApiModelError {
	const n = Number(code);
	return n === 401 || n === 403 ? "auth" : "unknown";
}

function firstPositive(...values: Array<number | undefined>): number | undefined {
	for (const v of values) {
		if (typeof v === "number" && Number.isFinite(v) && v > 0) return Math.round(v);
	}
	return undefined;
}

function readContextLength(m: CustomModelRaw): number | undefined {
	return firstPositive(
		m.context_length, // OpenRouter, NanoGPT-like
		m.context_window, // Requesty
		m.max_context_length, // LM Studio
		m.max_input_tokens, // LiteLLM
		m.max_model_len, // vLLM
		m.top_provider?.context_length,
		m.meta?.n_ctx_train, // llama.cpp
		m.model_info?.max_input_tokens, // LiteLLM behind /v1/models
	);
}

function readMaxOutput(m: CustomModelRaw): number | undefined {
	return firstPositive(
		m.max_output_tokens,
		m.max_completion_tokens,
		m.top_provider?.max_completion_tokens,
		m.max_tokens,
		m.model_info?.max_output_tokens,
	);
}

async function requestModels(url: string, apiKey: string): Promise<Response | null> {
	try {
		return await fetch(url, { headers: customHeaders(apiKey) });
	} catch {
		return null;
	}
}

export async function fetchCustomModels(baseUrl: string, apiKey: string): Promise<ApiFetchResult> {
	const root = baseUrl.replace(/\/+$/, "");

	let response = await requestModels(`${root}/v1/models`, apiKey);
	if (response === null) return { ok: false, error: "network" };

	// Base URLs that already end in /v1 expose the list at /models (OmniRoute, 9Router).
	if (response.status === 404) {
		const alt = await requestModels(`${root}/models`, apiKey);
		if (alt !== null) response = alt;
	}

	if (response.status === 401 || response.status === 403) {
		return { ok: false, error: "auth" };
	}

	const json = (await response.json().catch(() => null)) as CustomModelsResponse | null;

	if (!json || !Array.isArray(json.data)) {
		if (!response.ok) return { ok: false, error: "unknown" };
		return { ok: false, error: classifyErrorCode(json?.code ?? json?.error?.code) };
	}

	const models = json.data
		.filter((m) => typeof m?.id === "string" && m.id.length > 0)
		.map(
			(m): ApiModelMeta => ({
				id: m.id,
				name: m.display_name ?? m.name ?? m.id,
				context_length: readContextLength(m),
				max_output_tokens: readMaxOutput(m),
			}),
		);
	models.sort((a, b) => a.id.localeCompare(b.id));
	return { ok: true, models };
}
