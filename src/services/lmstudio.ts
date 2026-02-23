import type { ApiFetchResult, ApiModelMeta } from "./api-models.ts";

interface LMStudioQuantization {
	name?: string;
	bits_per_weight?: number;
}

interface LMStudioCapabilities {
	vision?: boolean;
	trained_for_tool_use?: boolean;
}

interface LMStudioModel {
	type: string;
	publisher: string;
	key: string;
	display_name?: string;
	size_bytes?: number;
	params_string?: string;
	max_context_length?: number;
	format?: string;
	architecture?: string;
	quantization?: LMStudioQuantization;
	capabilities?: LMStudioCapabilities;
	description?: string;
}

interface LMStudioModelsResponse {
	models: LMStudioModel[];
}

function mapLMStudioModel(m: LMStudioModel): ApiModelMeta {
	const modalities: string[] = ["text"];
	if (m.capabilities?.vision) modalities.push("image");

	const params: string[] = [];
	if (m.capabilities?.trained_for_tool_use) params.push("tools");

	return {
		id: m.key,
		name: m.display_name ?? m.key,
		context_length: m.max_context_length,
		parameter_size: m.params_string ?? undefined,
		quantization: m.quantization?.name ?? undefined,
		architecture: m.architecture ?? undefined,
		file_size: m.size_bytes,
		input_modalities: modalities,
		supported_parameters: params.length > 0 ? params : undefined,
	};
}

export async function fetchLMStudioModels(baseUrl: string): Promise<ApiFetchResult> {
	try {
		const url = `${baseUrl.replace(/\/+$/, "")}/api/v1/models`;
		const response = await fetch(url);

		if (!response.ok) {
			return { ok: false, error: "unknown" };
		}

		const json = (await response.json()) as LMStudioModelsResponse;
		const models = (json.models ?? []).map(mapLMStudioModel);
		models.sort((a, b) => a.id.localeCompare(b.id));
		return { ok: true, models };
	} catch {
		return { ok: false, error: "network" };
	}
}
