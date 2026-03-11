import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { isEncryptedPayload } from "./crypto.ts";
import { CONFIG_DIR, loadConfig, migrateInstallations, migrateProviderTemplateIds, saveConfig, setSessionMasterPassword } from "./config.ts";
import { encryptCredential, hasMasterPassword, needsEncryptionMigration, verifyMasterPassword } from "./credential-store.ts";
import { createLogger, formatError, initLogger } from "./debug.ts";
import { i18n, initLocale } from "./i18n/index.ts";
import { clearCachedKey, initKeystore, resetKeyFile } from "./keystore.ts";
import { configSchema, DEFAULT_LAUNCH_TEMPLATE_ID } from "./schema.ts";

export const SELECTION_FILE = join(CONFIG_DIR, "last-selection.json");

initLogger("tui");
const log = createLogger("tui-process");

process.on("uncaughtException", (err) => {
	log.error("UNCAUGHT EXCEPTION", err);
	console.error("mclaude crash:", formatError(err));
	process.exit(1);
});
process.on("unhandledRejection", (reason) => {
	log.error("UNHANDLED REJECTION", reason);
	console.error("mclaude crash (unhandled rejection):", formatError(reason));
	process.exit(1);
});
process.on("exit", (code) => {
	log.info("process exit with code=" + code);
});

log.info("started");

// CLI args passed from parent process
const cliArgs = process.argv.slice(2);
log.debug("cliArgs=" + JSON.stringify(cliArgs));

await initKeystore();

// Pre-load config to check master password BEFORE decryption
const preConfig = await loadConfig();

if (hasMasterPassword(preConfig)) {
	// Initialize i18n early so the master password prompt is translated
	if (preConfig.language) {
		initLocale(preConfig.language);
	}

	const promptPassword = (label: string): Promise<string> => {
		return new Promise<string>((resolve) => {
			process.stdout.write(label);
			let input = "";
			process.stdin.setEncoding("utf-8");
			if (process.stdin.isTTY && process.stdin.setRawMode) {
				process.stdin.setRawMode(true);
			}
			const onData = (data: string) => {
				for (const ch of data) {
					if (ch === "\r" || ch === "\n") {
						process.stdout.write("\n");
						process.stdin.removeListener("data", onData);
						if (process.stdin.isTTY && process.stdin.setRawMode) {
							process.stdin.setRawMode(false);
						}
						resolve(input);
						return;
					}
					if (ch === "\x03") {
						process.exit(1);
					}
					if (ch === "\x7f" || ch === "\b") {
						if (input.length > 0) {
							input = input.slice(0, -1);
							process.stdout.write("\b \b");
						}
						continue;
					}
					input += ch;
					process.stdout.write("*");
				}
			};
			process.stdin.on("data", onData);
			process.stdin.resume();
		});
	};

	const waitForSingleKey = (): Promise<string> => {
		return new Promise<string>((resolve) => {
			process.stdin.setEncoding("utf-8");
			if (process.stdin.isTTY && process.stdin.setRawMode) {
				process.stdin.setRawMode(true);
			}
			const onData = (data: string) => {
				const ch = data[0] ?? "";
				process.stdin.removeListener("data", onData);
				if (process.stdin.isTTY && process.stdin.setRawMode) {
					process.stdin.setRawMode(false);
				}
				if (ch === "\x03") {
					process.exit(1);
				}
				resolve(ch);
			};
			process.stdin.on("data", onData);
			process.stdin.resume();
		});
	};

	const performMasterPasswordReset = async (): Promise<void> => {
		const configFile = join(CONFIG_DIR, "config.json");
		const raw = await readFile(configFile, "utf-8");
		const parsed = JSON.parse(raw);
		const rawConfig = configSchema.parse(parsed);

		// Invalidate all encrypted API keys
		for (const provider of rawConfig.providers) {
			if (provider.apiKey && isEncryptedPayload(provider.apiKey)) {
				provider.apiKey = "";
				provider.apiKeyValid = false;
			}
		}

		// Remove master password hash
		delete rawConfig.masterPasswordHash;

		// Write config directly (no encryption needed since keys are cleared)
		await writeFile(configFile, JSON.stringify(rawConfig, null, 2) + "\n", "utf-8");

		// Reset key file and re-init keystore with a fresh key
		await resetKeyFile();
		clearCachedKey();
		await initKeystore();

		log.info("master password force-removed, all API keys invalidated");
	};

	// Master password loop: prompt → verify → retry/reset
	let authenticated = false;
	while (!authenticated) {
		const password = await promptPassword(i18n.t("settings.masterPassword") + ": ");

		if (verifyMasterPassword(password, preConfig)) {
			setSessionMasterPassword(password);
			authenticated = true;
		} else {
			process.stdout.write("\n");
			console.error(i18n.t("settings.masterPasswordInvalid"));
			process.stdout.write("\n");
			console.log(i18n.t("settings.masterPasswordResetOption"));
			console.log(i18n.t("settings.masterPasswordRetry"));
			console.log("(Ctrl+C)");
			process.stdout.write("\n");

			const key = await waitForSingleKey();
			process.stdout.write("\n");

			if (key === "r" || key === "R") {
				console.log(i18n.t("settings.masterPasswordResetWarning"));
				const confirm = await waitForSingleKey();
				process.stdout.write("\n");

				if (confirm === "y" || confirm === "Y" || confirm === "s" || confirm === "S") {
					await performMasterPasswordReset();
					console.log(i18n.t("settings.masterPasswordResetSuccess"));
					process.stdout.write("\n");
					authenticated = true;
				}
				// If not confirmed, loop continues → re-prompt
			}
			// If Enter or any other key, loop continues → re-prompt
		}
	}
}

