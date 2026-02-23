import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureAccountDir, isAccountAuthenticated, loadConfig, removeAccountDir, saveConfig, CONFIG_DIR } from "./config.ts";
import { debugLog } from "./debug.ts";
import { initLocale } from "./i18n/index.ts";

export const SELECTION_FILE = join(CONFIG_DIR, "last-selection.json");

process.on("uncaughtException", (err) => {
	debugLog("tui-process: UNCAUGHT EXCEPTION: " + (err instanceof Error ? (err.stack ?? err.message) : JSON.stringify(err)));
	process.exit(1);
});
process.on("unhandledRejection", (reason) => {
	debugLog("tui-process: UNHANDLED REJECTION: " + String(reason));
	process.exit(1);
});

debugLog("tui-process: started");

const config = await loadConfig();

if (!config.language) {
	const { selectLanguage } = await import("./language-selector.tsx");
	const locale = await selectLanguage();
	config.language = locale;
	await saveConfig(config);
}

initLocale(config.language);

debugLog("tui-process: config loaded, starting runApp()");

const { runApp } = await import("./app.tsx");
const result = await runApp();

debugLog("tui-process: runApp() returned, result=" + (result ? `type=${result.type}` : "null"));

if (result) {
	if (result.type === "oauth-login") {
		debugLog("tui-process: handling OAuth login for provider=" + result.providerName);
		const accountDir = await ensureAccountDir(result.providerId);

		const loginResult = spawnSync("claude", ["login"], {
			stdio: "inherit",
			env: { ...process.env, CLAUDE_CONFIG_DIR: accountDir },
		});

		if (loginResult.status === 0 && isAccountAuthenticated(result.providerId)) {
			debugLog("tui-process: OAuth login successful");
			console.log(`\n✓ Conta "${result.providerName}" autenticada com sucesso!\n`);
			process.exit(2); // signal cli.ts to restart TUI
		} else {
			debugLog("tui-process: OAuth login failed");
			if (result.isNew) {
				// Only remove provider if it was just created (not re-auth)
				const cfg = await loadConfig();
				cfg.providers = cfg.providers.filter((p) => p.id !== result.providerId);
				await saveConfig(cfg);
				await removeAccountDir(result.providerId);
				console.error("\n✗ Autenticação falhou. Provedor não foi adicionado.\n");
			} else {
				console.error("\n✗ Re-autenticação falhou.\n");
			}
			process.exit(2); // restart TUI so user can try again
		}
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
