import { chmod, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CONFIG_DIR } from "./config.ts";
import type { ConfiguredProvider } from "./schema.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const STATUSLINE_TEMPLATE_IDS = [
	"none",
	"default",
	"full",
	"slim",
	"mini",
	"cost",
	"perf",
	"context",
] as const;
export type StatusLineTemplateId = (typeof STATUSLINE_TEMPLATE_IDS)[number];

export interface StatusLineTemplate {
	id: StatusLineTemplateId;
	nameKey: string;
	descKey: string;
}

export const STATUSLINE_TEMPLATES: StatusLineTemplate[] = [
	{ id: "none", nameKey: "statusLine.none", descKey: "statusLine.noneDesc" },
	{ id: "default", nameKey: "statusLine.default", descKey: "statusLine.defaultDesc" },
	{ id: "full", nameKey: "statusLine.full", descKey: "statusLine.fullDesc" },
	{ id: "slim", nameKey: "statusLine.slim", descKey: "statusLine.slimDesc" },
	{ id: "mini", nameKey: "statusLine.mini", descKey: "statusLine.miniDesc" },
	{ id: "cost", nameKey: "statusLine.cost", descKey: "statusLine.costDesc" },
	{ id: "perf", nameKey: "statusLine.perf", descKey: "statusLine.perfDesc" },
	{ id: "context", nameKey: "statusLine.context", descKey: "statusLine.contextDesc" },
];

export async function ensureStatusLineScript(): Promise<string> {
	const scriptPath = join(CONFIG_DIR, "statusline.mjs");
	const sourcePath = join(__dirname, "statusline-script.mjs");

	const content = await readFile(sourcePath, "utf-8");
	await writeFile(scriptPath, content, "utf-8");

	if (process.platform !== "win32") {
		await chmod(scriptPath, 0o755);
	}

	return scriptPath;
}

export function buildStatusLineSettingsJson(
	scriptPath: string,
	envVars?: Record<string, string>,
): string {
	const normalizedPath = scriptPath.replace(/\\/g, "/");
	const settings: Record<string, unknown> = {
		statusLine: {
			type: "command",
			command: `bun "${normalizedPath}"`,
			padding: 0,
		},
	};
	if (envVars && Object.keys(envVars).length > 0) {
		settings.env = envVars;
	}
	return JSON.stringify(settings);
}

export function getStatusLineEnvVars(
	provider: ConfiguredProvider,
	model: string,
	template: string,
	language: string,
): Record<string, string> {
	return {
		MCLAUDE_PROVIDER_NAME: provider.name,
		MCLAUDE_MODEL: model,
		MCLAUDE_STATUSLINE_TEMPLATE: template,
		MCLAUDE_LANG: language,
	};
}
