#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { readFile, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { debugLog } from "./src/debug.ts";
import type { ConfiguredProvider } from "./src/schema.ts";

interface TuiSelection {
	providerId: string;
	providerName: string;
	templateId: string;
	type?: "api" | "oauth";
	apiKey: string;
	models: string[];
	model: string;
	installationId?: string;
}

const SELECTION_FILE = join(homedir(), ".multi-claude", "last-selection.json");

function resetTerminal(): void {
	if (process.stdin.isTTY && process.stdin.setRawMode) {
		process.stdin.setRawMode(false);
	}
	process.stdout.write("\x1b[?25h");   // Show cursor
	process.stdout.write("\x1b[0m");     // Reset all attributes
	process.stdout.write("\x1b[?1049l"); // Exit alternate screen
}

process.on("uncaughtException", (err) => {
	const detail = err instanceof Error ? (err.stack ?? err.message) : JSON.stringify(err);
	debugLog("cli.ts: UNCAUGHT EXCEPTION: " + detail);
	console.error("mclaude crash:", detail);
});
process.on("unhandledRejection", (reason) => {
	const detail = reason instanceof Error ? (reason.stack ?? reason.message) : String(reason);
	debugLog("cli.ts: UNHANDLED REJECTION: " + detail);
	console.error("mclaude crash (unhandled rejection):", detail);
});
process.on("exit", (code) => {
	debugLog("cli.ts: process exit with code=" + code);
});

debugLog("cli.ts: started, argv=" + JSON.stringify(process.argv));

const cliArgs = process.argv.slice(2);

// Interceptar --help / -h
if (cliArgs.includes("--help") || cliArgs.includes("-h")) {
	const { version } = await import("./package.json");
	console.log(`multi-claude v${version}`);
	console.log("");
	console.log("Usage: mclaude [options] [claude-code-flags...]");
	console.log("");
	console.log("Without --provider, opens the interactive TUI.");
	console.log("With --provider, runs in headless mode (no TUI).");
	console.log("");
	console.log("Headless mode (skip TUI):");
	console.log("  --provider <name>       Provider name, template ID, or slug");
	console.log("  --model <model>         Model to use (auto-selects first if omitted)");
	console.log("  --installation <name>   Installation to use (default if omitted)");
	console.log("  --list                  List providers, models and installations (JSON)");
	console.log("");
	console.log("Examples:");
	console.log('  mclaude --provider deepseek --model deepseek-chat -p "explain this"');
	console.log("  mclaude --provider ollama --model llama3 -c");
	console.log("  mclaude --list");
	console.log("");
	console.log("All other arguments are forwarded to Claude Code.");
	console.log("");
	console.log("Common Claude Code flags:");
	console.log("  -c, --continue     Continue most recent conversation");
	console.log('  -p "query"         Print mode (non-interactive)');
	console.log("  --resume <id>      Resume a specific session");
	console.log("  --debug            Enable debug mode");
	console.log("");
	console.log("Options:");
	console.log("  --help, -h         Show this help message");
	console.log("  --version, -v      Show version number");
	process.exit(0);
}

// Interceptar --version / -v
if (cliArgs.includes("--version") || cliArgs.includes("-v")) {
	const { version } = await import("./package.json");
	console.log(version);
	process.exit(0);
}

// Interceptar --list
if (cliArgs.includes("--list")) {
	const { printHeadlessInfo } = await import("./src/headless.ts");
	await printHeadlessInfo();
	process.exit(0);
}

// Headless mode (--provider flag)
const { extractHeadlessArgs, runHeadless } = await import("./src/headless.ts");
const headlessArgs = extractHeadlessArgs(cliArgs);

if (headlessArgs) {
	const exitCode = await runHeadless(headlessArgs);
	resetTerminal();
	process.exit(exitCode);
}

// Spawn TUI in a separate process — never import Ink/React here
const tuiPath = join(import.meta.dir, "src", "tui-process.ts");

// Loop: restart TUI when exit code 2 (OAuth login completed)
let tuiExitCode: number | null = null;
do {
	debugLog("cli.ts: spawning TUI process: " + tuiPath);
	const tuiResult = spawnSync(process.execPath, [tuiPath], { stdio: "inherit" });

	if (tuiResult.error) {
		debugLog("cli.ts: TUI spawn error: " + String(tuiResult.error));
		console.error("Failed to start TUI:", tuiResult.error.message);
		process.exit(1);
	}

	tuiExitCode = tuiResult.status;

	if (tuiExitCode === 2) {
		debugLog("cli.ts: TUI exited with code 2 (OAuth login), restarting TUI");
		continue;
	}

	if (tuiExitCode !== 0) {
		debugLog("cli.ts: TUI exited with status=" + tuiExitCode);
		process.exit(tuiExitCode ?? 1);
	}
} while (tuiExitCode === 2);

// Read selection from JSON file
let selection: TuiSelection;
try {
	const raw = await readFile(SELECTION_FILE, "utf-8");
	selection = JSON.parse(raw) as TuiSelection;
	await unlink(SELECTION_FILE);
	debugLog("cli.ts: selection read and deleted, provider=" + selection.providerName);
} catch (err) {
	debugLog("cli.ts: failed to read selection file: " + String(err));
	console.error("Failed to read TUI selection.");
	process.exit(1);
}

const isOAuth = selection.type === "oauth";

if (!selection.model && !isOAuth) {
	debugLog("cli.ts: no model selected, aborting");
	console.error("No model selected. Add models to this provider in 'Manage models'.");
	process.exit(1);
}

// Ensure stdin raw mode is off (precaution)
if (process.stdin.isTTY && process.stdin.setRawMode) {
	process.stdin.setRawMode(false);
}

// Reconstruct ConfiguredProvider from selection
const provider: ConfiguredProvider = {
	id: selection.providerId,
	name: selection.providerName,
	templateId: selection.templateId,
	type: selection.type ?? "api",
	apiKey: selection.apiKey ?? "",
	models: selection.models,
};

const { runClaude } = await import("./src/runner.ts");
debugLog("cli.ts: calling runClaude()");
const exitCode = await runClaude(provider, selection.model ?? "", cliArgs, selection.installationId);
debugLog("cli.ts: runClaude() returned exitCode=" + exitCode);

resetTerminal();

const providerInfo = isOAuth
	? selection.providerName
	: `${selection.providerName} (${selection.model})`;

if (exitCode !== 0) {
	console.log(`\n[mclaude] ${providerInfo} — exited with code ${exitCode}`);
} else {
	console.log(`\n[mclaude] ${providerInfo} — session ended`);
}

process.exit(exitCode);
