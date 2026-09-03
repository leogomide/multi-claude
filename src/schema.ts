import { z } from "zod";

export type EnvConfigurator = (env: Record<string, string>, apiKey: string, model: string) => void;

export const AUTH_VARS = ["ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_API_KEY"] as const;
export type AuthVar = (typeof AUTH_VARS)[number];

export interface ProviderTemplate {
	id: string;
	description: string;
	nameKey?: string;
	baseUrl: string;
	defaultModels: string[];
	/**
	 * Static per-model metadata for providers whose API does not expose it.
	 * Keys are lowercase model ids; the API always wins when it reports a value.
	 */
	modelSpecs?: Record<string, { context: number; maxOutput?: number }>;
	env: Record<string, string>;
	configureEnv?: EnvConfigurator;
	defaultApiKey?: string;
	promptBaseUrl?: boolean;
	promptAuthVar?: boolean;
	promptModel?: boolean;
}

export const configuredProviderSchema = z.object({
	id: z.string(),
	name: z.string(),
	templateId: z.string(),
	type: z.enum(["api", "oauth"]).default("api"),
	apiKey: z.string().default(""),
	apiKeyValid: z.boolean().default(true),
	models: z.array(z.string()).default([]),
	/**
	 * Per-model context window entered by the user. Keys are lowercase model ids.
	 * Wins over both the provider API and the template table.
	 */
	modelSpecs: z
		.record(
			z.string(),
			z.object({
				context: z.number().int().positive(),
				maxOutput: z.number().int().positive().optional(),
			}),
		)
		.optional(),
	baseUrl: z.string().optional(),
	authVar: z.enum(AUTH_VARS).optional(),
});

export const installationSchema = z.object({
	id: z.string(),
	name: z.string(),
	dirName: z.string().default(""),
});

export type Installation = z.infer<typeof installationSchema>;

export const DEFAULT_INSTALLATION_ID = "default";
export const DEFAULT_LAUNCH_TEMPLATE_ID = "__default__";

export const statusLineConfigSchema = z.object({
	template: z.string().default("default"),
});

export const configSchema = z.object({
	providers: z.array(configuredProviderSchema),
	installations: z.array(installationSchema).default([]),
	language: z.string().optional(),
	lastFlags: z.array(z.string()).optional(),
	lastEnvVars: z.array(z.string()).optional(),
	lastLoadDotenv: z.boolean().optional(),
	statusLine: statusLineConfigSchema.optional(),
	lastSeenChangelogVersion: z.string().optional(),
	masterPasswordHash: z.string().optional(),
});

export type ConfiguredProvider = z.infer<typeof configuredProviderSchema>;
export type Config = z.infer<typeof configSchema>;
