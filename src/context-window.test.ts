import { afterEach, describe, expect, test } from "bun:test";
import {
	buildClaudeEnv,
	getEffectiveModels,
	getEffectiveModelsWithSource,
	getModelSpec,
	resolveModelSpec,
} from "./providers.ts";
import type { ConfiguredProvider } from "./schema.ts";
import { configuredProviderSchema } from "./schema.ts";
import { hasApiKeyValidation, hasApiModelFetching } from "./services/api-models.ts";
import { fetchCustomModels } from "./services/custom.ts";
import { ignoresContextWindow, parseContextWindow } from "./utils/validate-context.ts";

// ── Fixtures ─────────────────────────────────────────────────────────

const base: ConfiguredProvider = {
	id: "p1",
	name: "Test",
	templateId: "zai",
	type: "api",
	apiKey: "k",
	apiKeyValid: true,
	models: [],
};

const withOverride: ConfiguredProvider = {
	...base,
	modelSpecs: { "glm-4.7": { context: 500_000 } },
};

// ── parseContextWindow ───────────────────────────────────────────────

describe("parseContextWindow", () => {
	const accepted: Array<[string, number]> = [
		["128000", 128_000],
		["128k", 128_000],
		["128K", 128_000],
		["1M", 1_000_000],
		["1m", 1_000_000],
		["128_000", 128_000],
		["1.048.576", 1_048_576],
		["1,048,576", 1_048_576],
		["  200000  ", 200_000],
	];
	for (const [input, expected] of accepted) {
		test(`"${input}" -> ${expected}`, () => {
			expect(parseContextWindow(input)).toBe(expected);
		});
	}

	const rejected = ["", "   ", "abc", "12x", "-5", "k", "0", "1e6", "128kk"];
	for (const input of rejected) {
		test(`"${input}" -> undefined`, () => {
			expect(parseContextWindow(input)).toBeUndefined();
		});
	}

	test("separators are stripped before parsing, so a decimal suffix collapses", () => {
		// Documented quirk: stripping "." is what makes "1.048.576" work, and it also
		// turns "1.5M" into "15M". The canonical form is the full number.
		expect(parseContextWindow("1.5M")).toBe(15_000_000);
	});
});

// ── ignoresContextWindow ─────────────────────────────────────────────

describe("ignoresContextWindow", () => {
	test("claude- prefixed ids are ignored by Claude Code (RN-11)", () => {
		expect(ignoresContextWindow("claude-sonnet-4.5")).toBe(true);
		expect(ignoresContextWindow("Claude-Opus-4.5")).toBe(true);
		expect(ignoresContextWindow("  claude-haiku-4.5  ")).toBe(true);
	});

	test("every other id is honoured", () => {
		expect(ignoresContextWindow("glm-5.3")).toBe(false);
		expect(ignoresContextWindow("my-model")).toBe(false);
		expect(ignoresContextWindow("anthropic/claude-sonnet-4.5")).toBe(false);
		expect(ignoresContextWindow("")).toBe(false);
	});
});

// ── resolveModelSpec ─────────────────────────────────────────────────

describe("resolveModelSpec", () => {
	test("the user override wins over the template table (RN-01)", () => {
		expect(getModelSpec("zai", "GLM-4.7")?.context).toBe(204_800);
		expect(resolveModelSpec(withOverride, "GLM-4.7")?.context).toBe(500_000);
	});

	test("lookup is case-insensitive both ways (RN-03)", () => {
		expect(resolveModelSpec(withOverride, "glm-4.7")?.context).toBe(500_000);
		expect(resolveModelSpec(withOverride, "GLM-4.7")?.context).toBe(500_000);
	});

	test("without an override it falls back to the table (RN-02)", () => {
		expect(resolveModelSpec(base, "GLM-5.3")).toEqual({
			context: 1_048_576,
			maxOutput: 131_072,
		});
	});

	test("an override does not leak onto another model", () => {
		expect(resolveModelSpec(withOverride, "GLM-5.3")?.context).toBe(1_048_576);
	});

	test("no source at all resolves to undefined (RN-02)", () => {
		expect(resolveModelSpec(base, "glm-9")).toBeUndefined();
	});

	test("a provider without a table stays undefined", () => {
		const deepseek: ConfiguredProvider = { ...base, templateId: "deepseek" };
		expect(resolveModelSpec(deepseek, "deepseek-chat")).toBeUndefined();
	});

	test("an override works on a provider with no table at all — the point of the plan", () => {
		const custom: ConfiguredProvider = {
			...base,
			templateId: "custom",
			modelSpecs: { "my-model": { context: 262_144 } },
		};
		expect(resolveModelSpec(custom, "my-model")?.context).toBe(262_144);
		expect(resolveModelSpec(custom, "MY-MODEL")?.context).toBe(262_144);
	});

	test("maxOutput rides along when the override carries one", () => {
		const provider: ConfiguredProvider = {
			...base,
			modelSpecs: { "glm-4.7": { context: 500_000, maxOutput: 64_000 } },
		};
		expect(resolveModelSpec(provider, "glm-4.7")).toEqual({
			context: 500_000,
			maxOutput: 64_000,
		});
	});
});

