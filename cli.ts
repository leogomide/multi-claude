#!/usr/bin/env bun

import { execSync, spawnSync } from "node:child_process";
import { readFile, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { decryptCredential } from "./src/credential-store.ts";
import { createLogger, formatError, initLogger } from "./src/debug.ts";
import { initKeystore } from "./src/keystore.ts";
import type { ConfiguredProvider } from "./src/schema.ts";
import { DEFAULT_LAUNCH_TEMPLATE_ID } from "./src/schema.ts";

interface TuiSelection {
	providerId: string;
	providerName: string;
	templateId: string;
	type?: "api" | "oauth";
	apiKey: string;
	models: string[];
	model: string;
	installationId?: string;
	selectedFlags?: string[];
	selectedEnvVars?: Record<string, string>;
}

interface OAuthSelection {
	type: "oauth-login";
	providerId: string;
	providerName: string;
	isNew: boolean;
}

const SELECTION_FILE = join(homedir(), ".multi-claude", "last-selection.json");

const sessionId = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
initLogger("cli", sessionId);
const log = createLogger("cli");

const STRATEGIC_FLAGS_WITH_ALIASES = new Set([
	"--resume",
	"-r",
	"--dangerously-skip-permissions",
	"--verbose",
	"--worktree",
	"-w"
]);

function mergeFlags(originalCliArgs: string[], selectedFlags: string[]): string[] {
	// Remove strategic flags from original args (user may have toggled them off in TUI)
	// Also skip values that follow --worktree/-w
	const nonStrategic: string[] = [];
	let skipNext = false;
	for (let i = 0; i < originalCliArgs.length; i++) {
		if (skipNext) {
			skipNext = false;
			continue;
		}
		const arg = originalCliArgs[i]!;
		if (STRATEGIC_FLAGS_WITH_ALIASES.has(arg)) {
			// For --worktree/-w, also skip the next arg if it doesn't start with --
			if ((arg === "--worktree" || arg === "-w") && i + 1 < originalCliArgs.length) {
				const next = originalCliArgs[i + 1]!;
				if (!next.startsWith("-")) {
					skipNext = true;
				}
			}
			continue;
		}
		nonStrategic.push(arg);
	}
	// Add TUI-selected flags + remaining non-strategic args
	return [...selectedFlags, ...nonStrategic];
}

function resolveClaudePath(): string {
	try {
		if (process.platform === "win32") {
			return execSync("where claude", { encoding: "utf-8" }).trim().split(/\r?\n/)[0] ?? "claude";
		}
		return execSync("which claude", { encoding: "utf-8" }).trim();
	} catch {
		return "claude";
	}
}

function resetTerminal(): void {
	if (process.stdin.isTTY && process.stdin.setRawMode) {
		process.stdin.setRawMode(false);
	}
	process.stdout.write("\x1b[?25h"); // Show cursor
	process.stdout.write("\x1b[0m"); // Reset all attributes
	process.stdout.write("\x1b[?1049l"); // Exit alternate screen
}

process.on("uncaughtException", (err) => {
	log.error("UNCAUGHT EXCEPTION", err);
	console.error("mclaude crash:", formatError(err));
});
process.on("unhandledRejection", (reason) => {
	log.error("UNHANDLED REJECTION", reason);
	console.error("mclaude crash (unhandled rejection):", formatError(reason));
});
process.on("exit", (code) => {
	log.info("process exit with code=" + code);
});

log.info("started, argv=" + JSON.stringify(process.argv));

// Initialize keystore (.key and .salt files)
await initKeystore();

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
	console.log("  --master-password <pw>  Master password (if configured)");
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
	console.log("  --logs [last|tail] Show debug log files");
	process.exit(0);
}

// Interceptar --version / -v
if (cliArgs.includes("--version") || cliArgs.includes("-v")) {
	const { version } = await import("./package.json");
	console.log(version);
	process.exit(0);
}

