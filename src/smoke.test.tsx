import { afterEach, describe, expect, mock, test } from "bun:test";
import React from "react";

// ── Fake data ────────────────────────────────────────────────────────
const fakeProviders = [
	{
		id: "test-minimax",
		name: "My MiniMax",
		templateId: "minimax",
		apiKey: "sk-minimax-123",
		models: ["minimax-01"],
	},
	{
		id: "test-openrouter",
		name: "My OpenRouter",
		templateId: "openrouter",
		apiKey: "sk-test-123",
		models: ["openai/gpt-4o"],
	},
];

// ── Module mocks (hoisted before imports) ────────────────────────────
mock.module("./config.ts", () => ({
	loadConfig: async () => ({ providers: fakeProviders, language: "en", installations: [] }),
	saveConfig: async () => {},
	CONFIG_DIR: "/tmp/test-mclaude",
	isAccountAuthenticated: () => false,
}));

mock.module("./services/version-check.ts", () => ({
	checkForUpdate: async () => ({ updateAvailable: false }),
	compareSemver: () => 0,
}));

mock.module("./changelog.ts", () => ({
	parseChangelog: async () => [],
}));

mock.module("./services/api-models.ts", () => ({
	hasApiModelFetching: (templateId: string) =>
		templateId === "openrouter" || templateId === "requesty",
	hasApiKeyValidation: (templateId: string) =>
		templateId === "openrouter" || templateId === "requesty",
	fetchApiModels: async () => ({
		ok: true as const,
		models: [
			{
				id: "openai/gpt-4o",
				name: "GPT-4o",
				context_length: 128_000,
				pricing: { prompt: "0.000005", completion: "0.000015" },
			},
			{
				id: "anthropic/claude-3.5-sonnet",
				name: "Claude 3.5 Sonnet",
				context_length: 200_000,
				pricing: { prompt: "0.000003", completion: "0.000015" },
			},
		],
	}),
	validateApiKey: async () => ({ valid: true }),
}));

// ── Imports (after mocks) ────────────────────────────────────────────
import { cleanup, render } from "ink-testing-library";
import { UnifiedApp } from "./components/app/UnifiedApp.tsx";
import { I18nProvider } from "./i18n/context.tsx";
import { initLocale } from "./i18n/index.ts";

// ── Helpers ──────────────────────────────────────────────────────────
initLocale("en");

const KEYS = {
	DOWN: "\x1B[B",
	UP: "\x1B[A",
	ENTER: "\r",
	ESCAPE: "\x1B",
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Write a single key and wait for Ink to process it */
async function pressKey(stdin: { write: (data: string) => void }, key: string, wait = 150) {
	stdin.write(key);
	await delay(wait);
}

/** Navigate DOWN n times, then press ENTER */
async function navigateAndSelect(stdin: { write: (data: string) => void }, downs: number) {
	for (let i = 0; i < downs; i++) {
		await pressKey(stdin, KEYS.DOWN);
	}
	await pressKey(stdin, KEYS.ENTER, 200);
}

/** Wait until lastFrame contains the expected text, polling every 50ms */
async function waitForFrame(lastFrame: () => string | undefined, text: string, timeoutMs = 3000) {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		const frame = lastFrame();
		if (frame && frame.includes(text)) return;
		await delay(50);
	}
	throw new Error(`Timed out waiting for frame to contain "${text}"`);
}

afterEach(() => {
	cleanup();
});

