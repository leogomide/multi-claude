import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CONFIG_DIR, loadConfig, migrateInstallations, migrateProviderTemplateIds, saveConfig } from "./config.ts";
import { createLogger, formatError, initLogger } from "./debug.ts";
import { initLocale } from "./i18n/index.ts";
import { DEFAULT_LAUNCH_TEMPLATE_ID } from "./schema.ts";

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

const config = await loadConfig();
await migrateProviderTemplateIds(config);
await migrateInstallations(config);

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

		const selection = {
			providerId: result.provider.id,
			providerName: result.provider.name,
			templateId: result.provider.templateId,
			type: result.provider.type ?? "api",
			apiKey: result.provider.apiKey,
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
