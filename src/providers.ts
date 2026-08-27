import { getInstallationPath, readOAuthCredentials } from "./config.ts";
import type { ConfiguredProvider, EnvConfigurator, ProviderTemplate } from "./schema.ts";
import { DEFAULT_INSTALLATION_ID } from "./schema.ts";
import type { ApiModelMeta } from "./services/api-models.ts";

export const PROVIDER_TEMPLATES: ProviderTemplate[] = [
	{
		id: "anthropic",
		description: "Anthropic (OAuth)",
		baseUrl: "",
		defaultModels: [],
		env: {},
		configureEnv() {
			// no-op: OAuth accounts use CLAUDE_CONFIG_DIR, not env-based auth
		},
	},
	{
		// https://www.alibabacloud.com/help/en/model-studio/coding-plan
		id: "alibaba-coding",
		description: "Alibaba Cloud (Coding Plan)",
		baseUrl: "https://coding-intl.dashscope.aliyuncs.com/apps/anthropic",
		defaultModels: [
			"qwen3-coder-next",
			"qwen3-coder-plus",
			"qwen3.5-plus",
			"qwen3-max-2026-01-23",
			"glm-5",
			"glm-4.7",
			"kimi-k2.5",
			"MiniMax-M2.5",
		],
		env: {
			CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
		},
	},
	{
		// https://api-docs.deepseek.com/guides/anthropic_api
		id: "deepseek",
		description: "DeepSeek",
		baseUrl: "https://api.deepseek.com/anthropic",
		defaultModels: ["deepseek-chat", "deepseek-reasoner"],
		env: {
			API_TIMEOUT_MS: "600000",
			CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
		},
	},
	{
		// https://www.kimi.com/code/docs/en/more/third-party-agents.html
		id: "kimi-code",
		description: "Kimi Code",
		baseUrl: "https://api.kimi.com/coding/",
		defaultModels: ["kimi-for-coding"],
		env: {
			CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
			ENABLE_TOOL_SEARCH: "false",
		},
	},
	{
		// https://platform.minimax.io/docs/coding-plan/claude-code
		id: "minimax",
		description: "MiniMax",
		baseUrl: "https://api.minimax.io/anthropic",
		defaultModels: [
			"MiniMax-M2.7",
			"MiniMax-M2.7-highspeed",
			"MiniMax-M2.5-highspeed",
			"MiniMax-M2.5",
			"MiniMax-M2.1",
			"MiniMax-M2",
		],
		env: {
			CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
		},
	},
	{
		// https://platform.moonshot.ai/docs/guide/agent-support#configure-environment-variables-1
		id: "moonshot",
		description: "Moonshot AI",
		baseUrl: "https://api.moonshot.ai/anthropic",
		defaultModels: [
			"kimi-k2.5",
			"kimi-k2-0905-preview",
			"kimi-k2-0711-preview",
			"kimi-k2-turbo-preview",
			"kimi-k2-thinking",
			"kimi-k2-thinking-turbo",
		],
		env: {
			CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
		},
	},
	{
		// https://docs.nano-gpt.com/integrations/claude-code
		id: "nanogpt",
		description: "NanoGPT",
		baseUrl: "https://nano-gpt.com/api/v1",
		defaultModels: [],
		env: {
			CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
		},
	},
	{
		// https://novita.ai/docs/guides/claude-code
		// https://novita.ai/docs/guides/llm-anthropic-compatibility#supported-models
		id: "novita",
		description: "Novita AI",
		baseUrl: "https://api.novita.ai/anthropic",
		defaultModels: [
			"deepseek/deepseek-v3.2",
			"deepseek/deepseek-v3.2-exp",
			"deepseek/deepseek-v3.1-terminus",
			"deepseek/deepseek-v3.1",
			"deepseek/deepseek-v3-0324",
			"minimax/minimax-m2.5",
			"minimax/minimax-m2.1",
			"minimax/minimax-m2",
			"moonshotai/kimi-k2.5",
			"moonshotai/kimi-k2-thinking",
			"moonshotai/kimi-k2-0905",
			"moonshotai/kimi-k2-instruct",
			"qwen/qwen3-coder-next",
			"qwen/qwen3-coder-480b-a35b-instruct",
			"qwen/qwen3-next-80b-a3b-instruct",
			"qwen/qwen3-next-80b-a3b-thinking",
			"qwen/qwen3-235b-a22b-thinking-2507",
			"zai-org/glm-5",
			"zai-org/glm-4.7",
			"zai-org/glm-4.6v",
			"zai-org/glm-4.6",
			"xiaomimimo/mimo-v2-flash",
		],
		env: {
			CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
		},
	},
	{
		// https://openrouter.ai/docs/guides/guides/claude-code-integration
		id: "openrouter",
		description: "OpenRouter",
		baseUrl: "https://openrouter.ai/api",
		defaultModels: [],
		env: {},
		configureEnv(env, apiKey, _model) {
			env["OPENROUTER_API_KEY"] = apiKey;
			env["ANTHROPIC_BASE_URL"] = this.baseUrl;
			env["ANTHROPIC_AUTH_TOKEN"] = apiKey;
			delete env["ANTHROPIC_API_KEY"];
		},
	},
	{
		// https://creator.poe.com/docs/external-applications/anthropic-compatible-api
		id: "poe",
		description: "Poe",
		baseUrl: "https://api.poe.com",
		defaultModels: [
			"claude-sonnet-4.5",
			"claude-opus-4.5",
			"claude-haiku-4.5",
			"claude-opus-4.1",
			"claude-sonnet-4",
			"claude-opus-4",
			"claude-sonnet-3.7",
			"claude-haiku-3.5",
			"claude-haiku-3",
		],
		env: {
			CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
		},
	},
	{
		// https://docs.requesty.ai/integrations/claude-code
		id: "requesty",
		description: "Requesty",
		baseUrl: "https://router.requesty.ai",
		defaultModels: [],
		env: {
			CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
		},
	},
	{
		// https://docs.z.ai/devpack/tool/claude#manual-configuration
		id: "zai",
		description: "Z.AI Coding Plan",
		// Coding Plan endpoint, distinct from the pay-as-you-go API (api.z.ai/api/paas/v4)
		baseUrl: "https://api.z.ai/api/anthropic",
		defaultModels: ["GLM-5.3", "GLM-5-Turbo", "GLM-4.7"],
		env: {
			API_TIMEOUT_MS: "3000000",
			CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
			CLAUDE_CODE_AUTO_COMPACT_WINDOW: "1000000",
		},
	},
	{
		// https://docs.byteplus.com/en/docs/ModelArk/1928262
		id: "byteplus",
		description: "BytePlus ModelArk",
		baseUrl: "https://ark.ap-southeast.bytepluses.com/api/coding",
		defaultModels: [
			"ark-code-latest",
			"bytedance-seed-code",
			"glm-4.7",
			"kimi-k2-thinking",
			"kimi-k2.5",
			"gpt-oss-120b",
		],
		env: {
			CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
		},
	},
	{
		// https://docs.litellm.ai/docs/
		id: "litellm",
		description: "LiteLLM Proxy",
		baseUrl: "http://localhost:4000",
		defaultModels: [],
		defaultApiKey: "litellm",
		promptBaseUrl: true,
		env: {
			CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
		},
	},
	{
		// https://github.com/ggml-org/llama.cpp
		id: "llamacpp",
		description: "llama.cpp",
		baseUrl: "http://127.0.0.1:8080",
		defaultModels: [],
		defaultApiKey: "llamacpp",
		promptBaseUrl: true,
		env: {
			CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
			API_TIMEOUT_MS: "600000",
		},
	},
	{
		// https://lmstudio.ai/docs/integrations/claude-code
		id: "lmstudio",
		description: "LM Studio",
		baseUrl: "http://localhost:1234",
		defaultModels: [],
		defaultApiKey: "lmstudio",
		promptBaseUrl: true,
		env: {
			CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
			API_TIMEOUT_MS: "600000",
		},
	},
	{
		// https://ollama.com/blog/claude
		id: "ollama",
		description: "Ollama",
		baseUrl: "http://localhost:11434",
		defaultModels: [],
		defaultApiKey: "ollama",
		promptBaseUrl: true,
		env: {
			CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
			API_TIMEOUT_MS: "600000",
		},
	},
	{
		// https://github.com/diegosouzapw/OmniRoute
		id: "omniroute",
		description: "OmniRoute",
		baseUrl: "http://localhost:20128/v1",
		defaultModels: [],
		defaultApiKey: "omniroute",
		promptBaseUrl: true,
		env: {
			CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
		},
	},
	{
		// https://github.com/decolua/9router
		id: "9router",
		description: "9Router",
		baseUrl: "http://localhost:20128/v1",
		defaultModels: [],
		defaultApiKey: "9router",
		promptBaseUrl: true,
		env: {
			CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
		},
	},
	{
		id: "custom",
		description: "Custom Provider",
		nameKey: "templates.custom",
		baseUrl: "",
		defaultModels: [],
		defaultApiKey: "custom",
		promptBaseUrl: true,
		promptAuthVar: true,
		promptModel: true,
		env: {},
	},
];

