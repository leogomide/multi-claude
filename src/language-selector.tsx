import { render } from "ink";
import React from "react";
import { LanguageSelector } from "./components/common/LanguageSelector.tsx";
import { createLogger } from "./debug.ts";

const log = createLogger("lang-selector");
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
						log.info("locale selected=" + locale);
						capturedLocale = locale;
						process.off("SIGINT", handleSigint);
						try {
							unmount();
						} catch (err) {
							log.error("unmount() threw", err);
						}
					}} />
				</I18nProvider>,
			);

			waitUntilExit().then(() => {
				process.off("SIGINT", handleSigint);
				exitAlternateScreen();
				if (capturedLocale) {
					log.info("resolving with locale=" + capturedLocale);
					resolve(capturedLocale);
				} else {
					log.info("no locale captured, rejecting");
					reject(new Error("No language selected"));
				}
			}).catch((err) => {
				log.error("waitUntilExit threw", err);
				exitAlternateScreen();
				reject(err);
			});
		} catch (err) {
			log.error("render threw", err);
			exitAlternateScreen();
			reject(err);
		}
	});
}
