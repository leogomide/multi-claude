import { spawn, execSync } from "node:child_process";
import { debugLog } from "./debug.ts";
import { buildClaudeEnv } from "./providers.ts";
import type { ConfiguredProvider } from "./schema.ts";

export async function runClaude(
	provider: ConfiguredProvider,
	model: string,
	extraArgs: string[] = [],
	installationId?: string,
): Promise<number> {
	const env = buildClaudeEnv(provider, model, installationId);
	if (!env) {
		console.error('Error: template "' + provider.templateId + '" not found.');
		return 1;
	}

	// Build args
	const args: string[] = [];
	if (provider.type !== "oauth") {
		args.push("--model", model);
	}

	// Filter --model/-m from user args and append the rest
	let skipNext = false;
	for (let i = 0; i < extraArgs.length; i++) {
		if (skipNext) {
			skipNext = false;
			continue;
		}
		const arg = extraArgs[i]!;
		if (arg === "--model" || arg === "-m") {
			skipNext = true;
			continue;
		}
		if (arg.startsWith("--model=")) {
			continue;
		}
		args.push(arg);
	}

	// Resolve full claude path (handles .cmd shims on Windows)
	let claudePath = "claude";
	try {
		if (process.platform === "win32") {
			claudePath = execSync("where claude", { encoding: "utf-8" }).trim().split(/\r?\n/)[0] ?? "claude";
		} else {
			claudePath = execSync("which claude", { encoding: "utf-8" }).trim();
		}
	} catch {
		debugLog("runner.ts: could not resolve claude path, using 'claude'");
	}
	debugLog("runner.ts: claudePath=" + claudePath);

	debugLog("runner.ts: spawning claude, args=" + JSON.stringify(args));
	debugLog("runner.ts: env keys=" + JSON.stringify(Object.keys(env).filter(k => k.startsWith("ANTHROPIC") || k.startsWith("CLAUDE"))));

	return new Promise<number>((resolve, reject) => {
		const child = spawn(claudePath, args, {
			stdio: "inherit",
			env,
		});

		child.on("error", (err) => {
			debugLog("runner.ts: spawn error: " + (err.stack ?? err.message));
			const msg = err.message;
			if (msg.includes("ENOENT") || msg.includes("Failed to spawn")) {
				console.error('Error: "claude" not found in PATH.\n');
				console.error("Install Claude Code:");
				console.error("  macOS/Linux/WSL:  curl -fsSL https://claude.ai/install.sh | bash");
				console.error("  Windows:          irm https://claude.ai/install.ps1 | iex");
				console.error("  Homebrew:         brew install --cask claude-code");
				resolve(1);
			} else {
				reject(err);
			}
		});

		child.on("close", (code, signal) => {
			debugLog("runner.ts: child closed, code=" + code + ", signal=" + signal);
			resolve(code ?? 1);
		});
	});
}
