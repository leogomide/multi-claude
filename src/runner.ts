import { spawn, execSync } from "node:child_process";
import { getInstallationPath, loadConfig } from "./config.ts";
import { createLogger } from "./debug.ts";

const log = createLogger("runner");
import { buildClaudeEnv } from "./providers.ts";
import { DEFAULT_INSTALLATION_ID } from "./schema.ts";
import type { ConfiguredProvider } from "./schema.ts";
import { STATUSLINE_TEMPLATE_IDS, buildStatusLineSettingsJson, ensureStatusLineScript, getStatusLineEnvVars } from "./statusline.ts";

export async function runClaude(
	provider: ConfiguredProvider,
	model: string,
	extraArgs: string[] = [],
	installationId?: string,
): Promise<number> {
	const env = buildClaudeEnv(provider, model, installationId);
	if (!env) {
		console.error('Error: template "' + provider.templateId + '" not found.');
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
			claudePath = execSync("where claude", { encoding: "utf-8" }).trim().split(/\r?\n/)[0] ?? "claude";
		} else {
			claudePath = execSync("which claude", { encoding: "utf-8" }).trim();
		}
	} catch {
		log.warn("could not resolve claude path, using 'claude'");
	}
	log.info("claudePath=" + claudePath);

	// Status line injection
	const config = await loadConfig();
	let slTemplate = config.statusLine?.template ?? "full";
	if (slTemplate !== "none" && !(STATUSLINE_TEMPLATE_IDS as readonly string[]).includes(slTemplate)) {
		log.warn("unknown template '" + slTemplate + "', falling back to 'full'");
		slTemplate = "full";
	}
	if (slTemplate !== "none") {
		const scriptPath = await ensureStatusLineScript();
		const language = config.language ?? "en";
		Object.assign(env, getStatusLineEnvVars(provider, model, slTemplate, language));
		args.push("--settings", buildStatusLineSettingsJson(scriptPath));
		log.info("statusline template=" + slTemplate);
	}

	log.info("spawning claude, args=" + JSON.stringify(args));
	log.debug("env keys=" + JSON.stringify(Object.keys(env).filter(k => k.startsWith("ANTHROPIC") || k.startsWith("CLAUDE"))));

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
		if (skipNext) { skipNext = false; continue; }
		const arg = extraArgs[i]!;
		if (arg === "--model" || arg === "-m") { skipNext = true; continue; }
		if (arg.startsWith("--model=")) { continue; }
		args.push(arg);
	}

	// Resolve full claude path
	let claudePath = "claude";
	try {
		if (process.platform === "win32") {
			claudePath = execSync("where claude", { encoding: "utf-8" }).trim().split(/\r?\n/)[0] ?? "claude";
		} else {
			claudePath = execSync("which claude", { encoding: "utf-8" }).trim();
		}
	} catch {
		log.warn("could not resolve claude path, using 'claude'");
	}

	// Status line injection
	const config = await loadConfig();
	let slTemplate = config.statusLine?.template ?? "full";
	if (slTemplate !== "none" && !(STATUSLINE_TEMPLATE_IDS as readonly string[]).includes(slTemplate)) {
		slTemplate = "full";
	}
	if (slTemplate !== "none") {
		const scriptPath = await ensureStatusLineScript();
		const language = config.language ?? "en";
		process.env["MCLAUDE_PROVIDER_NAME"] = "";
		process.env["MCLAUDE_MODEL"] = "";
		process.env["MCLAUDE_STATUSLINE_TEMPLATE"] = slTemplate;
		process.env["MCLAUDE_LANG"] = language;
		addedEnvKeys.push("MCLAUDE_PROVIDER_NAME", "MCLAUDE_MODEL", "MCLAUDE_STATUSLINE_TEMPLATE", "MCLAUDE_LANG");
		args.push("--settings", buildStatusLineSettingsJson(scriptPath));
		log.info("statusline template=" + slTemplate + " (default launch)");
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
