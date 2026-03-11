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
	preview: string;
}

export const STATUSLINE_TEMPLATES: StatusLineTemplate[] = [
	{ id: "none", nameKey: "statusLine.none", descKey: "statusLine.noneDesc", preview: "" },
	{
		id: "default",
		nameKey: "statusLine.default",
		descKey: "statusLine.defaultDesc",
		preview:
			"Provider/Opus (master +45 -7)\nInput:84.2k    | Output:62.8k   | Cache:20.6M\nSession:3h31m  | API:1h38m      | Cost:$11.15    | $0.19/min\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u254c\u254c\u254c\u254c\u254c\u254c\u254c | 153.9k/77%     | 46.1k/23% left",
	},
	{
		id: "full",
		nameKey: "statusLine.full",
		descKey: "statusLine.fullDesc",
		preview:
			"Provider/Opus (master +45 -7)\nCtx:153.9k/77% | Left:46.1k/23% | Win:200k\nInput:84.2k    | Output:62.8k   | Cache:20.6M\nSession:3h31m  | API:1h38m      | Cost:$11.15    | $0.19/min",
	},
	{
		id: "slim",
		nameKey: "statusLine.slim",
		descKey: "statusLine.slimDesc",
		preview:
			"Provider/Opus (master +45 -7)\nInput:84.2k    | Output:62.8k   | Cost:$11.15    | Session:3h31m\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u254c\u254c\u254c\u254c\u254c\u254c\u254c | 153.9k/77%     | 46.1k/23% left",
	},
	{
		id: "mini",
		nameKey: "statusLine.mini",
		descKey: "statusLine.miniDesc",
		preview: "Provider/Opus (master +45 -7)\nCtx 77% | $11.15 | 3h31m",
	},
	{
		id: "cost",
		nameKey: "statusLine.cost",
		descKey: "statusLine.costDesc",
		preview:
			"Provider/Opus (master +45 -7)\nInput:$3.40    | Output:$7.75   | Cost:$11.15\n$0.19/min      | ~$11.40/h      | Session:3h31m\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u254c\u254c\u254c\u254c\u254c\u254c\u254c | 153.9k/77%     | 46.1k/23% left",
	},
	{
		id: "perf",
		nameKey: "statusLine.perf",
		descKey: "statusLine.perfDesc",
		preview:
			"Provider/Opus (master +45 -7)\nCache:71% hit  | I/O 1.3:1      | API:47% time\nOutput:~297t/s | Session:3h31m  | $11.15\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u254c\u254c\u254c\u254c\u254c\u254c\u254c | 153.9k/77%     | 46.1k/23% left",
	},
	{
		id: "context",
		nameKey: "statusLine.context",
		descKey: "statusLine.contextDesc",
		preview:
			"Provider/Opus (master +45 -7)\nInput:84.2k    | Output:62.8k   | Total:167.6k/200k\nCacheCreate:2.1k | CacheRead:18.5k | Cache:20.6M\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u254c\u254c\u254c\u254c\u254c\u254c\u254c | 153.9k/77%     | 46.1k/23% left",
	},
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
	autoCompact: boolean,
): Record<string, string> {
	return {
		MCLAUDE_PROVIDER_NAME: provider.name,
		MCLAUDE_MODEL: model,
		MCLAUDE_STATUSLINE_TEMPLATE: template,
		MCLAUDE_LANG: language,
		MCLAUDE_AUTO_COMPACT: String(autoCompact),
	};
}
