#!/usr/bin/env bun

import { execSync } from "node:child_process";
import { join } from "node:path";

// ─── Method definitions ───────────────────────────────────────────────────────

interface MethodResult {
	cols: number | null;
	rows: number | null;
	error?: string;
}

function method_stdoutProps(): MethodResult {
	try {
		const cols = process.stdout.columns ?? null;
		const rows = process.stdout.rows ?? null;
		return { cols, rows };
	} catch (e) {
		return { cols: null, rows: null, error: String(e) };
	}
}

function method_stdoutGetWindowSize(): MethodResult {
	try {
		if (typeof process.stdout.getWindowSize !== "function") {
			return { cols: null, rows: null, error: "not a function" };
		}
		const [cols, rows] = process.stdout.getWindowSize();
		return { cols, rows };
	} catch (e) {
		return { cols: null, rows: null, error: String(e) };
	}
}

function method_stderrGetWindowSize(): MethodResult {
	try {
		if (typeof process.stderr.getWindowSize !== "function") {
			return { cols: null, rows: null, error: "not a function" };
		}
		const [cols, rows] = process.stderr.getWindowSize();
		return { cols, rows };
	} catch (e) {
		return { cols: null, rows: null, error: String(e) };
	}
}

function method_modeCon(): MethodResult {
	try {
		const output = execSync("mode con", {
			encoding: "utf-8",
			timeout: 2000,
			stdio: ["pipe", "pipe", "pipe"],
		});
		const numbers = [...output.matchAll(/:\s+(\d+)/g)].map((m) => parseInt(m[1]!, 10));
		if (numbers.length >= 2 && numbers[0]! > 0 && numbers[1]! > 0) {
			return { cols: numbers[1]!, rows: numbers[0]! };
		}
		return { cols: null, rows: null, error: "parse failed" };
	} catch (e) {
		return { cols: null, rows: null, error: String(e) };
	}
}

function method_powershell(): MethodResult {
	try {
		const output = execSync(
			'powershell.exe -NoProfile -Command "[Console]::WindowWidth;[Console]::WindowHeight"',
			{ encoding: "utf-8", timeout: 5000, stdio: ["pipe", "pipe", "pipe"] },
		);
		const lines = output.trim().split(/\r?\n/);
		if (lines.length >= 2) {
			const cols = parseInt(lines[0]!, 10);
			const rows = parseInt(lines[1]!, 10);
			if (cols > 0 && rows > 0) return { cols, rows };
		}
		return { cols: null, rows: null, error: "parse failed: " + output.trim() };
	} catch (e) {
		return { cols: null, rows: null, error: String(e) };
	}
}

// Direct inline FFI (not through module, for diagnostic independence)
function method_ffiKernel32(): MethodResult {
	try {
		const { dlopen, ptr } = require("bun:ffi");
		const lib = dlopen("kernel32.dll", {
			GetStdHandle: { args: ["i32"], returns: "ptr" },
			GetConsoleScreenBufferInfo: { args: ["ptr", "ptr"], returns: "i32" },
		});
		// Try stdout handle (-11), then stderr handle (-12)
		for (const handleId of [-11, -12]) {
			const handle = lib.symbols.GetStdHandle(handleId);
			if (handle === 0 || handle === -1) continue;
			const buf = new Uint8Array(22);
			const ok = lib.symbols.GetConsoleScreenBufferInfo(handle, ptr(buf));
			if (!ok) continue;
			const dv = new DataView(buf.buffer);
			const left = dv.getInt16(10, true);
			const top = dv.getInt16(12, true);
			const right = dv.getInt16(14, true);
			const bottom = dv.getInt16(16, true);
			const cols = right - left + 1;
			const rows = bottom - top + 1;
			if (cols > 0 && rows > 0) {
				return { cols, rows };
			}
		}
		return { cols: null, rows: null, error: "no valid handle" };
	} catch (e) {
		return { cols: null, rows: null, error: String(e) };
	}
}

