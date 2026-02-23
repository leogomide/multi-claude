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
	loadConfig: async () => ({ providers: fakeProviders, language: "en" }),
	saveConfig: async () => {},
	CONFIG_DIR: "/tmp/test-mclaude",
	isAccountAuthenticated: () => false,
}));

mock.module("./services/api-models.ts", () => ({
	hasApiModelFetching: (templateId: string) => templateId === "openrouter" || templateId === "requesty",
	hasApiKeyValidation: (templateId: string) => templateId === "openrouter" || templateId === "requesty",
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

/** Write keys one at a time with a small gap so Ink parses each escape sequence separately */
async function pressKeys(stdin: { write: (data: string) => void }, ...keys: string[]) {
	for (const key of keys) {
		stdin.write(key);
		await delay(30);
	}
}

afterEach(() => {
	cleanup();
});

// ── Tests ────────────────────────────────────────────────────────────
describe("Smoke Test — TUI Flows", () => {
	test("1. Main menu renders with both providers", async () => {
		const onStartClaude = mock(() => {});
		const { lastFrame } = render(
			<I18nProvider>
				<UnifiedApp onStartClaude={onStartClaude} onOAuthLogin={mock(() => {})} />
			</I18nProvider>,
		);

		await delay(100);
		const frame = lastFrame()!;

		expect(frame).toContain("My MiniMax");
		expect(frame).toContain("My OpenRouter");
		expect(frame).toContain("Start Claude Code");
		expect(frame).toContain("Manage providers");
		expect(frame).toContain("Settings");
		expect(frame).toContain("Exit");
	});

	test("2. Navigate to Manage Providers and back", async () => {
		const onStartClaude = mock(() => {});
		const { lastFrame, stdin } = render(
			<I18nProvider>
				<UnifiedApp onStartClaude={onStartClaude} onOAuthLogin={mock(() => {})} />
			</I18nProvider>,
		);

		await delay(100);

		// Menu: My MiniMax, My OpenRouter, Manage providers, Settings, Exit
		await pressKeys(stdin, KEYS.DOWN, KEYS.DOWN, KEYS.ENTER);
		await delay(100);

		expect(lastFrame()!).toContain("Add provider");

		// Back with Escape
		await pressKeys(stdin, KEYS.ESCAPE);
		await delay(100);

		expect(lastFrame()!).toContain("Start Claude Code");
	});

	test("3. Navigate to Settings and back", async () => {
		const onStartClaude = mock(() => {});
		const { lastFrame, stdin } = render(
			<I18nProvider>
				<UnifiedApp onStartClaude={onStartClaude} onOAuthLogin={mock(() => {})} />
			</I18nProvider>,
		);

		await delay(100);

		// Menu: MiniMax(0), OpenRouter(1), Manage(2), Settings(3)
		await pressKeys(stdin, KEYS.DOWN, KEYS.DOWN, KEYS.DOWN, KEYS.ENTER);
		await delay(100);

		const frame = lastFrame()!;
		expect(frame).toContain("Settings");
		expect(frame).toContain("Open config folder");
		expect(frame).toContain("Change language");

		// Back with Escape
		await pressKeys(stdin, KEYS.ESCAPE);
		await delay(100);

		expect(lastFrame()!).toContain("Start Claude Code");
	});

	test("4. Select MiniMax → shows model selection", async () => {
		const onStartClaude = mock(() => {});
		const { lastFrame, stdin } = render(
			<I18nProvider>
				<UnifiedApp onStartClaude={onStartClaude} onOAuthLogin={mock(() => {})} />
			</I18nProvider>,
		);

		await delay(100);

		// First item = My MiniMax
		stdin.write(KEYS.ENTER);
		await delay(100);

		const frame = lastFrame()!;
		expect(frame).toContain("My MiniMax");
		expect(frame).toContain("Select a model");
		expect(frame).toContain("minimax-01");
	});

	test("5. Select MiniMax → pick model → onStartClaude fires", async () => {
		const onStartClaude = mock(() => {});
		const { stdin } = render(
			<I18nProvider>
				<UnifiedApp onStartClaude={onStartClaude} onOAuthLogin={mock(() => {})} />
			</I18nProvider>,
		);

		await delay(100);

		// Select My MiniMax
		stdin.write(KEYS.ENTER);
		await delay(100);

		// Select first model (minimax-01)
		stdin.write(KEYS.ENTER);
		await delay(50);

		expect(onStartClaude).toHaveBeenCalledTimes(1);
		const call = (onStartClaude.mock.calls[0] as unknown as [{ provider: { id: string }; model: string }])[0];
		expect(call.provider.id).toBe("test-minimax");
		expect(call.model).toBe("minimax-01");
	});

	test("6. Select OpenRouter → fetches models and shows list", async () => {
		const onStartClaude = mock(() => {});
		const { lastFrame, stdin } = render(
			<I18nProvider>
				<UnifiedApp onStartClaude={onStartClaude} onOAuthLogin={mock(() => {})} />
			</I18nProvider>,
		);

		await delay(100);

		// Navigate to My OpenRouter (second item)
		await pressKeys(stdin, KEYS.DOWN, KEYS.ENTER);
		await delay(200); // Extra time for async fetch mock

		const frame = lastFrame()!;
		expect(frame).toContain("My OpenRouter");
		expect(frame).toContain("Select a model");
		expect(frame).toContain("openai/gpt-4o"); // user model (no meta, shows ID)
		expect(frame).toContain("Claude 3.5 Sonnet"); // API model (has meta, shows name)
	});
});
