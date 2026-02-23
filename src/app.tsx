import { render } from "ink";
import React from "react";
import { UnifiedApp } from "./components/app/UnifiedApp.tsx";
import { debugLog } from "./debug.ts";
import { I18nProvider } from "./i18n/context.tsx";
import type { ConfiguredProvider } from "./schema.ts";

export type AppResult =
	| { type: "start-claude"; provider: ConfiguredProvider; model: string; installationId: string }
	| { type: "oauth-login"; providerId: string; providerName: string; isNew: boolean };

export async function runApp(): Promise<AppResult | null> {
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
				debugLog("app.tsx: unmount() THREW: " + (err instanceof Error ? (err.stack ?? err.message) : String(err)));
			}
			exitAlternateScreen();
			resolve(result);
		};

		try {
			const renderResult = render(
				<I18nProvider>
					<UnifiedApp
						onStartClaude={(result) => {
							debugLog("app.tsx: onStartClaude fired, provider=" + result.provider.name);
							doResolve({ type: "start-claude", provider: result.provider, model: result.model, installationId: result.installationId });
						}}
						onOAuthLogin={(result) => {
							debugLog("app.tsx: onOAuthLogin fired, provider=" + result.providerName);
							doResolve({ type: "oauth-login", providerId: result.providerId, providerName: result.providerName, isNew: result.isNew });
						}}
					/>
				</I18nProvider>,
			);
			unmount = renderResult.unmount;

			// Fallback: user exits via Ctrl+C or useApp().exit()
			renderResult.waitUntilExit().then(() => {
				doResolve(null);
			}).catch((err) => {
				debugLog("app.tsx: waitUntilExit THREW: " + (err instanceof Error ? (err.stack ?? err.message) : String(err)));
				doResolve(null);
			});
		} catch (err) {
			debugLog("app.tsx: render THREW: " + (err instanceof Error ? (err.stack ?? err.message) : String(err)));
			exitAlternateScreen();
			resolve(null);
		}
	});
}