// ── getEffectiveModelsWithSource ─────────────────────────────────────

describe("getEffectiveModelsWithSource", () => {
	test("the override reaches a model that is a template default (RN-06)", () => {
		const item = getEffectiveModelsWithSource(withOverride).find((m) => m.name === "GLM-4.7");
		expect(item?.source).toBe("default");
		expect(item?.meta?.context_length).toBe(500_000);
	});

	test("models without an override keep the table value (RN-02)", () => {
		const item = getEffectiveModelsWithSource(withOverride).find((m) => m.name === "GLM-5.3");
		expect(item?.meta?.context_length).toBe(1_048_576);
	});

	test("a user model of a provider without a table gets its override", () => {
		const custom: ConfiguredProvider = {
			...base,
			templateId: "custom",
			models: ["my-model"],
			modelSpecs: { "my-model": { context: 262_144 } },
		};
		const item = getEffectiveModelsWithSource(custom).find((m) => m.name === "my-model");
		expect(item?.source).toBe("user");
		expect(item?.meta?.context_length).toBe(262_144);
	});
});

// ── custom provider registration ─────────────────────────────────────

describe("custom provider registration", () => {
	test("the custom template fetches its models over the API", () => {
		// The add-provider wizard only makes the model id optional because of this.
		// Drop "custom" from MODEL_FETCHING_PROVIDERS and the wizard would let a user
		// save a provider with no models and no way to discover any.
		expect(hasApiModelFetching("custom")).toBe(true);
	});

	test("the custom template never validates the key", () => {
		// Registration must not be blocked by an arbitrary gateway's error semantics.
		expect(hasApiKeyValidation("custom")).toBe(false);
	});

	test("a custom provider with no models resolves to an empty list", () => {
		// This is the precondition the launch flow checks before refusing to advance.
		const empty: ConfiguredProvider = { ...base, templateId: "custom", models: [] };
		expect(getEffectiveModels(empty)).toEqual([]);
		expect(getEffectiveModelsWithSource(empty)).toEqual([]);
	});
});

// ── schema ───────────────────────────────────────────────────────────

describe("configuredProviderSchema modelSpecs", () => {
	test("a config without modelSpecs still parses — no migration needed (RN-10)", () => {
		const parsed = configuredProviderSchema.parse({
			id: "p",
			name: "Old",
			templateId: "zai",
			apiKey: "k",
			models: ["GLM-4.7"],
		});
		expect(parsed.modelSpecs).toBeUndefined();
	});

	test("a valid override round-trips", () => {
		const parsed = configuredProviderSchema.parse({
			id: "p",
			name: "New",
			templateId: "custom",
			apiKey: "k",
			models: ["my-model"],
			modelSpecs: { "my-model": { context: 262_144, maxOutput: 8192 } },
		});
		expect(parsed.modelSpecs?.["my-model"]).toEqual({ context: 262_144, maxOutput: 8192 });
	});

	test("a non-positive context is rejected", () => {
		const result = configuredProviderSchema.safeParse({
			id: "p",
			name: "Bad",
			templateId: "custom",
			apiKey: "k",
			models: [],
			modelSpecs: { "my-model": { context: 0 } },
		});
		expect(result.success).toBe(false);
	});
});

// ── buildClaudeEnv ───────────────────────────────────────────────────