export function getTemplate(id: string): ProviderTemplate | undefined {
	return PROVIDER_TEMPLATES.find((t) => t.id === id);
}

export function getProviderBaseUrl(provider: ConfiguredProvider): string | undefined {
	return provider.baseUrl || getTemplate(provider.templateId)?.baseUrl;
}

export function getTemplateLabel(tmpl: ProviderTemplate, t: (key: string) => string): string {
	return tmpl.nameKey ? t(tmpl.nameKey) : tmpl.description;
}

function defaultEnvConfigurator(
	this: ProviderTemplate,
	env: Record<string, string>,
	apiKey: string,
	_model: string,
): void {
	env["ANTHROPIC_BASE_URL"] = this.baseUrl;
	env["ANTHROPIC_AUTH_TOKEN"] = apiKey;
	delete env["ANTHROPIC_API_KEY"];
}

/** Essential CLAUDE_CODE vars that must survive env cleanup (platform/shell requirements). */
const PRESERVED_CLAUDE_CODE_VARS = new Set([
	"CLAUDE_CODE_GIT_BASH_PATH", // Bash path on Windows
	"CLAUDE_CODE_SHELL", // Shell override
	"CLAUDE_CODE_TMPDIR", // Temp directory override
]);

/** Remove all CLAUDECODE/CLAUDE_CODE env vars except essential ones. */
function cleanupClaudeCodeVars(env: Record<string, string>): void {
	for (const key of Object.keys(env)) {
		if (PRESERVED_CLAUDE_CODE_VARS.has(key)) continue;
		if (key.startsWith("CLAUDECODE") || key.startsWith("CLAUDE_CODE")) {
			delete env[key];
		}
	}
}

