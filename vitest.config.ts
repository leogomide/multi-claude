import { defineConfig } from "vitest/config";

export default defineConfig({
	// Vitest 5 runs on Vite 8, which transforms with oxc instead of esbuild.
	oxc: { jsx: { runtime: "automatic" } },
	test: {
		include: ["src/**/*.test.{ts,tsx}"],
		environment: "node",
		testTimeout: 10_000,
		env: {
			// Ink skips frame writes under CI (is-in-ci), leaving lastFrame() empty.
			CI: "false",
			// The real logger would write to ~/.multi-claude/logs and prune old files.
			MCLAUDE_LOG_LEVEL: "off",
		},
	},
});
