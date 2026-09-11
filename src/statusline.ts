import { randomBytes } from "node:crypto";
import { chmod, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CONFIG_DIR } from "./config.ts";
import type { ConfiguredProvider } from "./schema.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SESSION_DIR = join(CONFIG_DIR, "sessions");
const SESSION_FILE_RE = /^settings-(\d+)-[0-9a-f]{8}\.json$/;

/**
 * Writes the --settings payload to a per-session file; returns its path.
 * A path carries no quotes or shell metacharacters, unlike the inline JSON.
 */
export async function writeSessionSettings(json: string, dir = SESSION_DIR): Promise<string> {
	await mkdir(dir, { recursive: true });
	const file = join(dir, `settings-${process.pid}-${randomBytes(4).toString("hex")}.json`);
	await writeFile(file, json, "utf-8");
	return file;
}

function isProcessAlive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch (err) {
		// EPERM: the process exists but belongs to someone else.
		return (err as NodeJS.ErrnoException).code === "EPERM";
	}
}

/** Deletes session files whose owning mclaude process is gone (crash leftovers). */
export async function cleanStaleSessionSettings(dir = SESSION_DIR): Promise<void> {
	let names: string[];
	try {
		names = await readdir(dir);
	} catch {
		return;
	}
	await Promise.all(
		names.map(async (name) => {
			const match = SESSION_FILE_RE.exec(name);
			if (!match) return;
			const pid = Number(match[1]);
			if (pid === process.pid || isProcessAlive(pid)) return;
			await rm(join(dir, name), { force: true }).catch(() => {});
		}),
	);
}

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

// The status line runs on whatever runtime launched mclaude. An absolute path is
// only used when it has no whitespace: Claude Code may hand the command to
// `cmd /c`, which strips the outer quotes of a command that starts with one.
function statusLineRuntime(): string {
	const exec = process.execPath.replace(/\\/g, "/");
	if (!/\s/.test(exec)) return `"${exec}"`;
	return process.versions.bun ? "bun" : "node";
}

export function buildStatusLineSettingsJson(
	scriptPath: string,
	envVars?: Record<string, string>,
): string {
	const normalizedPath = scriptPath.replace(/\\/g, "/");
	const settings: Record<string, unknown> = {
		statusLine: {
			type: "command",
			command: `${statusLineRuntime()} "${normalizedPath}"`,
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
