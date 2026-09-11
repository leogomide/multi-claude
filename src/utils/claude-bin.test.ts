import {
	chmodSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanStaleSessionSettings, writeSessionSettings } from "../statusline.ts";
import { resolveClaude, spawnClaudeSync } from "./claude-bin.ts";

const tmpDirs: string[] = [];
function tmp(): string {
	const d = mkdtempSync(join(tmpdir(), "mclaude-bin-"));
	tmpDirs.push(d);
	return d;
}
afterEach(() => {
	for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function touch(path: string, content = ""): string {
	mkdirSync(join(path, ".."), { recursive: true });
	writeFileSync(path, content);
	return path;
}

// cmd-shim (npm) output, JavaScript target.
function npmShim(rel: string): string {
	return [
		"@ECHO off",
		"GOTO start",
		":find_dp0",
		"SET dp0=%~dp0",
		"EXIT /b",
		":start",
		"SETLOCAL",
		"CALL :find_dp0",
		"",
		'IF EXIST "%dp0%\\node.exe" (',
		'  SET "_prog=%dp0%\\node.exe"',
		") ELSE (",
		'  SET "_prog=node"',
		"  SET PATHEXT=%PATHEXT:;.JS;=;%",
		")",
		"",
		`endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "%dp0%\\${rel}" %*`,
		"",
	].join("\r\n");
}

const PATHEXT = ".COM;.EXE;.BAT;.CMD";
const winEnv = (...dirs: string[]) => ({ PATH: dirs.join(";"), PATHEXT });

describe("resolveClaude (win32)", () => {
	it("never picks the extensionless sh script next to the .cmd", () => {
		const dir = tmp();
		touch(join(dir, "claude"), "#!/bin/sh\n");
		touch(join(dir, "claude.cmd"), "@echo off\r\n");
		const r = resolveClaude(winEnv(dir), "win32");
		expect(r.command).toBe(join(dir, "claude.cmd"));
		expect(r.via).toBe("cross-spawn");
	});

	it("follows PATH order between claude.exe and claude.cmd", () => {
		const a = tmp();
		const b = tmp();
		touch(join(a, "claude.cmd"), "@echo off\r\n");
		touch(join(b, "claude.exe"));
		expect(resolveClaude(winEnv(b, a), "win32")).toEqual({
			command: join(b, "claude.exe"),
			prefixArgs: [],
			via: "exe",
		});
		expect(resolveClaude(winEnv(a, b), "win32").command).toBe(join(a, "claude.cmd"));
	});

	it("reads an npm shim pointing to cli.js", () => {
		const dir = tmp();
		const rel = "node_modules\\@anthropic-ai\\claude-code\\cli.js";
		const cli = touch(join(dir, "node_modules", "@anthropic-ai", "claude-code", "cli.js"));
		touch(join(dir, "claude.cmd"), npmShim(rel));
		const r = resolveClaude(winEnv(dir), "win32");
		expect(r.via).toBe("shim-node");
		expect(r.prefixArgs).toEqual([cli]);
	});

	it("uses the node.exe beside the shim when present", () => {
		const dir = tmp();
		touch(join(dir, "node_modules", "pkg", "cli.js"));
		touch(join(dir, "claude.cmd"), npmShim("node_modules\\pkg\\cli.js"));
		const node = touch(join(dir, "node.exe"));
		expect(resolveClaude(winEnv(dir), "win32").command).toBe(node);
	});

	it("reads a pnpm (%~dp0) shim pointing to an .exe", () => {
		const dir = tmp();
		const exe = touch(join(dir, "global", "claude-native", "claude.exe"));
		touch(join(dir, "claude.cmd"), '@"%~dp0\\global\\claude-native\\claude.exe" %*\r\n');
		expect(resolveClaude(winEnv(dir), "win32")).toEqual({
			command: exe,
			prefixArgs: [],
			via: "shim-exe",
		});
	});

	it("falls back to cross-spawn when the shim target is unknown or missing", () => {
		const dir = tmp();
		touch(join(dir, "claude.cmd"), npmShim("node_modules\\missing\\cli.js"));
		expect(resolveClaude(winEnv(dir), "win32").via).toBe("cross-spawn");
	});

	it("falls back to plain 'claude' when nothing is on PATH", () => {
		expect(resolveClaude(winEnv(tmp()), "win32")).toEqual({
			command: "claude",
			prefixArgs: [],
			via: "fallback",
		});
	});
});

describe.skipIf(process.platform === "win32")("resolveClaude (posix)", () => {
	it("finds an executable on PATH", () => {
		const dir = tmp();
		const bin = touch(join(dir, "claude"), "#!/bin/sh\n");
		chmodSync(bin, 0o755);
		expect(resolveClaude({ PATH: dir }, "linux")).toEqual({
			command: bin,
			prefixArgs: [],
			via: "posix",
		});
	});
});

describe.skipIf(process.platform !== "win32")("spawnClaudeSync through an npm shim (win32)", () => {
	it("passes arguments byte for byte, without cmd.exe", () => {
		const dir = tmp();
		const out = join(dir, "argv.json");
		touch(
			join(dir, "node_modules", "fake-claude", "cli.js"),
			`require("node:fs").writeFileSync(${JSON.stringify(out)}, JSON.stringify(process.argv.slice(2)));`,
		);
		touch(join(dir, "claude.cmd"), npmShim("node_modules\\fake-claude\\cli.js"));

		const env: NodeJS.ProcessEnv = {};
		for (const [k, v] of Object.entries(process.env)) {
			if (k.toUpperCase() !== "PATH") env[k] = v;
		}
		env.PATH = dir;

		const args = ["--model", "m", "-p", 'a & b "c" ^ %PATH%'];
		const result = spawnClaudeSync(args, { env, stdio: "ignore" });
		expect(result.error).toBeUndefined();
		expect(result.status).toBe(0);
		expect(JSON.parse(readFileSync(out, "utf-8"))).toEqual(args);
	});
});

describe("session settings files", () => {
	it("writes the JSON intact under a pid-tagged name", async () => {
		const dir = tmp();
		const json = JSON.stringify({ env: { MCLAUDE_PROVIDER_NAME: 'R&D <teste> "x"' } });
		const file = await writeSessionSettings(json, dir);
		expect(file.startsWith(join(dir, `settings-${process.pid}-`))).toBe(true);
		expect(readFileSync(file, "utf-8")).toBe(json);
	});

	it("removes files of dead processes and keeps the current one", async () => {
		const dir = tmp();
		const mine = await writeSessionSettings("{}", dir);
		touch(join(dir, "settings-2147483646-deadbeef.json"), "{}");
		touch(join(dir, "unrelated.json"), "{}");
		await cleanStaleSessionSettings(dir);
		expect(readdirSync(dir).sort()).toEqual([mine.slice(dir.length + 1), "unrelated.json"].sort());
	});
});