const config = await loadConfig();
await migrateProviderTemplateIds(config);
await migrateInstallations(config);

// Migrate plaintext credentials to encrypted (saveConfig handles the actual encryption)
if (needsEncryptionMigration(config)) {
	await saveConfig(config);
	log.info("credentials migrated to encrypted");
}

if (!config.language) {
	try {
		const { selectLanguage } = await import("./language-selector.tsx");
		const locale = await selectLanguage();
		config.language = locale;
		await saveConfig(config);
	} catch (err) {
		log.error("language selection FAILED", err);
		config.language = "en";
	}
}

initLocale(config.language);

log.info("config loaded (lang=" + config.language + "), starting runApp()");

let result: Awaited<ReturnType<typeof import("./app.tsx")["runApp"]>>;
try {
	const { runApp } = await import("./app.tsx");
	result = await runApp(cliArgs);
} catch (err) {
	log.error("runApp() THREW", err);
	console.error("mclaude crash:", formatError(err));
	process.exit(1);
}

log.info("runApp() returned, result=" + (result ? `type=${result.type}` : "null"));

if (result) {
	if (result.type === "run-update") {
		log.info("update requested");
		process.exit(4);
	}

	if (result.type === "oauth-login") {
		log.info("handling OAuth login for provider=" + result.providerName);
		const oauthData = {
			type: "oauth-login" as const,
			providerId: result.providerId,
			providerName: result.providerName,
			isNew: result.isNew,
		};
		await writeFile(SELECTION_FILE, JSON.stringify(oauthData), "utf-8");
		log.info("oauth selection written to " + SELECTION_FILE);
		process.exit(3); // signal cli.ts to handle OAuth login
	}

	if (result.type === "start-claude") {
		if (
			!result.model &&
			result.provider.type !== "oauth" &&
			result.provider.templateId !== DEFAULT_LAUNCH_TEMPLATE_ID
		) {
			log.error("model is null for API provider, aborting");
			process.exit(1);
		}

		// Save selected flag names (without values) to config for next session
		try {
			const latestConfig = await loadConfig();
			latestConfig.lastFlags = result.selectedFlags.filter((f) => f.startsWith("--"));
			latestConfig.lastEnvVars = result.selectedEnvVars
				? Object.keys(result.selectedEnvVars)
				: [];
			await saveConfig(latestConfig);
			log.info("lastFlags and lastEnvVars saved to config");
		} catch (err) {
			log.warn("failed to save lastFlags: " + String(err));
		}

		const encryptedApiKey = await encryptCredential(result.provider.apiKey);
		const selection = {
			providerId: result.provider.id,
			providerName: result.provider.name,
			templateId: result.provider.templateId,
			type: result.provider.type ?? "api",
			apiKey: encryptedApiKey,
			models: result.provider.models,
			model: result.model,
			installationId: result.installationId,
			selectedFlags: result.selectedFlags,
			selectedEnvVars: result.selectedEnvVars,
		};
		await writeFile(SELECTION_FILE, JSON.stringify(selection), "utf-8");
		log.info("selection written to " + SELECTION_FILE);
		process.exit(0);
	}
}

log.info("exiting (cancelled)");
process.exit(1);