describe("buildClaudeEnv context window", () => {
	const savedMax = process.env["CLAUDE_CODE_MAX_CONTEXT_TOKENS"];
	const savedCompact = process.env["CLAUDE_CODE_AUTO_COMPACT_WINDOW"];

	afterEach(() => {
		if (savedMax === undefined) delete process.env["CLAUDE_CODE_MAX_CONTEXT_TOKENS"];
		else process.env["CLAUDE_CODE_MAX_CONTEXT_TOKENS"] = savedMax;
		if (savedCompact === undefined) delete process.env["CLAUDE_CODE_AUTO_COMPACT_WINDOW"];
		else process.env["CLAUDE_CODE_AUTO_COMPACT_WINDOW"] = savedCompact;
	});

	const build = (tokens?: number, provider: ConfiguredProvider = base) => {
		delete process.env["CLAUDE_CODE_MAX_CONTEXT_TOKENS"];
		delete process.env["CLAUDE_CODE_AUTO_COMPACT_WINDOW"];
		return buildClaudeEnv(provider, "GLM-4.7", undefined, tokens);
	};

	test("a known window sets both vars, the compaction budget derived at 0.8", () => {
		const env = build(1_048_576);
		expect(env?.["CLAUDE_CODE_MAX_CONTEXT_TOKENS"]).toBe("1048576");
		expect(env?.["CLAUDE_CODE_AUTO_COMPACT_WINDOW"]).toBe("838861");
	});

	test("the compaction budget clamps at the 100k floor", () => {
		const env = build(65_536);
		expect(env?.["CLAUDE_CODE_MAX_CONTEXT_TOKENS"]).toBe("65536");
		expect(env?.["CLAUDE_CODE_AUTO_COMPACT_WINDOW"]).toBe("100000");
	});

	test("the compaction budget clamps at the 1M ceiling", () => {
		const env = build(2_000_000);
		expect(env?.["CLAUDE_CODE_MAX_CONTEXT_TOKENS"]).toBe("2000000");
		expect(env?.["CLAUDE_CODE_AUTO_COMPACT_WINDOW"]).toBe("1000000");
	});

	test("no window sets neither var (RN-04/RN-07)", () => {
		const env = build(undefined);
		expect(env?.["CLAUDE_CODE_MAX_CONTEXT_TOKENS"]).toBeUndefined();
		expect(env?.["CLAUDE_CODE_AUTO_COMPACT_WINDOW"]).toBeUndefined();
	});

	test("a zero window sets neither var", () => {
		const env = build(0);
		expect(env?.["CLAUDE_CODE_MAX_CONTEXT_TOKENS"]).toBeUndefined();
		expect(env?.["CLAUDE_CODE_AUTO_COMPACT_WINDOW"]).toBeUndefined();
	});

	test("a value already in the environment wins (RN-08)", () => {
		delete process.env["CLAUDE_CODE_AUTO_COMPACT_WINDOW"];
		process.env["CLAUDE_CODE_MAX_CONTEXT_TOKENS"] = "123456";
		const env = buildClaudeEnv(base, "GLM-4.7", undefined, 1_048_576);
		expect(env?.["CLAUDE_CODE_MAX_CONTEXT_TOKENS"]).toBe("123456");
		// The derived budget still comes from the resolved window, not from the override.
		expect(env?.["CLAUDE_CODE_AUTO_COMPACT_WINDOW"]).toBe("838861");
	});

	test("an OAuth provider never gets the vars", () => {
		const oauth: ConfiguredProvider = {
			...base,
			id: "p-oauth",
			templateId: "anthropic",
			type: "oauth",
		};
		const env = build(1_048_576, oauth);
		expect(env?.["CLAUDE_CODE_MAX_CONTEXT_TOKENS"]).toBeUndefined();
		expect(env?.["CLAUDE_CODE_AUTO_COMPACT_WINDOW"]).toBeUndefined();
	});

	test("an unknown template returns null", () => {
		const env = build(1_048_576, { ...base, templateId: "nope" });
		expect(env).toBeNull();
	});
});

// ── fetchCustomModels ────────────────────────────────────────────────

