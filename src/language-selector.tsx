import { render } from "ink";
import React from "react";
import { LanguageSelector } from "./components/common/LanguageSelector.tsx";
import { debugLog } from "./debug.ts";
import { I18nProvider } from "./i18n/context.tsx";

export async function selectLanguage(): Promise<string> {
	process.stdout.write("\x1b[?1049h");

	const exitAlternateScreen = () => {
		process.stdout.write("\x1b[?1049l");
	};

	const handleSigint = () => {
		exitAlternateScreen();
		process.exit(0);
	};
	process.on("SIGINT", handleSigint);

	return new Promise((resolve, reject) => {
		let capturedLocale: string | null = null;

		try {
			const { waitUntilExit, unmount } = render(
				<I18nProvider>
					<LanguageSelector onSelect={(locale) => {
						debugLog("language-selector: locale selected=" + locale);
						capturedLocale = locale;
						process.off("SIGINT", handleSigint);
						try {
							unmount();
						} catch (err) {
							debugLog("language-selector: unmount() THREW: " + (err instanceof Error ? (err.stack ?? err.message) : String(err)));
						}
					}} />
				</I18nProvider>,
			);

			waitUntilExit().then(() => {
				process.off("SIGINT", handleSigint);
				exitAlternateScreen();
				if (capturedLocale) {
					debugLog("language-selector: resolving with locale=" + capturedLocale);
					resolve(capturedLocale);
				} else {
					debugLog("language-selector: no locale captured, rejecting");
					reject(new Error("No language selected"));
				}
			}).catch((err) => {
				debugLog("language-selector: waitUntilExit THREW: " + (err instanceof Error ? (err.stack ?? err.message) : String(err)));
				exitAlternateScreen();
				reject(err);
			});
		} catch (err) {
			debugLog("language-selector: render THREW: " + (err instanceof Error ? (err.stack ?? err.message) : String(err)));
			exitAlternateScreen();
			reject(err);
		}
	});
}
