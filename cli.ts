#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { readFile, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import crossSpawn from "cross-spawn";
import pkg from "./package.json";
import { decryptCredential } from "./src/credential-store.ts";
import { createLogger, formatError, initLogger } from "./src/debug.ts";
import { en } from "./src/i18n/locales/en.ts";
import { es } from "./src/i18n/locales/es.ts";
import { ptBR } from "./src/i18n/locales/pt-BR.ts";
import type { TranslationDictionary } from "./src/i18n/types.ts";
import { initKeystore } from "./src/keystore.ts";
import type { AuthVar, ConfiguredProvider } from "./src/schema.ts";
import { DEFAULT_LAUNCH_TEMPLATE_ID } from "./src/schema.ts";

// engines is only advisory: fail with a readable message instead of a syntax or API error.
const nodeMajor = Number.parseInt(process.versions.node, 10);
if (!process.versions.bun && nodeMajor < 22) {
	console.error(`mclaude requires Node.js 22 or newer (found ${process.version}).`);
	process.exit(1);
}

function getLocaleDict(): TranslationDictionary {
	try {
		const configPath = join(homedir(), ".multi-claude", "config.json");
		const raw = readFileSync(configPath, "utf-8");
		const lang = JSON.parse(raw).language;
		if (lang === "pt-BR") return ptBR;
		if (lang === "es") return es;
	} catch {}
	return en;
}