describe("fetchCustomModels", () => {
	const realFetch = globalThis.fetch;
	afterEach(() => {
		globalThis.fetch = realFetch;
	});

	/** Records every request so header and route assertions can read them back. */
	const stubFetch = (
		handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
	) => {
		const calls: Array<{ url: string; headers: Record<string, string> }> = [];
		globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
			const url = String(input);
			calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
			return handler(url, init);
		}) as typeof fetch;
		return calls;
	};

	const jsonResponse = (body: unknown, status = 200) =>
		new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

	test("reads the context window from every alias a gateway may use", async () => {
		stubFetch(() =>
			jsonResponse({
				data: [
					{ id: "a-openrouter", context_length: 128_000 },
					{ id: "b-requesty", context_window: 200_000 },
					{ id: "c-lmstudio", max_context_length: 262_144 },
					{ id: "d-litellm", max_input_tokens: 131_072 },
					{ id: "e-vllm", max_model_len: 32_768 },
					{ id: "f-topprovider", top_provider: { context_length: 65_536 } },
					{ id: "g-llamacpp", meta: { n_ctx_train: 8192 } },
					{ id: "h-modelinfo", model_info: { max_input_tokens: 16_384 } },
				],
			}),
		);
		const result = await fetchCustomModels("http://gw.test", "k");
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.models.map((m) => m.context_length)).toEqual([
			128_000, 200_000, 262_144, 131_072, 32_768, 65_536, 8192, 16_384,
		]);
	});

	test("reads the output cap from its own set of aliases", async () => {
		stubFetch(() =>
			jsonResponse({
				data: [
					{ id: "a", max_output_tokens: 8192 },
					{ id: "b", max_completion_tokens: 4096 },
					{ id: "c", top_provider: { max_completion_tokens: 2048 } },
					{ id: "d", max_tokens: 1024 },
				],
			}),
		);
		const result = await fetchCustomModels("http://gw.test", "k");
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.models.map((m) => m.max_output_tokens)).toEqual([8192, 4096, 2048, 1024]);
	});

	test("a model without any alias stays in the list with no window", async () => {
		stubFetch(() => jsonResponse({ data: [{ id: "bare" }] }));
		const result = await fetchCustomModels("http://gw.test", "k");
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.models).toHaveLength(1);
		expect(result.models[0]?.id).toBe("bare");
		expect(result.models[0]?.context_length).toBeUndefined();
	});

	test("a zero or negative window is treated as absent", async () => {
		stubFetch(() => jsonResponse({ data: [{ id: "z", context_length: 0, max_model_len: -1 }] }));
		const result = await fetchCustomModels("http://gw.test", "k");
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.models[0]?.context_length).toBeUndefined();
	});

	test("models come back sorted by id and entries without an id are dropped", async () => {
		stubFetch(() => jsonResponse({ data: [{ id: "zeta" }, { id: "" }, {}, { id: "alpha" }] }));
		const result = await fetchCustomModels("http://gw.test", "k");
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.models.map((m) => m.id)).toEqual(["alpha", "zeta"]);
	});

	test("both auth headers go out when a key is set", async () => {
		const calls = stubFetch(() => jsonResponse({ data: [] }));
		await fetchCustomModels("http://gw.test", "secret");
		expect(calls[0]?.headers["Authorization"]).toBe("Bearer secret");
		expect(calls[0]?.headers["x-api-key"]).toBe("secret");
		expect(calls[0]?.headers["anthropic-version"]).toBe("2023-06-01");
	});

	test("no auth header goes out when the key is empty", async () => {
		const calls = stubFetch(() => jsonResponse({ data: [] }));
		await fetchCustomModels("http://gw.test", "");
		expect(calls[0]?.headers["Authorization"]).toBeUndefined();
		expect(calls[0]?.headers["x-api-key"]).toBeUndefined();
	});

	test("a trailing slash in the base URL does not double up", async () => {
		const calls = stubFetch(() => jsonResponse({ data: [] }));
		await fetchCustomModels("http://gw.test///", "k");
		expect(calls[0]?.url).toBe("http://gw.test/v1/models");
	});

	test("a 404 on /v1/models falls back to /models", async () => {
		const calls = stubFetch((url) =>
			url === "http://gw.test/v1/v1/models"
				? jsonResponse({ error: "not found" }, 404)
				: jsonResponse({ data: [{ id: "found", context_length: 4096 }] }),
		);
		const result = await fetchCustomModels("http://gw.test/v1", "k");
		expect(calls.map((c) => c.url)).toEqual([
			"http://gw.test/v1/v1/models",
			"http://gw.test/v1/models",
		]);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.models[0]?.id).toBe("found");
	});

	test("an unreachable host is a network error", async () => {
		stubFetch(() => {
			throw new Error("ECONNREFUSED");
		});
		expect(await fetchCustomModels("http://gw.test", "k")).toEqual({
			ok: false,
			error: "network",
		});
	});

	test("an HTTP 401 is an auth error", async () => {
		stubFetch(() => jsonResponse({ error: "nope" }, 401));
		expect(await fetchCustomModels("http://gw.test", "k")).toEqual({ ok: false, error: "auth" });
	});

	test("an auth error inside a 200 body is still an auth error", async () => {
		stubFetch(() => jsonResponse({ code: 401, msg: "invalid key" }));
		expect(await fetchCustomModels("http://gw.test", "k")).toEqual({ ok: false, error: "auth" });
	});

	test("a host answering HTML is an unknown error", async () => {
		stubFetch(() => new Response("<html>hi</html>", { status: 200 }));
		expect(await fetchCustomModels("http://gw.test", "k")).toEqual({
			ok: false,
			error: "unknown",
		});
	});

	test("a 500 is an unknown error", async () => {
		stubFetch(() => new Response("boom", { status: 500 }));
		expect(await fetchCustomModels("http://gw.test", "k")).toEqual({
			ok: false,
			error: "unknown",
		});
	});
});
