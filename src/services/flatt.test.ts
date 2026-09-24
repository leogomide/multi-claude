import { afterEach, describe, expect, test } from "vitest";
import { buildClaudeEnv, getTemplate, PROVIDER_TEMPLATES } from "../providers.ts";
import type { ConfiguredProvider } from "../schema.ts";
import { hasApiKeyValidation, hasApiModelFetching } from "./api-models.ts";
import { fetchFlattModels, validateFlattApiKey } from "./flatt.ts";

const BASE_URL = "https://infer.flatt.com.br";

const realFetch = globalThis.fetch;
afterEach(() => {
	globalThis.fetch = realFetch;
});

/** Records every request so header and route assertions can read them back. */
const stubFetch = (handler: (url: string) => Response | Promise<Response>) => {
	const calls: Array<{ url: string; headers: Record<string, string> }> = [];
	globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
		const url = String(input);
		calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
		return handler(url);
	}) as typeof fetch;
	return calls;
};

const jsonResponse = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

// Shape returned by the live endpoint (trimmed to the fields we read plus a few we ignore).
const liveModel = (id: string) => ({
	id,
	object: "model",
	owned_by: "flatt",
	max_input_tokens: 262_144,
	max_output_tokens: 131_072,
	architecture: { input_modalities: ["text", "image"], output_modalities: ["text"] },
	supported_parameters: ["reasoning", "reasoning_effort", "tools", "tool_choice"],
});

describe("flatt template", () => {
	test("is the first template, flagged as sponsor", () => {
		expect(PROVIDER_TEMPLATES[0]?.id).toBe("flatt");
		expect(getTemplate("flatt")?.sponsor?.url).toMatch(/^https:\/\/flatt\.com\.br\//);
		expect(getTemplate("flatt")?.baseUrl).toBe(BASE_URL);
	});

	test("fetches models and validates the key through the API", () => {
		expect(hasApiModelFetching("flatt")).toBe(true);
		expect(hasApiKeyValidation("flatt")).toBe(true);
	});

	test("buildClaudeEnv authenticates with ANTHROPIC_AUTH_TOKEN", () => {
		const provider: ConfiguredProvider = {
			id: "p-flatt",
			name: "Flatt",
			templateId: "flatt",
			type: "api",
			apiKey: "flatt-key",
			apiKeyValid: true,
			models: [],
		};
		const savedMax = process.env["CLAUDE_CODE_MAX_CONTEXT_TOKENS"];
		delete process.env["CLAUDE_CODE_MAX_CONTEXT_TOKENS"];
		try {
			const env = buildClaudeEnv(provider, "glm-5.3-flash", undefined, 262_144);
			expect(env?.["ANTHROPIC_BASE_URL"]).toBe(BASE_URL);
			expect(env?.["ANTHROPIC_AUTH_TOKEN"]).toBe("flatt-key");
			expect(env?.["ANTHROPIC_API_KEY"]).toBeUndefined();
			expect(env?.["API_TIMEOUT_MS"]).toBe("600000");
			expect(env?.["ANTHROPIC_MODEL"]).toBe("glm-5.3-flash");
			expect(env?.["CLAUDE_CODE_MAX_CONTEXT_TOKENS"]).toBe("262144");
		} finally {
			if (savedMax !== undefined) process.env["CLAUDE_CODE_MAX_CONTEXT_TOKENS"] = savedMax;
		}
	});
});

describe("fetchFlattModels", () => {
	test("maps context, output cap, modalities and parameters, sorted by id", async () => {
		stubFetch(() =>
			jsonResponse({
				object: "list",
				data: [liveModel("qwen3.8-27b"), liveModel("glm-5.3-flash")],
			}),
		);
		const result = await fetchFlattModels(BASE_URL, "k");
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.models.map((m) => m.id)).toEqual(["glm-5.3-flash", "qwen3.8-27b"]);
		expect(result.models[0]).toEqual({
			id: "glm-5.3-flash",
			name: "glm-5.3-flash",
			context_length: 262_144,
			max_output_tokens: 131_072,
			input_modalities: ["text", "image"],
			supported_parameters: ["reasoning", "reasoning_effort", "tools", "tool_choice"],
		});
	});

	test("sends the key as a Bearer token to /v1/models, trimming trailing slashes", async () => {
		const calls = stubFetch(() => jsonResponse({ data: [] }));
		await fetchFlattModels(`${BASE_URL}//`, "secret");
		expect(calls[0]?.url).toBe(`${BASE_URL}/v1/models`);
		expect(calls[0]?.headers.Authorization).toBe("Bearer secret");
	});

	test("classifies failures", async () => {
		stubFetch(() => jsonResponse({ error: { type: "auth_error", code: "401" } }, 401));
		expect(await fetchFlattModels(BASE_URL, "k")).toEqual({ ok: false, error: "auth" });

		stubFetch(() => jsonResponse({}, 500));
		expect(await fetchFlattModels(BASE_URL, "k")).toEqual({ ok: false, error: "unknown" });

		stubFetch(() => jsonResponse({ object: "list" }));
		expect(await fetchFlattModels(BASE_URL, "k")).toEqual({ ok: false, error: "unknown" });

		stubFetch(() => {
			throw new TypeError("fetch failed");
		});
		expect(await fetchFlattModels(BASE_URL, "k")).toEqual({ ok: false, error: "network" });
	});
});

describe("validateFlattApiKey", () => {
	test("rejects an empty key without a request, since /v1/models is public", async () => {
		const calls = stubFetch(() => jsonResponse({ data: [] }));
		expect(await validateFlattApiKey(BASE_URL, "  ")).toEqual({ valid: false, error: "auth" });
		expect(calls).toHaveLength(0);
	});

	test("accepts a key the API takes and rejects one it refuses", async () => {
		stubFetch(() => jsonResponse({ data: [liveModel("glm-5.3-flash")] }));
		expect(await validateFlattApiKey(BASE_URL, "good")).toEqual({ valid: true });

		stubFetch(() => jsonResponse({}, 401));
		expect(await validateFlattApiKey(BASE_URL, "bad")).toEqual({ valid: false, error: "auth" });
	});
});