function cleanupAndApplyTemplateEnv(env: Record<string, string>, template: ProviderTemplate): void {
	// Apply template extra env vars
	for (const [key, value] of Object.entries(template.env)) {
		env[key] = value;
	}

	cleanupClaudeCodeVars(env);

	// Re-apply template env vars that start with CLAUDE_CODE (they take priority)
	for (const [key, value] of Object.entries(template.env)) {
		env[key] = value;
	}
}

function setModelEnvVars(env: Record<string, string>, model: string): void {
	env["ANTHROPIC_MODEL"] = model;
	env["CLAUDE_CODE_SUBAGENT_MODEL"] = model;
	env["ANTHROPIC_DEFAULT_SONNET_MODEL"] = model;
	env["ANTHROPIC_DEFAULT_OPUS_MODEL"] = model;
	env["ANTHROPIC_DEFAULT_HAIKU_MODEL"] = model;
}

export function buildClaudeEnv(
	provider: ConfiguredProvider,
	model: string,
	installationId?: string,
): Record<string, string> | null {
	const template = getTemplate(provider.templateId);
	if (!template) return null;

	const env: Record<string, string> = {};

	// Copy process.env (skip undefined values)
	for (const [key, value] of Object.entries(process.env)) {
		if (value !== undefined) {
			env[key] = value;
		}
	}

	if (provider.type === "oauth") {
		// OAuth: use CLAUDE_CODE_OAUTH_TOKEN to authenticate without isolating the config dir.
		// This shares ~/.claude/ (settings, plugins, memory, agents, history) with the default install.
		const creds = readOAuthCredentials(provider.id);

		delete env["ANTHROPIC_API_KEY"];
		delete env["ANTHROPIC_AUTH_TOKEN"];
		delete env["ANTHROPIC_BASE_URL"];
		delete env["OPENROUTER_API_KEY"];
		delete env["CLAUDE_CONFIG_DIR"];
		delete env["ANTHROPIC_MODEL"];
		delete env["ANTHROPIC_SMALL_FAST_MODEL"];
		delete env["ANTHROPIC_DEFAULT_SONNET_MODEL"];
		delete env["ANTHROPIC_DEFAULT_OPUS_MODEL"];
		delete env["ANTHROPIC_DEFAULT_HAIKU_MODEL"];
		delete env["API_TIMEOUT_MS"];

		cleanupClaudeCodeVars(env);

		// Set OAuth token AFTER cleanup (cleanup removes CLAUDE_CODE_* vars)
		if (creds) {
			env["CLAUDE_CODE_OAUTH_TOKEN"] = creds.accessToken;
		}

		// Set installation dir (Anthropic MUST use custom installation)
		if (installationId && installationId !== DEFAULT_INSTALLATION_ID) {
			env["CLAUDE_CONFIG_DIR"] = getInstallationPath(installationId);
		}

		// Do NOT set model env vars — let Claude Code manage natively
		return env;
	}

	// Apply provider-specific or default env configuration
	const effectiveBaseUrl = provider.baseUrl || template.baseUrl;
	const templateWithUrl = { ...template, baseUrl: effectiveBaseUrl };
	const configurator: EnvConfigurator = template.configureEnv ?? defaultEnvConfigurator;
	configurator.call(templateWithUrl, env, provider.apiKey, model);

	if (provider.authVar === "ANTHROPIC_API_KEY") {
		env["ANTHROPIC_API_KEY"] = provider.apiKey;
		delete env["ANTHROPIC_AUTH_TOKEN"];
	}

	// Common: cleanup CLAUDE_CODE vars and re-apply template env
	cleanupAndApplyTemplateEnv(env, template);

	// Common: set model env vars (must come AFTER cleanup + re-apply)
	setModelEnvVars(env, model);

	// Set installation dir for custom installations
	if (installationId && installationId !== DEFAULT_INSTALLATION_ID) {
		env["CLAUDE_CONFIG_DIR"] = getInstallationPath(installationId);
	} else {
		delete env["CLAUDE_CONFIG_DIR"];
	}

	return env;
}

export interface ModelWithSource {
	name: string;
	source: "default" | "user" | "api";
	meta?: ApiModelMeta;
}

export function getEffectiveModels(provider: ConfiguredProvider): string[] {
	if (provider.type === "oauth") return [];
	const template = getTemplate(provider.templateId);
	if (!template) return provider.models;
	const seen = new Set(provider.models);
	const extra = template.defaultModels.filter((m) => !seen.has(m));
	return [...provider.models, ...extra];
}

export function getEffectiveModelsWithSource(provider: ConfiguredProvider): ModelWithSource[] {
	if (provider.type === "oauth") return [];
	const template = getTemplate(provider.templateId);
	const defaultSet = new Set(template?.defaultModels ?? []);
	const userSet = new Set(provider.models);
	const result: ModelWithSource[] = [];
	for (const m of provider.models) {
		result.push({ name: m, source: defaultSet.has(m) ? "default" : "user" });
	}
	if (template) {
		for (const m of template.defaultModels) {
			if (!userSet.has(m)) {
				result.push({ name: m, source: "default" });
			}
		}
	}
	return result;
}
