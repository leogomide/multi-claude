import type { ApiFetchResult, ApiKeyValidation, ApiModelMeta } from "./api-models.ts";

interface NanoGPTModelRaw {
	id: string;
	object: string;
	created: number;
	owned_by: string;
}

interface NanoGPTResponse {
	object: string;
	data: NanoGPTModelRaw[];
}

function mapNanoGPTModel(m: NanoGPTModelRaw): ApiModelMeta {
	return {
		id: m.id,
	};
}

export async function fetchNanoGPTModels(apiKey: string): Promise<ApiFetchResult> {
	try {
		const response = await fetch("https://nano-gpt.com/api/v1/models", {
			headers: { Authorization: `Bearer ${apiKey}` },
		});

		if (response.status === 401 || response.status === 403) {
			return { ok: false, error: "auth" };
		}

		if (!response.ok) {
			return { ok: false, error: "unknown" };
		}

		const json = (await response.json()) as NanoGPTResponse;
		const models = json.data.map(mapNanoGPTModel);
		models.sort((a, b) => a.id.localeCompare(b.id));
		return { ok: true, models };
	} catch {
		return { ok: false, error: "network" };
	}
}

export async function validateNanoGPTApiKey(apiKey: string): Promise<ApiKeyValidation> {
	try {
		const response = await fetch("https://nano-gpt.com/api/v1/models", {
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
