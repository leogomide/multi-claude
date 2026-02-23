import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadConfig, migrateInstallations, saveConfig, CONFIG_DIR } from "./config.ts";
import { debugLog } from "./debug.ts";
import { initLocale } from "./i18n/index.ts";

export const SELECTION_FILE = join(CONFIG_DIR, "last-selection.json");

process.on("uncaughtException", (err) => {
	const detail = err instanceof Error ? (err.stack ?? err.message) : JSON.stringify(err);
	debugLog("tui-process: UNCAUGHT EXCEPTION: " + detail);
	console.error("mclaude crash:", detail);
	process.exit(1);
});
process.on("unhandledRejection", (reason) => {
	const detail = reason instanceof Error ? (reason.stack ?? reason.message) : String(reason);
	debugLog("tui-process: UNHANDLED REJECTION: " + detail);
	console.error("mclaude crash (unhandled rejection):", detail);
	process.exit(1);
});
process.on("exit", (code) => {
	debugLog("tui-process: process exit with code=" + code);
});

debugLog("tui-process: started");

const config = await loadConfig();
await migrateInstallations(config);

if (!config.language) {
	try {
		const { selectLanguage } = await import("./language-selector.tsx");
		const locale = await selectLanguage();
		config.language = locale;
		await saveConfig(config);
	} catch (err) {
		debugLog("tui-process: language selection FAILED: " + (err instanceof Error ? (err.stack ?? err.message) : String(err)));
		config.language = "en";
	}
}

initLocale(config.language);

debugLog("tui-process: config loaded (lang=" + config.language + "), starting runApp()");

let result: Awaited<ReturnType<typeof import("./app.tsx")["runApp"]>>;
try {
	const { runApp } = await import("./app.tsx");
	result = await runApp();
} catch (err) {
	debugLog("tui-process: runApp() THREW: " + (err instanceof Error ? (err.stack ?? err.message) : String(err)));
	console.error("mclaude crash:", err instanceof Error ? err.message : String(err));
	process.exit(1);
}

debugLog("tui-process: runApp() returned, result=" + (result ? `type=${result.type}` : "null"));

if (result) {
	if (result.type === "oauth-login") {
		debugLog("tui-process: handling OAuth login for provider=" + result.providerName);
		const oauthData = {
			type: "oauth-login" as const,
			providerId: result.providerId,
			providerName: result.providerName,
			isNew: result.isNew,
		};
		await writeFile(SELECTION_FILE, JSON.stringify(oauthData), "utf-8");
		debugLog("tui-process: oauth selection written to " + SELECTION_FILE);
		process.exit(3); // signal cli.ts to handle OAuth login
	}

	if (result.type === "start-claude") {
		if (!result.model && result.provider.type !== "oauth") {
			debugLog("tui-process: model is null for API provider, aborting");
			process.exit(1);
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
		};
		await writeFile(SELECTION_FILE, JSON.stringify(selection), "utf-8");
		debugLog("tui-process: selection written to " + SELECTION_FILE);
		process.exit(0);
	}
}

debugLog("tui-process: exiting (cancelled)");
process.exit(1);
