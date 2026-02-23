import { render } from "ink";
import React from "react";
import { LanguageSelector } from "./components/common/LanguageSelector.tsx";
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

	return new Promise((resolve) => {
		let capturedLocale: string | null = null;

		const { waitUntilExit, unmount } = render(
			<I18nProvider>
				<LanguageSelector onSelect={(locale) => {
					capturedLocale = locale;
					process.off("SIGINT", handleSigint);
					unmount();
				}} />
			</I18nProvider>,
		);

		waitUntilExit().then(() => {
			process.off("SIGINT", handleSigint);
			exitAlternateScreen();
			if (capturedLocale) {
				resolve(capturedLocale);
			}
		});
	});
}
