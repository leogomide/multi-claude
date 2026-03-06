import { render } from "ink";
import React from "react";
import { UnifiedApp } from "./components/app/UnifiedApp.tsx";
import { createLogger } from "./debug.ts";

const log = createLogger("app");

import { I18nProvider } from "./i18n/context.tsx";
import type { ConfiguredProvider } from "./schema.ts";

export type AppResult =
	| {
			type: "start-claude";
			provider: ConfiguredProvider;
			model: string;
			installationId: string;
			selectedFlags: string[];
			selectedEnvVars?: Record<string, string>;
	  }
	| { type: "oauth-login"; providerId: string; providerName: string; isNew: boolean }
	| { type: "run-update" };

export async function runApp(cliArgs: string[] = []): Promise<AppResult | null> {
	process.stdout.write("\x1b[?1049h");

	const exitAlternateScreen = () => {
		process.stdout.write("\x1b[?1049l");
	};

	const handleSigint = () => {
		exitAlternateScreen();
		process.exit(0);
	};
	process.on("SIGINT", handleSigint);

	return new Promise((resolve) => {
		let resolved = false;
		let unmount: (() => void) | null = null;

		const doResolve = (result: AppResult | null) => {
			if (resolved) return;
			resolved = true;
			process.off("SIGINT", handleSigint);
			try {
				unmount?.();
			} catch (err) {
				log.error("unmount() threw", err);
			}
			exitAlternateScreen();
			resolve(result);
		};

		try {
			const renderResult = render(
				<I18nProvider>
					<UnifiedApp
						cliArgs={cliArgs}
						onStartClaude={(result) => {
							log.info("onStartClaude fired, provider=" + result.provider.name);
							doResolve({
								type: "start-claude",
								provider: result.provider,
								model: result.model,
								installationId: result.installationId,
								selectedFlags: result.selectedFlags,
								selectedEnvVars: result.selectedEnvVars,
							});
						}}
						onOAuthLogin={(result) => {
							log.info("onOAuthLogin fired, provider=" + result.providerName);
							doResolve({
								type: "oauth-login",
								providerId: result.providerId,
								providerName: result.providerName,
								isNew: result.isNew,
							});
						}}
						onRunUpdate={() => {
							log.info("onRunUpdate fired");
							doResolve({ type: "run-update" });
						}}
					/>
				</I18nProvider>,
			);
			unmount = renderResult.unmount;

			// Fallback: user exits via Ctrl+C or useApp().exit()
			renderResult
				.waitUntilExit()
				.then(() => {
					doResolve(null);
				})
				.catch((err) => {
					log.error("waitUntilExit threw", err);
					doResolve(null);
				});
		} catch (err) {
			log.error("render threw", err);
			exitAlternateScreen();
			resolve(null);
		}
	});
}
