import type { ApiFetchResult, ApiModelMeta } from "./api-models.ts";

interface LlamaCppModelMeta {
	vocab_type?: number;
	n_vocab?: number;
	n_ctx_train?: number;
	n_embd?: number;
	n_params?: number;
	size?: number;
}

interface LlamaCppModel {
	id: string;
	object: string;
	created: number;
	owned_by: string;
	meta?: LlamaCppModelMeta;
}

interface LlamaCppModelsResponse {
	object: string;
	data: LlamaCppModel[];
}

function formatParamCount(n: number): string {
	if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
	if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
	if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M`;
	return String(n);
}

function mapLlamaCppModel(m: LlamaCppModel): ApiModelMeta {
	return {
		id: m.id,
		name: m.id,
		context_length: m.meta?.n_ctx_train,
		parameter_size: m.meta?.n_params != null ? formatParamCount(m.meta.n_params) : undefined,
		file_size: m.meta?.size,
	};
}

export async function fetchLlamaCppModels(baseUrl: string): Promise<ApiFetchResult> {
	try {
		const url = `${baseUrl.replace(/\/+$/, "")}/v1/models`;
		const response = await fetch(url);

		if (!response.ok) {
			return { ok: false, error: "unknown" };
		}

		const json = (await response.json()) as LlamaCppModelsResponse;
		const models = (json.data ?? []).map(mapLlamaCppModel);
		models.sort((a, b) => a.id.localeCompare(b.id));
		return { ok: true, models };
	} catch {
		return { ok: false, error: "network" };
	}
}
