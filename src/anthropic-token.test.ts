import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { getInstallationPath } from "./config.ts";
import {
	buildClaudeEnv,
	getEffectiveModels,
	getEffectiveModelsWithSource,
	getTemplate,
	PROVIDER_TEMPLATES,
	usesNativeModels,
} from "./providers.ts";
import type { ConfiguredProvider } from "./schema.ts";
import { DEFAULT_INSTALLATION_ID } from "./schema.ts";
import { hasApiKeyValidation, hasApiModelFetching } from "./services/api-models.ts";

const provider: ConfiguredProvider = {
	id: "p-token",
	name: "Claude Max",
	templateId: "anthropic-token",
	type: "api",
	apiKey: "  sk-ant-oat01-abc  ",
	apiKeyValid: true,
	models: [],
};

// Inherited vars that would outrank CLAUDE_CODE_OAUTH_TOKEN or pin a model.
const INHERITED: Record<string, string> = {
	ANTHROPIC_API_KEY: "inherited-key",
	ANTHROPIC_AUTH_TOKEN: "inherited-token",
	ANTHROPIC_BASE_URL: "https://gateway.example",
	ANTHROPIC_MODEL: "some-model",
	ANTHROPIC_DEFAULT_SONNET_MODEL: "some-model",
	CLAUDE_CONFIG_DIR: "/somewhere",
	CLAUDE_CODE_OAUTH_TOKEN: "stale-token",
};

let saved: Record<string, string | undefined> = {};
beforeEach(() => {
	saved = {};
	for (const [key, value] of Object.entries(INHERITED)) {
		saved[key] = process.env[key];
		process.env[key] = value;
	}
});
afterEach(() => {
	for (const [key, value] of Object.entries(saved)) {
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
});

describe("anthropic-token template", () => {
	test("comes right after the OAuth template, with native models and no API features", () => {
		const ids = PROVIDER_TEMPLATES.map((tp) => tp.id);
		expect(ids.indexOf("anthropic-token")).toBe(ids.indexOf("anthropic") + 1);
		expect(getTemplate("anthropic-token")?.nativeModels).toBe(true);
		expect(hasApiModelFetching("anthropic-token")).toBe(false);
		expect(hasApiKeyValidation("anthropic-token")).toBe(false);
	});

	test("uses native models", () => {
		expect(usesNativeModels(provider)).toBe(true);
		expect(getEffectiveModels({ ...provider, models: ["x"] })).toEqual([]);
		expect(getEffectiveModelsWithSource({ ...provider, models: ["x"] })).toEqual([]);
	});

	test("buildClaudeEnv sends the trimmed token as CLAUDE_CODE_OAUTH_TOKEN and clears the rest", () => {
		const env = buildClaudeEnv(provider, "", DEFAULT_INSTALLATION_ID, 1_000_000);
		expect(env?.["CLAUDE_CODE_OAUTH_TOKEN"]).toBe("sk-ant-oat01-abc");
		for (const key of [
			"ANTHROPIC_API_KEY",
			"ANTHROPIC_AUTH_TOKEN",
			"ANTHROPIC_BASE_URL",
			"ANTHROPIC_MODEL",
			"ANTHROPIC_DEFAULT_SONNET_MODEL",
			"ANTHROPIC_DEFAULT_OPUS_MODEL",
			"ANTHROPIC_DEFAULT_HAIKU_MODEL",
			"CLAUDE_CODE_SUBAGENT_MODEL",
			"CLAUDE_CONFIG_DIR",
		]) {
			expect(env?.[key], key).toBeUndefined();
		}
	});

	test("buildClaudeEnv points CLAUDE_CONFIG_DIR at a custom installation", () => {
		const env = buildClaudeEnv(provider, "", "abcd1234-work");
		expect(env?.["CLAUDE_CONFIG_DIR"]).toBe(getInstallationPath("abcd1234-work"));
	});
});
