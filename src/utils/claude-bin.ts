import {
	type ChildProcess,
	type SpawnOptions,
	type SpawnSyncOptions,
	type SpawnSyncReturns,
	spawn,
	spawnSync,
} from "node:child_process";
import { accessSync, constants, readFileSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import crossSpawn from "cross-spawn";
import { createLogger } from "../debug.ts";

const log = createLogger("claude-bin");

/**
 * Single entry point to find and launch the Claude Code binary.
 *
 * Never goes through `cmd.exe` (RN-03): Node refuses to spawn `.cmd`/`.bat`
 * without a shell, and with one `cmd.exe` would re-parse the `%*` of the npm
 * shim, breaking arguments that carry `&`, `|`, `<`, `>`, `^` or quotes.
 * Shims are read and their target launched directly instead.
 */
export interface ResolvedCommand {
	command: string;
	prefixArgs: string[]; // e.g. the shim's script when the target is JavaScript
	via: "posix" | "exe" | "shim-exe" | "shim-node" | "cross-spawn" | "fallback";
}

const DEFAULT_PATHEXT = ".COM;.EXE;.BAT;.CMD";
const LAUNCHABLE_EXTS = new Set([".com", ".exe", ".bat", ".cmd"]);
const JS_EXTS = new Set([".js", ".cjs", ".mjs"]);

/** Reads an env var the way the platform does (case-insensitive keys on Windows). */
function getEnv(
	env: NodeJS.ProcessEnv,
	key: string,
	platform: NodeJS.Platform,
): string | undefined {
	if (platform !== "win32") return env[key];
	const upper = key.toUpperCase();
	for (const k of Object.keys(env)) {
		if (k.toUpperCase() === upper && env[k] !== undefined) return env[k];
	}
	return undefined;
}

function isFile(p: string): boolean {
	try {
		return statSync(p).isFile();
	} catch {
		return false;
	}
}

/**
 * Walks PATH looking for `name`. On Windows only `name + ext` for each PATHEXT
 * entry is tried (in PATHEXT order), never the extensionless file npm writes
 * next to its `.cmd` shim. No child process (`where`/`which`) is involved.
 */
export function findOnPath(
	name: string,
	env: NodeJS.ProcessEnv = process.env,
	platform: NodeJS.Platform = process.platform,
): string | null {
	const delimiter = platform === "win32" ? ";" : ":";
	const dirs = (getEnv(env, "PATH", platform) ?? "")
		.split(delimiter)
		.map((d) => d.trim().replace(/^"(.*)"$/, "$1"))
		.filter(Boolean);

	if (platform === "win32") {
		const exts = (getEnv(env, "PATHEXT", platform) || DEFAULT_PATHEXT)
			.split(";")
			.map((e) => e.trim())
			.filter((e) => LAUNCHABLE_EXTS.has(e.toLowerCase()));
		for (const dir of dirs) {
			for (const ext of exts) {
				// Windows filesystems ignore case; the lowercase try covers case-sensitive test hosts.
				for (const candidate of new Set([name + ext.toLowerCase(), name + ext])) {
					const full = join(dir, candidate);
					if (isFile(full)) return full;
				}
			}
		}
		return null;
	}

	for (const dir of dirs) {
		const full = join(dir, name);
		try {
			accessSync(full, constants.X_OK);
			if (isFile(full)) return full;
		} catch {}
	}
	return null;
}

/**
 * Extracts the program a `cmd-shim` style `.cmd` launches: the last quoted
 * `%dp0%\...` (npm) or `%~dp0\...` (pnpm/yarn) path that is not `node.exe`,
 * resolved against the shim's directory. Null when nothing matches or the
 * target does not exist.
 */
export function readCmdShimTarget(cmdPath: string): string | null {
	let content: string;
	try {
		content = readFileSync(cmdPath, "utf-8");
	} catch {
		return null;
	}
	const matches = [...content.matchAll(/"(?:%dp0%|%~dp0)\\?([^"]+)"/gi)]
		.map((m) => m[1]!)
		.filter((rel) => !/(^|[\\/])node\.exe$/i.test(rel));
	const rel = matches.at(-1);
	if (!rel) return null;
	const target = join(dirname(cmdPath), ...rel.split(/[\\/]+/).filter(Boolean));
	return isFile(target) ? target : null;
}

export function resolveClaude(
	env: NodeJS.ProcessEnv = process.env,
	platform: NodeJS.Platform = process.platform,
): ResolvedCommand {
	const found = findOnPath("claude", env, platform);

	if (platform !== "win32") {
		return found
			? { command: found, prefixArgs: [], via: "posix" }
			: { command: "claude", prefixArgs: [], via: "fallback" };
	}

	if (!found) return { command: "claude", prefixArgs: [], via: "fallback" };

	const ext = extname(found).toLowerCase();
	if (ext === ".exe" || ext === ".com") return { command: found, prefixArgs: [], via: "exe" };

	const target = readCmdShimTarget(found);
	if (target) {
		const targetExt = extname(target).toLowerCase();
		if (targetExt === ".exe") return { command: target, prefixArgs: [], via: "shim-exe" };
		if (JS_EXTS.has(targetExt)) {
			// Same runtime choice as the shim: a node.exe beside it, else ours, else PATH's.
			const localNode = join(dirname(found), "node.exe");
			const runtime = isFile(localNode)
				? localNode
				: !process.versions.bun
					? process.execPath
					: "node";
			return { command: runtime, prefixArgs: [target], via: "shim-node" };
		}
	}

	// Unreadable shim or unknown target: cross-spawn escapes the args for cmd.exe.
	return { command: found, prefixArgs: [], via: "cross-spawn" };
}

function resolveAndLog(env: NodeJS.ProcessEnv | undefined): ResolvedCommand {
	const resolved = resolveClaude(env ?? process.env);
	log.info(
		"claudePath=" +
			resolved.command +
			(resolved.prefixArgs.length ? " " + resolved.prefixArgs.join(" ") : "") +
			" via=" +
			resolved.via,
	);
	return resolved;
}

export function spawnClaude(args: string[], options: SpawnOptions): ChildProcess {
	const r = resolveAndLog(options.env);
	if (r.via === "cross-spawn") return crossSpawn(r.command, args, options);
	return spawn(r.command, [...r.prefixArgs, ...args], { ...options, shell: false });
}

export function spawnClaudeSync(
	args: string[],
	options: SpawnSyncOptions,
): SpawnSyncReturns<Buffer> {
	const r = resolveAndLog(options.env);
	if (r.via === "cross-spawn") {
		return crossSpawn.sync(r.command, args, options) as SpawnSyncReturns<Buffer>;
	}
	return spawnSync(r.command, [...r.prefixArgs, ...args], {
		...options,
		shell: false,
	}) as SpawnSyncReturns<Buffer>;
}

/** True when a spawn error means the claude binary could not be launched at all. */
export function isClaudeLaunchError(err: unknown): boolean {
	if (!(err instanceof Error)) return false;
	const code = (err as NodeJS.ErrnoException).code;
	return (
		code === "ENOENT" ||
		code === "EINVAL" ||
		code === "EACCES" ||
		err.message.includes("Failed to spawn") // Bun's wording
	);
}

export function printClaudeNotFound(): void {
	console.error('Error: "claude" not found in PATH.\n');
	console.error("Install Claude Code:");
	console.error("  macOS/Linux/WSL:  curl -fsSL https://claude.ai/install.sh | bash");
	console.error("  Windows:          irm https://claude.ai/install.ps1 | iex");
	console.error("  Homebrew:         brew install --cask claude-code");
}
