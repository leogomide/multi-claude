import { chmod, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CONFIG_DIR } from "./config.ts";
import type { ConfiguredProvider } from "./schema.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const STATUSLINE_TEMPLATE_IDS = ["none", "default", "full", "slim", "mini", "cost", "dev", "perf", "context"] as const;
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
		preview: "Provider/Opus (master +45 -7)\nInput:84.2k    | Output:62.8k   | Cache:20.6M\nSession:3h31m  | API:1h38m      | Cost:$11.15    | $0.19/min\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u254c\u254c\u254c\u254c\u254c\u254c\u254c | 153.9k/77%     | 46.1k/23% left",
	},
	{
		id: "full",
		nameKey: "statusLine.full",
		descKey: "statusLine.fullDesc",
		preview: "Provider/Opus\nCtx: 77%       | Used: 153.9k   | Left: 46.1k    | Win: 200k\nInput:84.2k    | Output:62.8k   | Cache:20.6M    | I/O 1.3:1\nSession:3h31m  | API:1h38m      | Cost:$11.15    | $0.19/min      | master | +45 -7",
	},
	{
		id: "slim",
		nameKey: "statusLine.slim",
		descKey: "statusLine.slimDesc",
		preview: "Provider/Opus\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u254c\u254c | 46.1k/23% left\nInput:84.2k Output:62.8k | $11.15             | 3h31m              | master | +45 -7",
	},
	{
		id: "mini",
		nameKey: "statusLine.mini",
		descKey: "statusLine.miniDesc",
		preview: "Provider/Opus | Ctx 77% | $11.15 | 3h31m | master | (+45,-7)",
	},
	{
		id: "cost",
		nameKey: "statusLine.cost",
		descKey: "statusLine.costDesc",
		preview: "",
	},
	{
		id: "dev",
		nameKey: "statusLine.dev",
		descKey: "statusLine.devDesc",
		preview: "",
	},
	{
		id: "perf",
		nameKey: "statusLine.perf",
		descKey: "statusLine.perfDesc",
		preview: "",
	},
	{
		id: "context",
		nameKey: "statusLine.context",
		descKey: "statusLine.contextDesc",
		preview: "",
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

export function buildStatusLineSettingsJson(scriptPath: string): string {
	const normalizedPath = scriptPath.replace(/\\/g, "/");
	const settings = {
		statusLine: {
			type: "command",
			command: `bun "${normalizedPath}"`,
			padding: 0,
		},
	};
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