// Interceptar --logs
if (cliArgs[0] === "--logs") {
	const { handleLogs } = await import("./src/logs-viewer.ts");
	await handleLogs(cliArgs[1]);
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

// Main loop: return to TUI after Claude Code exits
while (true) {
	let tuiExitCode: number | null = null;
	do {
		log.info("spawning TUI process: " + tuiPath);
		const tuiResult = spawnSync(process.execPath, [tuiPath, ...cliArgs], {
			stdio: "inherit",
			env: process.env,
		});

		if (tuiResult.error) {
			log.error("TUI spawn error", tuiResult.error);
			console.error("Failed to start TUI:", tuiResult.error.message);
			process.exit(1);
		}

		tuiExitCode = tuiResult.status;

		if (tuiExitCode === 2) {
			log.debug("TUI exited with code 2, restarting TUI");
			continue;
		}

		if (tuiExitCode === 3) {
			// OAuth login requested — handle in clean process context (no Ink residue)
			try {
				const raw = await readFile(SELECTION_FILE, "utf-8");
				const oauthData = JSON.parse(raw) as OAuthSelection;
				await unlink(SELECTION_FILE);

				const {
					ensureAccountDir,
					isAccountAuthenticated,
					removeAccountDir,
					loadConfig,
					saveConfig,
				} = await import("./src/config.ts");
				const accountDir = await ensureAccountDir(oauthData.providerId);
				const claudePath = resolveClaudePath();

				log.info("running claude for OAuth login, provider=" + oauthData.providerName);
				const loginResult = spawnSync(claudePath, [], {
					stdio: "inherit",
					env: { ...process.env, CLAUDE_CONFIG_DIR: accountDir },
				});

				if (loginResult.status === 0 && isAccountAuthenticated(oauthData.providerId)) {
					log.info("OAuth login successful");
					console.log(`\n\u2713 Conta "${oauthData.providerName}" autenticada com sucesso!\n`);
				} else {
					log.info("OAuth login failed");
					if (oauthData.isNew) {
						const cfg = await loadConfig();
						cfg.providers = cfg.providers.filter((p) => p.id !== oauthData.providerId);
						await saveConfig(cfg);
						await removeAccountDir(oauthData.providerId);
						console.error(
							"\n\u2717 Autentica\u00e7\u00e3o falhou. Provedor n\u00e3o foi adicionado.\n",
						);
					} else {
						console.error("\n\u2717 Re-autentica\u00e7\u00e3o falhou.\n");
					}
				}
			} catch (err) {
				log.error("OAuth handling error", err);
			}
			continue; // restart TUI
		}

		if (tuiExitCode === 4) {
			resetTerminal();
			console.log("\n\u2B06\uFE0F  Updating mclaude...\n");
			const updateResult = spawnSync(
				process.execPath,
				["install", "-g", "@leogomide/multi-claude@latest"],
				{
					stdio: "inherit",
				},
			);
			if (updateResult.status === 0) {
				console.log(
					"\n\u2713 mclaude updated successfully! Run 'mclaude' to use the new version.\n",
				);
				process.exit(0);
			} else {
				console.error(
					"\n\u2717 Update failed. Try manually: bun install -g @leogomide/multi-claude@latest\n",
				);
				process.exit(1);
			}
		}

		if (tuiExitCode !== 0) {
			log.info("TUI exited with status=" + tuiExitCode);
			process.exit(tuiExitCode ?? 1);
		}
	} while (tuiExitCode === 2 || tuiExitCode === 3);

	// Read selection from JSON file
	let selection: TuiSelection;
	try {
		const raw = await readFile(SELECTION_FILE, "utf-8");
		selection = JSON.parse(raw) as TuiSelection;
		await unlink(SELECTION_FILE);
		// Decrypt apiKey from IPC file
		if (selection.apiKey) {
			selection.apiKey = await decryptCredential(selection.apiKey);
		}
		log.info("selection read and deleted, provider=" + selection.providerName);
	} catch (err) {
		log.error("failed to read selection file", err);
		console.error("Failed to read TUI selection.");
		process.exit(1);
	}

	const isOAuth = selection.type === "oauth";
	const isDefault = selection.templateId === DEFAULT_LAUNCH_TEMPLATE_ID;

	if (!selection.model && !isOAuth && !isDefault) {
		log.info("no model selected, aborting");
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
		apiKeyValid: true,
		models: selection.models,
	};

	// Merge TUI-selected flags with original CLI args
	const mergedArgs = mergeFlags(cliArgs, selection.selectedFlags ?? []);

	let exitCode: number;
	if (isDefault) {
		const { runClaudeDefault } = await import("./src/runner.ts");
		log.info("calling runClaudeDefault()");
		exitCode = await runClaudeDefault(mergedArgs, selection.installationId, selection.selectedEnvVars);
		log.info("runClaudeDefault() returned exitCode=" + exitCode);
	} else {
		const { runClaude } = await import("./src/runner.ts");
		log.info("calling runClaude()");
		exitCode = await runClaude(
			provider,
			selection.model ?? "",
			mergedArgs,
			selection.installationId,
			selection.selectedEnvVars,
		);
		log.info("runClaude() returned exitCode=" + exitCode);
	}

	resetTerminal();

	const providerInfo = isDefault
		? "Claude Code (default)"
		: isOAuth
			? selection.providerName
			: `${selection.providerName} (${selection.model})`;

	if (exitCode !== 0) {
		console.log(`\n[mclaude] ${providerInfo} \u2014 exited with code ${exitCode}`);
	} else {
		console.log(`\n[mclaude] ${providerInfo} \u2014 session ended`);
	}
} // end main loop
