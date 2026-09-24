import { cleanup, render } from "ink-testing-library";
import React from "react";
import { afterEach, describe, expect, test } from "vitest";
import { I18nProvider } from "../../i18n/context.tsx";
import { i18n, initLocale } from "../../i18n/index.ts";
import { SPONSOR_BANNER_URL, SponsorBanner, TAGLINE_KEYS } from "./SponsorBanner.tsx";

afterEach(() => {
	cleanup();
	initLocale("en");
});

function renderBanner() {
	return render(
		<I18nProvider>
			<SponsorBanner />
		</I18nProvider>,
	);
}

describe("SponsorBanner", () => {
	test("renders the brand, the link and one of the taglines", () => {
		initLocale("en");
		const frame = renderBanner().lastFrame()!;

		expect(frame).toContain("★ Flatt");
		expect(frame).toContain("flatt.com.br ↗");
		const taglines = TAGLINE_KEYS.map((key) => i18n.t(key));
		expect(taglines.some((tagline) => frame.includes(tagline))).toBe(true);
	});

	test("links to the sponsor URL tagged as coming from the footer", () => {
		expect(SPONSOR_BANNER_URL).toContain("utm_source=mclaude");
		expect(SPONSOR_BANNER_URL).toContain("utm_content=footer");
		expect(renderBanner().lastFrame()!).toContain(`\x1b]8;;${SPONSOR_BANNER_URL}\x07`);
	});

	test("has a translated tagline in every locale", () => {
		for (const locale of ["en", "pt-BR", "es"]) {
			initLocale(locale);
			for (const key of TAGLINE_KEYS) {
				expect(i18n.t(key)).not.toBe("");
			}
		}
	});
});
