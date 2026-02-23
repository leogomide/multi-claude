import type { ApiFetchResult, ApiModelMeta } from "./api-models.ts";

interface OllamaModelDetails {
	format?: string;
	family?: string;
	families?: string[];
	parameter_size?: string;
	quantization_level?: string;
}

interface OllamaModel {
	name: string;
	model: string;
	modified_at: string;
	size: number;
	digest: string;
	details: OllamaModelDetails;
}

interface OllamaTagsResponse {
	models: OllamaModel[];
}

function mapOllamaModel(m: OllamaModel): ApiModelMeta {
	return {
		id: m.name,
		name: m.name,
		parameter_size: m.details.parameter_size,
		quantization: m.details.quantization_level,
		architecture: m.details.family,
		file_size: m.size,
	};
}

export async function fetchOllamaModels(baseUrl: string): Promise<ApiFetchResult> {
	try {
		const url = `${baseUrl.replace(/\/+$/, "")}/api/tags`;
		const response = await fetch(url);

		if (!response.ok) {
			return { ok: false, error: "unknown" };
		}

		const json = (await response.json()) as OllamaTagsResponse;
		const models = (json.models ?? []).map(mapOllamaModel);
		models.sort((a, b) => a.id.localeCompare(b.id));
		return { ok: true, models };
	} catch {
		return { ok: false, error: "network" };
	}
}