// Module-based FFI (tests the actual production code path)
let moduleFn: (() => { columns: number; rows: number } | null) | null = null;
function method_ffiModule(): MethodResult {
	try {
		if (!moduleFn) {
			const mod = require(join(import.meta.dir, "..", "src", "utils", "win32-console-size.ts"));
			moduleFn = mod.getConsoleSizeWin32;
		}
		const result = moduleFn!();
		if (result) return { cols: result.columns, rows: result.rows };
		return { cols: null, rows: null, error: "returned null" };
	} catch (e) {
		return { cols: null, rows: null, error: String(e) };
	}
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

interface MethodDef {
	name: string;
	fn: () => MethodResult;
	initial: MethodResult | null;
}

const methods: MethodDef[] = [
	{ name: "stdout.columns/rows", fn: method_stdoutProps, initial: null },
	{ name: "stdout.getWindowSize()", fn: method_stdoutGetWindowSize, initial: null },
	{ name: "stderr.getWindowSize()", fn: method_stderrGetWindowSize, initial: null },
	{ name: "execSync('mode con')", fn: method_modeCon, initial: null },
	{ name: "PowerShell [Console]", fn: method_powershell, initial: null },
	{ name: "FFI kernel32 (inline)", fn: method_ffiKernel32, initial: null },
	{ name: "FFI kernel32 (module)", fn: method_ffiModule, initial: null },
];

// Enter alternate screen buffer (same as app.tsx)
process.stdout.write("\x1b[?1049h");
process.stdout.write("\x1b[?25l"); // hide cursor

// Raw mode for 'q' to quit
if (process.stdin.isTTY && process.stdin.setRawMode) {
	process.stdin.setRawMode(true);
}
process.stdin.resume();
process.stdin.on("data", (data: Buffer) => {
	const key = data.toString();
	if (key === "q" || key === "Q" || key === "\x03") {
		cleanup();
		process.exit(0);
	}
});

let cleaned = false;
function cleanup() {
	if (cleaned) return;
	cleaned = true;
	clearInterval(timer);
	process.stdout.write("\x1b[?25h"); // show cursor
	process.stdout.write("\x1b[?1049l"); // exit alternate screen
	if (process.stdin.isTTY && process.stdin.setRawMode) {
		process.stdin.setRawMode(false);
	}
}

process.on("exit", cleanup);
process.on("SIGINT", () => {
	cleanup();
	process.exit(0);
});

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";

function formatSize(r: MethodResult): string {
	if (r.error) return `${RED}ERR: ${r.error.slice(0, 30)}${RESET}`;
	if (r.cols == null || r.rows == null) return `${YELLOW}N/A${RESET}`;
	return `${r.cols}x${r.rows}`;
}

function pad(s: string, len: number): string {
	const visible = s.replace(/\x1b\[[0-9;]*m/g, "");
	const diff = len - visible.length;
	return diff > 0 ? s + " ".repeat(diff) : s;
}

let pollCount = 0;
const startTime = Date.now();

function render() {
	pollCount++;
	const elapsed = Math.floor((Date.now() - startTime) / 1000);

	const results: MethodResult[] = [];
	for (const m of methods) {
		const r = m.fn();
		if (!m.initial) m.initial = { ...r };
		results.push(r);
	}

	let output = "\x1b[H\x1b[2J";

	output += `${BOLD}${CYAN}  TERMINAL RESIZE DIAGNOSTIC${RESET}\n`;
	output += `${DIM}  Press 'q' to quit  |  isTTY: stdout=${process.stdout.isTTY} stdin=${process.stdin.isTTY}${RESET}\n\n`;
	output += `  Poll #${pollCount}  |  Elapsed: ${elapsed}s  |  Alt screen: ON\n\n`;

	const nameW = 26;
	const sizeW = 16;
	output += `  ${pad(`${BOLD}Method${RESET}`, nameW + 9)}  ${pad(`${BOLD}Current${RESET}`, sizeW + 9)}  ${pad(`${BOLD}Initial${RESET}`, sizeW + 9)}  ${BOLD}Changed?${RESET}\n`;
	output += `  ${"─".repeat(nameW)}  ${"─".repeat(sizeW)}  ${"─".repeat(sizeW)}  ${"─".repeat(12)}\n`;

	for (let i = 0; i < methods.length; i++) {
		const m = methods[i]!;
		const r = results[i]!;
		const init = m.initial!;

		const current = formatSize(r);
		const initial = formatSize(init);

		let changed: string;
		if (r.error || init.error || r.cols == null || r.rows == null) {
			changed = `${DIM}N/A${RESET}`;
		} else if (r.cols !== init.cols || r.rows !== init.rows) {
			changed = `${GREEN}${BOLD}YES <<<${RESET}`;
		} else {
			changed = `${RED}NO${RESET}`;
		}

		output += `  ${pad(m.name, nameW)}  ${pad(current, sizeW + 9)}  ${pad(initial, sizeW + 9)}  ${changed}\n`;
	}

	output += `\n  ${DIM}Resize your terminal now and watch which methods detect changes.${RESET}\n`;
	output += `  ${DIM}Methods marked ${GREEN}YES <<<${RESET}${DIM} are candidates for the fix.${RESET}\n`;
	output += `\n  ${DIM}Note: 'mode con' shows buffer size (rows may be huge like 9001).${RESET}\n`;
	output += `  ${DIM}FFI reads srWindow which gives actual visible window size.${RESET}\n`;

	process.stdout.write(output);
}

render();
const timer = setInterval(render, 1500);