interface TuiSelection {
	providerId: string;
	providerName: string;
	templateId: string;
	type?: "api" | "oauth";
	apiKey: string;
	models: string[];
	model: string;
	baseUrl?: string;
	authVar?: AuthVar;
	installationId?: string;
	selectedFlags?: string[];
	selectedEnvVars?: Record<string, string>;
	loadDotenv?: boolean;
	contextWindowTokens?: number;
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
	"--dangerously-skip-permissions",
	"--worktree",
	"-w",
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

// Runs a package manager with its stderr tee'd: the bytes still reach the
// terminal, and a copy is kept to recognise EACCES/EPERM/EBUSY afterwards.
// cross-spawn handles npm.cmd/pnpm.cmd/yarn.cmd; the args are fixed, no metachars.
function runTee(
	command: string,
	args: string[],
): Promise<{ status: number | null; stderrText: string }> {
	return new Promise((resolve) => {
		let stderrText = "";
		const child = crossSpawn(command, args, { stdio: ["inherit", "inherit", "pipe"] });
		child.stderr?.on("data", (chunk: Buffer) => {
			process.stderr.write(chunk);
			stderrText += chunk.toString();
		});
		child.on("error", (err) => {
			log.error("update spawn error", err);
			stderrText += String(err);
			resolve({ status: null, stderrText });
		});
		child.on("close", (status) => resolve({ status, stderrText }));
	});
}

function resetTerminal(): void {
	if (process.stdin.isTTY && process.stdin.setRawMode) {
		process.stdin.setRawMode(false);
	}
	process.stdout.write("\x1b[?25h"); // Show cursor
	process.stdout.write("\x1b[0m"); // Reset all attributes
	process.stdout.write("\x1b[?1049l"); // Exit alternate screen
}

// process.exit does not wait for pending stdout writes, and on POSIX pipes they
// are async in Node: `mclaude --list | jq` would get a truncated document.
async function exitAfterFlush(code: number): Promise<never> {
	await new Promise<void>((resolve) => process.stdout.write("", () => resolve()));
	process.exit(code);
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
	console.log(`multi-claude v${pkg.version}`);
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
	console.log("  --debug            Enable debug mode");
	console.log("");
	console.log("Options:");
	console.log("  --help, -h         Show this help message");
	console.log("  --version, -v      Show version number");
	console.log("  --logs [last|tail] Show debug log files");
	await exitAfterFlush(0);
}

// Interceptar --version / -v
if (cliArgs.includes("--version") || cliArgs.includes("-v")) {
	console.log(pkg.version);
	await exitAfterFlush(0);
}

// Interceptar --logs
if (cliArgs[0] === "--logs") {
	const { handleLogs } = await import("./src/logs-viewer.ts");
	await handleLogs(cliArgs[1]);
	await exitAfterFlush(0);
}

// Interceptar --list
if (cliArgs.includes("--list")) {
	const { printHeadlessInfo } = await import("./src/headless.ts");
	await printHeadlessInfo();
	await exitAfterFlush(0);
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
// Runs from the bundle: dist/cli.js spawns its sibling dist/tui-process.js.
const tuiPath = fileURLToPath(new URL("./tui-process.js", import.meta.url));

// Bun's fetch honours HTTP(S)_PROXY on its own; Node's only with NODE_USE_ENV_PROXY
// (22.21+/24.0+), read at startup — so it has to be set on the child's env.
const proxied = ["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy"].some(
	(k) => process.env[k],
);
const tuiEnv =
	proxied && process.env["NODE_USE_ENV_PROXY"] === undefined
		? { ...process.env, NODE_USE_ENV_PROXY: "1" }
		: process.env;

// Main loop: return to TUI after Claude Code exits
while (true) {
	let tuiExitCode: number | null = null;
	do {
		log.info("spawning TUI process: " + tuiPath);
		const tuiResult = spawnSync(process.execPath, [tuiPath, ...cliArgs], {
			stdio: "inherit",
			env: tuiEnv,
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
				const { printClaudeNotFound, spawnClaudeSync } = await import("./src/utils/claude-bin.ts");

				log.info("running claude for OAuth login, provider=" + oauthData.providerName);
				let loginResult: { status: number | null; error?: Error };
				try {
					loginResult = spawnClaudeSync([], {
						stdio: "inherit",
						env: { ...process.env, CLAUDE_CONFIG_DIR: accountDir },
					});
				} catch (err) {
					loginResult = { status: null, error: err as Error };
				}

				const dict = getLocaleDict();
				if (loginResult.error) {
					// RN-10: claude could not be launched at all — not a refused login.
					log.error("OAuth login spawn error", loginResult.error);
					if (oauthData.isNew) {
						const cfg = await loadConfig();
						cfg.providers = cfg.providers.filter((p) => p.id !== oauthData.providerId);
						await saveConfig(cfg);
						await removeAccountDir(oauthData.providerId);
					}
					console.error("");
					printClaudeNotFound();
					console.error("");
				} else if (loginResult.status === 0 && isAccountAuthenticated(oauthData.providerId)) {
					log.info("OAuth login successful");
					const msg = dict.anthropic.loginSuccess.replace("{{name}}", oauthData.providerName);
					console.log(`\n\u2713 ${msg}\n`);
				} else {
					log.info("OAuth login failed");
					if (oauthData.isNew) {
						const cfg = await loadConfig();
						cfg.providers = cfg.providers.filter((p) => p.id !== oauthData.providerId);
						await saveConfig(cfg);
						await removeAccountDir(oauthData.providerId);
						console.error(`\n\u2717 ${dict.anthropic.loginFailedNew}\n`);
					} else {
						console.error(`\n\u2717 ${dict.anthropic.reAuthFailed}\n`);
					}
				}
			} catch (err) {
				log.error("OAuth handling error", err);
			}
			continue; // restart TUI
		}

		if (tuiExitCode === 4) {
			resetTerminal();
			const dict = getLocaleDict();
			// RN-04: update through the manager that installed this bundle, never
			// `process.execPath install`. RN-05: ephemeral runs and dev links don't update.
			const { detectInstallSource, formatCommand, runnerLabel } = await import(
				"./src/services/install-detect.ts"
			);
			const selfPath = realpathSync(fileURLToPath(import.meta.url));
			const source = detectInstallSource(selfPath, process.env, process.platform);
			log.info("update source=" + source.kind + " path=" + selfPath);

			if (source.kind === "ephemeral") {
				console.log(
					`\n${dict.update.ephemeral.replace("{{runner}}", runnerLabel(source.runner))}\n`,
				);
				process.exit(0);
			}
			if (source.kind === "dev-link") {
				console.log(`\n${dict.update.devLink}\n`);
				process.exit(0);
			}

			const command = formatCommand(source);
			console.log(`\n\u2B06\uFE0F  ${dict.update.updating}\n`);
			log.info("update command: " + command);
			const { status, stderrText } = await runTee(source.command, source.args);
			if (status === 0) {
				const { checkForUpdate } = await import("./src/services/version-check.ts");
				// Compared against 0.0.0 so any published version comes back as the latest.
				const latest = await checkForUpdate("0.0.0", AbortSignal.timeout(5000));
				const version = latest.updateAvailable ? latest.latestVersion : "latest";
				console.log(`\n\u2713 ${dict.update.success.replace("{{version}}", version)}\n`);
				process.exit(0);
			}
			log.error("update failed, status=" + status + " stderr=" + stderrText.slice(-2000));
			const template = /EACCES|EPERM/.test(stderrText)
				? dict.update.permission
				: /EBUSY/.test(stderrText)
					? dict.update.busy
					: dict.update.failed;
			const msg = template.replace("{{manager}}", source.kind).replace("{{command}}", command);
			console.error(`\n\u2717 ${msg}\n`);
			process.exit(1);
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
		baseUrl: selection.baseUrl,
		authVar: selection.authVar,
	};

	// Merge TUI-selected flags with original CLI args
	const mergedArgs = mergeFlags(cliArgs, selection.selectedFlags ?? []);

	let exitCode: number;
	if (isDefault) {
		const { runClaudeDefault } = await import("./src/runner.ts");
		log.info("calling runClaudeDefault()");
		exitCode = await runClaudeDefault(
			mergedArgs,
			selection.installationId,
			selection.selectedEnvVars,
			selection.loadDotenv,
		);
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
			selection.loadDotenv,
			selection.contextWindowTokens,
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
