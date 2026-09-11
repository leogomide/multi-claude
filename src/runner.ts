import type { ChildProcess, SpawnOptions } from "node:child_process";
import { rm } from "node:fs/promises";
import { getInstallationPath, loadConfig } from "./config.ts";
import { createLogger } from "./debug.ts";

const log = createLogger("runner");

import { buildClaudeEnv } from "./providers.ts";
import type { ConfiguredProvider } from "./schema.ts";
import { DEFAULT_INSTALLATION_ID } from "./schema.ts";
import { loadDotenvFromCwd } from "./services/dotenv-loader.ts";
import {
	buildStatusLineSettingsJson,
	cleanStaleSessionSettings,
	ensureStatusLineScript,
	getStatusLineEnvVars,
	STATUSLINE_TEMPLATE_IDS,
	writeSessionSettings,
} from "./statusline.ts";
import { isClaudeLaunchError, printClaudeNotFound, spawnClaude } from "./utils/claude-bin.ts";

/**
 * Spawns claude and resolves with its exit code. The session settings file is
 * deleted when the child ends or fails to start; `onDone` runs in both cases.
 */
function launchClaude(
	args: string[],
	options: SpawnOptions,
	settingsPath: string | undefined,
	label: string,
	onDone?: () => void,
): Promise<number> {
	return new Promise<number>((res, rej) => {
		let settled = false;
		// Callers may process.exit right after we settle, so the session file is
		// removed before settling instead of fire-and-forget.
		const removeSettings = () =>
			settingsPath ? rm(settingsPath, { force: true }).catch(() => {}) : Promise.resolve();
		const resolve = (code: number) => void removeSettings().then(() => res(code));
		const reject = (err: Error) => void removeSettings().then(() => rej(err));
		const finish = () => {
			if (settled) return false;
			settled = true;
			onDone?.();
			return true;
		};

		const onError = (err: Error) => {
			if (!finish()) return;
			log.error("spawn error", err);
			if (isClaudeLaunchError(err)) {
				printClaudeNotFound();
				resolve(1);
			} else {
				reject(err);
			}
		};

		let child: ChildProcess;
		try {
			child = spawnClaude(args, options);
		} catch (err) {
			// Node throws synchronously for some launch failures (e.g. EINVAL on .cmd).
			onError(err as Error);
			return;
		}

		child.on("error", onError);
		child.on("close", (code, signal) => {
			if (!finish()) return;
			log.info("child closed" + label + ", code=" + code + ", signal=" + signal);
			resolve(code ?? 1);
		});
	});
}

export async function runClaude(
	provider: ConfiguredProvider,
	model: string,
	extraArgs: string[] = [],
	installationId?: string,
	selectedEnvVars?: Record<string, string>,
	loadDotenv?: boolean,
	contextWindowTokens?: number,
): Promise<number> {
	await cleanStaleSessionSettings();

	// Inject .env vars into process.env BEFORE buildClaudeEnv copies it.
	// Provider's configureEnv runs after and overrides any conflicting keys,
	// keeping precedence: .env < provider < user-selected.
	const addedDotenvKeys: string[] = [];
	if (loadDotenv) {
		const dotenvVars = loadDotenvFromCwd();
		for (const [k, v] of Object.entries(dotenvVars)) {
			process.env[k] = v;
			addedDotenvKeys.push(k);
		}
	}

	const env = buildClaudeEnv(provider, model, installationId, contextWindowTokens);

	// Clean up .env additions from process.env: buildClaudeEnv already copied
	// them into the local `env`, so the spawned child still receives them.
	for (const k of addedDotenvKeys) {
		delete process.env[k];
	}

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
	let settingsPath: string | undefined;
	if (slTemplate !== "none") {
		const scriptPath = await ensureStatusLineScript();
		const language = config.language ?? "en";
		const slEnvVars = getStatusLineEnvVars(provider, model, slTemplate, language);
		settingsPath = await writeSessionSettings(buildStatusLineSettingsJson(scriptPath, slEnvVars));
		args.push("--settings", settingsPath);
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
	]);
	const sanitizedEnv: Record<string, string> = {};
	for (const k of Object.keys(env).filter(
		(k) => k.startsWith("ANTHROPIC") || k.startsWith("CLAUDE") || k.startsWith("OPENROUTER"),
	)) {
		const v = env[k];
		sanitizedEnv[k] = sensitiveKeys.has(k) && v ? v.slice(0, 4) + "***" : (v ?? "");
	}
	log.debug("env=" + JSON.stringify(sanitizedEnv));

	return launchClaude(args, { stdio: "inherit", env }, settingsPath, "");
}

export async function runClaudeDefault(
	extraArgs: string[] = [],
	installationId?: string,
	selectedEnvVars?: Record<string, string>,
	loadDotenv?: boolean,
): Promise<number> {
	await cleanStaleSessionSettings();

	// Track env vars we set so we can clean them up after spawn
	const addedEnvKeys: string[] = [];

	// Load .env first so user-selected env vars (applied later) win on conflict
	if (loadDotenv) {
		const dotenvVars = loadDotenvFromCwd();
		for (const [k, v] of Object.entries(dotenvVars)) {
			process.env[k] = v;
			addedEnvKeys.push(k);
		}
	}

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

	// Status line injection
	const config = await loadConfig();
	let slTemplate = config.statusLine?.template ?? "default";
	if (
		slTemplate !== "none" &&
		!(STATUSLINE_TEMPLATE_IDS as readonly string[]).includes(slTemplate)
	) {
		slTemplate = "default";
	}
	let settingsPath: string | undefined;
	if (slTemplate !== "none") {
		const scriptPath = await ensureStatusLineScript();
		const language = config.language ?? "en";
		const slEnvVars: Record<string, string> = {
			MCLAUDE_PROVIDER_NAME: "",
			MCLAUDE_MODEL: "",
			MCLAUDE_STATUSLINE_TEMPLATE: slTemplate,
			MCLAUDE_LANG: language,
		};
		settingsPath = await writeSessionSettings(buildStatusLineSettingsJson(scriptPath, slEnvVars));
		args.push("--settings", settingsPath);
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

	const cleanup = () => {
		for (const key of addedEnvKeys) {
			delete process.env[key];
		}
	};

	// No explicit env — inherit process.env natively
	return launchClaude(args, { stdio: "inherit" }, settingsPath, " (default)", cleanup);
}
