import type { ApiFetchResult, ApiKeyValidation, ApiModelMeta } from "./api-models.ts";

interface OmniRouteModelRaw {
	id: string;
	object: string;
	created: number;
	owned_by: string;
}

interface OmniRouteModelsResponse {
	object: string;
	data: OmniRouteModelRaw[];
}

function mapOmniRouteModel(m: OmniRouteModelRaw): ApiModelMeta {
	return {
		id: m.id,
		name: m.id,
	};
}

export async function fetchOmniRouteModels(
	baseUrl: string,
	apiKey: string,
): Promise<ApiFetchResult> {
	try {
		const url = `${baseUrl.replace(/\/+$/, "")}/models`;
		const response = await fetch(url, {
			headers: { Authorization: `Bearer ${apiKey}` },
		});

		if (response.status === 401 || response.status === 403) {
			return { ok: false, error: "auth" };
		}

		if (!response.ok) {
			return { ok: false, error: "unknown" };
		}

		const json = (await response.json()) as OmniRouteModelsResponse;
		const models = (json.data ?? []).map(mapOmniRouteModel);
		models.sort((a, b) => a.id.localeCompare(b.id));
		return { ok: true, models };
	} catch {
		return { ok: false, error: "network" };
	}
}

export async function validateOmniRouteApiKey(
	baseUrl: string,
	apiKey: string,
): Promise<ApiKeyValidation> {
	try {
		const url = `${baseUrl.replace(/\/+$/, "")}/models`;
		const response = await fetch(url, {
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