// ── Tests ────────────────────────────────────────────────────────────
// Current menu order (selectable items):
// 0: Default Launch (🏠)
// 1: My MiniMax (🚀)
// 2: My OpenRouter (🚀)
// 3: Manage providers (🔧)
// 4: Manage installations (📁)
// 5: Settings (⚙️)
// 6: Changelog (📋)
// 7: Exit (🚪)
describe("Smoke Test — TUI Flows", () => {
	test("1. Main menu renders with both providers", async () => {
		const onStartClaude = mock(() => {});
		const { lastFrame } = render(
			<I18nProvider>
				<UnifiedApp
					onStartClaude={onStartClaude}
					onOAuthLogin={mock(() => {})}
					onRunUpdate={mock(() => {})}
				/>
			</I18nProvider>,
		);

		await delay(200);
		const frame = lastFrame()!;

		expect(frame).toContain("My MiniMax");
		expect(frame).toContain("My OpenRouter");
		expect(frame).toContain("Start Claude Code");
		expect(frame).toContain("Manage providers");
		expect(frame).toContain("Settings");
		expect(frame).toContain("Exit");
	});

	test("2. Navigate to Manage Providers", async () => {
		const onStartClaude = mock(() => {});
		const { lastFrame, stdin } = render(
			<I18nProvider>
				<UnifiedApp
					onStartClaude={onStartClaude}
					onOAuthLogin={mock(() => {})}
					onRunUpdate={mock(() => {})}
				/>
			</I18nProvider>,
		);

		await delay(200);

		// Menu: Default(0), MiniMax(1), OpenRouter(2), Manage providers(3)
		await navigateAndSelect(stdin, 3);

		expect(lastFrame()!).toContain("Add provider");
	}, 10000);

	test("3. Navigate to Settings", async () => {
		const onStartClaude = mock(() => {});
		const { lastFrame, stdin } = render(
			<I18nProvider>
				<UnifiedApp
					onStartClaude={onStartClaude}
					onOAuthLogin={mock(() => {})}
					onRunUpdate={mock(() => {})}
				/>
			</I18nProvider>,
		);

		await delay(200);

		// Menu: Default(0), MiniMax(1), OpenRouter(2), Manage(3), Installations(4), Settings(5)
		await navigateAndSelect(stdin, 5);

		const frame = lastFrame()!;
		expect(frame).toContain("Settings");
		expect(frame).toContain("Open config folder");
		expect(frame).toContain("Change language");
	}, 10000);

	test("4. Default launch → shows flags", async () => {
		const onStartClaude = mock(() => {});
		const { lastFrame, stdin } = render(
			<I18nProvider>
				<UnifiedApp
					onStartClaude={onStartClaude}
					onOAuthLogin={mock(() => {})}
					onRunUpdate={mock(() => {})}
				/>
			</I18nProvider>,
		);

		await delay(200);

		// Select Default Launch (index 0 — already selected)
		await pressKey(stdin, KEYS.ENTER);

		// Wait for flags step to appear (async loadConfig)
		await waitForFrame(lastFrame, "Launch options");

		const frame = lastFrame()!;
		expect(frame).toContain("Launch options");
		expect(frame).toContain("--dangerously-skip-permissions");
	}, 10000);

	test("5. Select OpenRouter → fetches models and shows list", async () => {
		const onStartClaude = mock(() => {});
		const { lastFrame, stdin } = render(
			<I18nProvider>
				<UnifiedApp
					onStartClaude={onStartClaude}
					onOAuthLogin={mock(() => {})}
					onRunUpdate={mock(() => {})}
				/>
			</I18nProvider>,
		);

		await delay(200);

		// Navigate to My OpenRouter (index 2)
		await navigateAndSelect(stdin, 2);

		// Wait for models to load (async fetch mock)
		await waitForFrame(lastFrame, "Select a model");

		const frame = lastFrame()!;
		expect(frame).toContain("My OpenRouter");
		expect(frame).toContain("Select a model");
		expect(frame).toContain("Claude 3.5 Sonnet"); // API-only model, shown by display name
		// The saved model "openai/gpt-4o" is also returned by the API, so the API entry
		// supersedes it: one row, display name, with metadata — not the bare id twice.
		expect(frame).toContain("GPT-4o");
		expect(frame).not.toContain("openai/gpt-4o");
	}, 10000);

	// Regression: Ink re-subscribes useInput through an effect, so the handler could be
	// one render behind and Enter would act on the item above the highlighted one.
	test("6. Enter right after arrow keys selects the highlighted item", async () => {
		const { lastFrame, stdin } = render(
			<I18nProvider>
				<UnifiedApp
					onStartClaude={mock(() => {})}
					onOAuthLogin={mock(() => {})}
					onRunUpdate={mock(() => {})}
				/>
			</I18nProvider>,
		);

		await delay(200);

		// Settings(5), with almost no pause between the last arrow and Enter
		for (let i = 0; i < 5; i++) {
			await pressKey(stdin, KEYS.DOWN, 20);
		}
		await pressKey(stdin, KEYS.ENTER, 200);

		const frame = lastFrame()!;
		expect(frame).toContain("Open config folder");
		expect(frame).not.toContain("Add installation");
	}, 10000);

	// Same stale-handler hazard in the model list, where picking the wrong row
	// means launching Claude Code against the wrong model.
	test("7. Enter right after arrow keys picks the highlighted model", async () => {
		const onStartClaude = mock(() => {});
		const { lastFrame, stdin } = render(
			<I18nProvider>
				<UnifiedApp
					onStartClaude={onStartClaude}
					onOAuthLogin={mock(() => {})}
					onRunUpdate={mock(() => {})}
				/>
			</I18nProvider>,
		);

		await delay(200);
		await navigateAndSelect(stdin, 2); // My OpenRouter
		await waitForFrame(lastFrame, "Select a model");

		// Models are sorted by display name: Claude 3.5 Sonnet(0), GPT-4o(1)
		await pressKey(stdin, KEYS.DOWN, 20);
		const highlighted = lastFrame()!
			.split("\n")
			.find((l) => l.includes("❯"));
		expect(highlighted).toContain("GPT-4o");

		await pressKey(stdin, KEYS.ENTER, 250);

		// Leaving model selection means Enter acted on the highlighted row
		expect(lastFrame()!).not.toContain("Select a model");
	}, 10000);
});
