import { execSync, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { getInstallationPath, loadConfig, readOAuthCredentials } from "./config.ts";
import { createLogger } from "./debug.ts";

const log = createLogger("runner");

import { buildClaudeEnv } from "./providers.ts";
import type { ConfiguredProvider } from "./schema.ts";
import { DEFAULT_INSTALLATION_ID } from "./schema.ts";
import {
	buildStatusLineSettingsJson,
	ensureStatusLineScript,
	getStatusLineEnvVars,
	STATUSLINE_TEMPLATE_IDS,
} from "./statusline.ts";

function readDefaultOAuthToken(): string | null {
	const credFile = join(homedir(), ".claude", ".credentials.json");
	if (existsSync(credFile)) {
		try {
			const raw = JSON.parse(readFileSync(credFile, "utf-8")) as Record<string, unknown>;
			const oauth = raw["claudeAiOauth"] as Record<string, unknown> | undefined;
			return (oauth?.["accessToken"] as string) || null;
		} catch {
			return null;
		}
	}
	if (process.platform === "darwin") {
		try {
			const result = execSync('security find-generic-password -s "Claude Code-credentials" -w', {
				encoding: "utf-8",
				timeout: 3000,
			});
			const parsed = JSON.parse(result.trim()) as Record<string, unknown>;
			const oauth = parsed["claudeAiOauth"] as Record<string, unknown> | undefined;
			return (oauth?.["accessToken"] as string) || null;
		} catch {
			return null;
		}
	}
	return null;
}

export async function runClaude(
	provider: ConfiguredProvider,
	model: string,
	extraArgs: string[] = [],
	installationId?: string,
	selectedEnvVars?: Record<string, string>,
): Promise<number> {
	const env = buildClaudeEnv(provider, model, installationId);
	if (!env) {
		console.error(
			'Error: template for provider "' +
				provider.name +
				'" (' +
				provider.templateId +
				") not found.",
		);
		return 1;
	}

	// Build args
	const args: string[] = [];
	if (provider.type !== "oauth") {
		args.push("--model", model);
	}

	// Filter --model/-m from user args and append the rest
	let skipNext = false;
	for (let i = 0; i < extraArgs.length; i++) {
		if (skipNext) {
			skipNext = false;
			continue;
		}
		const arg = extraArgs[i]!;
		if (arg === "--model" || arg === "-m") {
			skipNext = true;
			continue;
		}
		if (arg.startsWith("--model=")) {
			continue;
		}
		args.push(arg);
	}

	// Resolve full claude path (handles .cmd shims on Windows)
	let claudePath = "claude";
	try {
		if (process.platform === "win32") {
			claudePath =
				execSync("where claude", { encoding: "utf-8" }).trim().split(/\r?\n/)[0] ?? "claude";
		} else {
			claudePath = execSync("which claude", { encoding: "utf-8" }).trim();
		}
	} catch {
		log.warn("could not resolve claude path, using 'claude'");
	}
	log.info("claudePath=" + claudePath);

	// Status line injection
	const config = await loadConfig();
	let slTemplate = config.statusLine?.template ?? "default";
	if (
		slTemplate !== "none" &&
		!(STATUSLINE_TEMPLATE_IDS as readonly string[]).includes(slTemplate)
	) {
		log.warn("unknown template '" + slTemplate + "', falling back to 'default'");
		slTemplate = "default";
	}
	if (slTemplate !== "none") {
		const scriptPath = await ensureStatusLineScript();
		const language = config.language ?? "en";
		const slEnvVars = getStatusLineEnvVars(provider, model, slTemplate, language);
		// Inject OAuth token for Anthropic providers (usage limits)
		if (provider.type === "oauth") {
			slEnvVars["MCLAUDE_SHOW_USAGE"] = "1";
			const creds = readOAuthCredentials(provider.id);
			if (creds) {
				slEnvVars["MCLAUDE_OAUTH_TOKEN"] = creds.accessToken;
			}
			// Pass config dir so the script can read fresh tokens
			if (installationId && installationId !== DEFAULT_INSTALLATION_ID) {
				slEnvVars["MCLAUDE_CLAUDE_CONFIG_DIR"] = getInstallationPath(installationId);
			}
		}
		args.push("--settings", buildStatusLineSettingsJson(scriptPath, slEnvVars));
		log.info("statusline template=" + slTemplate);
	}

	// Apply user-selected env vars LAST (after buildClaudeEnv cleanup of CLAUDE_CODE_* vars)
	if (selectedEnvVars) {
		for (const [key, value] of Object.entries(selectedEnvVars)) {
			env[key] = value;
		}
	}

	log.info("spawning claude, args=" + JSON.stringify(args));

	// Log env keys without sensitive values
	const sensitiveKeys = new Set([
		"ANTHROPIC_AUTH_TOKEN",
		"ANTHROPIC_API_KEY",
		"OPENROUTER_API_KEY",
		"CLAUDE_CODE_OAUTH_TOKEN",
		"MCLAUDE_OAUTH_TOKEN",
	]);
	const sanitizedEnv: Record<string, string> = {};
	for (const k of Object.keys(env).filter(
		(k) => k.startsWith("ANTHROPIC") || k.startsWith("CLAUDE") || k.startsWith("OPENROUTER"),
	)) {
		const v = env[k];
		sanitizedEnv[k] = sensitiveKeys.has(k) && v ? v.slice(0, 4) + "***" : (v ?? "");
	}
	log.debug("env=" + JSON.stringify(sanitizedEnv));

	return new Promise<number>((resolve, reject) => {
		const child = spawn(claudePath, args, {
			stdio: "inherit",
			env,
		});

		child.on("error", (err) => {
			log.error("spawn error", err);
			const msg = err.message;
			if (msg.includes("ENOENT") || msg.includes("Failed to spawn")) {
				console.error('Error: "claude" not found in PATH.\n');
				console.error("Install Claude Code:");
				console.error("  macOS/Linux/WSL:  curl -fsSL https://claude.ai/install.sh | bash");
				console.error("  Windows:          irm https://claude.ai/install.ps1 | iex");
				console.error("  Homebrew:         brew install --cask claude-code");
				resolve(1);
			} else {
				reject(err);
			}
		});

		child.on("close", (code, signal) => {
			log.info("child closed, code=" + code + ", signal=" + signal);
			resolve(code ?? 1);
		});
	});
}

export async function runClaudeDefault(
	extraArgs: string[] = [],
	installationId?: string,
	selectedEnvVars?: Record<string, string>,
): Promise<number> {
	// Track env vars we set so we can clean them up after spawn
	const addedEnvKeys: string[] = [];

	// Set installation dir for custom installations
	if (installationId && installationId !== DEFAULT_INSTALLATION_ID) {
		process.env["CLAUDE_CONFIG_DIR"] = getInstallationPath(installationId);
		addedEnvKeys.push("CLAUDE_CONFIG_DIR");
	}

	// Build args (no --model flag)
	const args: string[] = [];
	let skipNext = false;
	for (let i = 0; i < extraArgs.length; i++) {
		if (skipNext) {
			skipNext = false;
			continue;
		}
		const arg = extraArgs[i]!;
		if (arg === "--model" || arg === "-m") {
			skipNext = true;
			continue;
		}
		if (arg.startsWith("--model=")) {
			continue;
		}
		args.push(arg);
	}

	// Resolve full claude path
	let claudePath = "claude";
	try {
		if (process.platform === "win32") {
			claudePath =
				execSync("where claude", { encoding: "utf-8" }).trim().split(/\r?\n/)[0] ?? "claude";
		} else {
			claudePath = execSync("which claude", { encoding: "utf-8" }).trim();
		}
	} catch {
		log.warn("could not resolve claude path, using 'claude'");
	}

	// Status line injection
	const config = await loadConfig();
	let slTemplate = config.statusLine?.template ?? "default";
	if (
		slTemplate !== "none" &&
		!(STATUSLINE_TEMPLATE_IDS as readonly string[]).includes(slTemplate)
	) {
		slTemplate = "default";
	}
	if (slTemplate !== "none") {
		const scriptPath = await ensureStatusLineScript();
		const language = config.language ?? "en";
		const slEnvVars: Record<string, string> = {
			MCLAUDE_PROVIDER_NAME: "",
			MCLAUDE_MODEL: "",
			MCLAUDE_STATUSLINE_TEMPLATE: slTemplate,
			MCLAUDE_LANG: language,
			MCLAUDE_SHOW_USAGE: "1",
		};
		// Inject OAuth token for default Anthropic launch (usage limits)
		const defaultToken = readDefaultOAuthToken();
		if (defaultToken) {
			slEnvVars["MCLAUDE_OAUTH_TOKEN"] = defaultToken;
		}
		// Pass config dir for isolated installations
		if (installationId && installationId !== DEFAULT_INSTALLATION_ID) {
			slEnvVars["MCLAUDE_CLAUDE_CONFIG_DIR"] = getInstallationPath(installationId);
		}
		args.push("--settings", buildStatusLineSettingsJson(scriptPath, slEnvVars));
		log.info("statusline template=" + slTemplate + " (default launch)");
	}

	// Apply user-selected env vars
	if (selectedEnvVars) {
		for (const [key, value] of Object.entries(selectedEnvVars)) {
			process.env[key] = value;
			addedEnvKeys.push(key);
		}
	}

	log.info("spawning claude (default), args=" + JSON.stringify(args));

	return new Promise<number>((resolve, reject) => {
		// No explicit env — inherit process.env natively
		const child = spawn(claudePath, args, {
			stdio: "inherit",
		});

		const cleanup = () => {
			for (const key of addedEnvKeys) {
				delete process.env[key];
			}
		};

		child.on("error", (err) => {
			cleanup();
			log.error("spawn error", err);
			const msg = err.message;
			if (msg.includes("ENOENT") || msg.includes("Failed to spawn")) {
				console.error('Error: "claude" not found in PATH.\n');
				console.error("Install Claude Code:");
				console.error("  macOS/Linux/WSL:  curl -fsSL https://claude.ai/install.sh | bash");
				console.error("  Windows:          irm https://claude.ai/install.ps1 | iex");
				console.error("  Homebrew:         brew install --cask claude-code");
				resolve(1);
			} else {
				reject(err);
			}
		});

		child.on("close", (code, signal) => {
			cleanup();
			log.info("child closed (default), code=" + code + ", signal=" + signal);
			resolve(code ?? 1);
		});
	});
}
