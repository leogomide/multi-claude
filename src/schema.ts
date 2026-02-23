import { z } from "zod";

export type EnvConfigurator = (env: Record<string, string>, apiKey: string, model: string) => void;

export interface ProviderTemplate {
	id: string;
	description: string;
	baseUrl: string;
	defaultModels: string[];
	env: Record<string, string>;
	configureEnv?: EnvConfigurator;
	defaultApiKey?: string;
}

export const configuredProviderSchema = z.object({
	id: z.string(),
	name: z.string(),
	templateId: z.string(),
	type: z.enum(["api", "oauth"]).default("api"),
	apiKey: z.string().default(""),
	models: z.array(z.string()).default([]),
	baseUrl: z.string().optional(),
});

export const installationSchema = z.object({
	id: z.string(),
	name: z.string(),
	dirName: z.string().default(""),
});

export type Installation = z.infer<typeof installationSchema>;

export const DEFAULT_INSTALLATION_ID = "default";

export const configSchema = z.object({
	providers: z.array(configuredProviderSchema),
	installations: z.array(installationSchema).default([]),
	language: z.string().optional(),
});

export type ConfiguredProvider = z.infer<typeof configuredProviderSchema>;
export type Config = z.infer<typeof configSchema>;
