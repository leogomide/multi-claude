// Which package manager installed this copy of mclaude, derived from the realpath
// of the running bundle. npm_config_user_agent only exists under scripts/npx/bunx,
// not when the global bin is invoked directly, so the path is the reliable source.

export const PACKAGE_SPEC = "@leogomide/multi-claude@latest";

export type ManagerKind = "npm" | "pnpm" | "bun" | "yarn" | "volta";
export type EphemeralRunner = "npx" | "bunx" | "pnpm-dlx";

export type InstallSource =
	| { kind: ManagerKind; command: string; args: string[] }
	| { kind: "ephemeral"; runner: EphemeralRunner }
	| { kind: "dev-link" };

function normalize(p: string, platform: NodeJS.Platform): string {
	const slashed = p.replace(/\\/g, "/");
	return platform === "win32" ? slashed.toLowerCase() : slashed;
}

const MANAGERS: Record<ManagerKind, { command: string; args: string[] }> = {
	bun: { command: "bun", args: ["add", "-g", PACKAGE_SPEC] },
	pnpm: { command: "pnpm", args: ["add", "-g", PACKAGE_SPEC] },
	yarn: { command: "yarn", args: ["global", "add", PACKAGE_SPEC] },
	volta: { command: "volta", args: ["install", PACKAGE_SPEC] },
	npm: { command: "npm", args: ["i", "-g", PACKAGE_SPEC] },
};

function manager(kind: ManagerKind): InstallSource {
	const m = MANAGERS[kind];
	return { kind, command: m.command, args: [...m.args] };
}

// Ephemeral and more specific layouts first; npm is whatever is left, because
// its global prefix varies too much (%APPDATA%\npm, Program Files, nvm, fnm, ...).
export function detectInstallSource(
	realPath: string,
	env: NodeJS.ProcessEnv,
	platform: NodeJS.Platform,
): InstallSource {
	const p = normalize(realPath, platform);

	if (p.includes("/_npx/")) return { kind: "ephemeral", runner: "npx" };
	if (p.includes("/bunx-")) return { kind: "ephemeral", runner: "bunx" };
	if (p.includes("/dlx/") || p.includes("/dlx-")) return { kind: "ephemeral", runner: "pnpm-dlx" };

	const bunInstall = env["BUN_INSTALL"];
	const bunGlobal = bunInstall
		? `${normalize(bunInstall, platform).replace(/\/+$/, "")}/install/global/`
		: null;
	if (p.includes("/.bun/install/global/") || (bunGlobal && p.startsWith(bunGlobal))) {
		return manager("bun");
	}
	if (p.includes("/.pnpm/") || p.includes("/pnpm/global/")) return manager("pnpm");
	if (p.includes("/yarn/global/") || p.includes("/yarn/data/global/")) return manager("yarn");
	// %LOCALAPPDATA%\Volta on Windows, ~/.volta on Unix.
	if (/\/\.?volta\/tools\/image\/packages\//.test(p)) return manager("volta");
	if (p.includes("/node_modules/@leogomide/multi-claude/")) return manager("npm");

	// Not inside any node_modules layout we know: a linked working copy. Never
	// guess a manager here (RN-05).
	return { kind: "dev-link" };
}

// The command as shown to the user, e.g. `npm i -g @leogomide/multi-claude@latest`.
export function formatCommand(source: InstallSource): string {
	if (source.kind === "ephemeral") return `${runnerLabel(source.runner)} @leogomide/multi-claude`;
	if (source.kind === "dev-link") return "git pull && pnpm build";
	return [source.command, ...source.args].join(" ");
}

// Display name for {{runner}} in the ephemeral message.
export function runnerLabel(runner: EphemeralRunner): string {
	return runner === "pnpm-dlx" ? "pnpm dlx" : runner;
}
