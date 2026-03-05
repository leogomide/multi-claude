import { appendFileSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LOGS_DIR } from "./config.ts";

// --- Log Levels ---

const LOG_LEVELS = { off: -1, error: 0, warn: 1, info: 2, debug: 3 } as const;
type LogLevel = keyof typeof LOG_LEVELS;

function getConfiguredLevel(): LogLevel {
	const env = process.env["MCLAUDE_LOG_LEVEL"]?.toLowerCase();
	if (env && env in LOG_LEVELS) return env as LogLevel;
	return "info";
}

// --- State ---

const MAX_LOG_FILES = 20;
let initialized = false;
let logFile = "";
let configuredLevel: LogLevel = "info";
let processRole: string = "unknown";

// --- Error Formatting ---

export function formatError(err: unknown): string {
	if (err instanceof Error) return err.stack ?? err.message;
	if (typeof err === "string") return err;
	return JSON.stringify(err);
}

// --- Initialization ---

function buildLogFileName(role: string, sessionId: string): string {
	const now = new Date();
	const pad2 = (n: number) => String(n).padStart(2, "0");
	const ts = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}T${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;
	return `${ts}-${sessionId}-${role}.log`;
}

function cleanOldLogs(): void {
	try {
		const files = readdirSync(LOGS_DIR)
			.filter((f) => f.endsWith(".log"))
			.sort();
		const toDelete = files.slice(0, -MAX_LOG_FILES);
		for (const file of toDelete) {
			try {
				unlinkSync(join(LOGS_DIR, file));
			} catch {
				// Ignore individual deletion failures (file in use by another instance, etc.)
			}
		}
	} catch {
		// If we can't read the directory, skip cleanup silently
	}
}

function ensureInit(): void {
	if (initialized) return;
	initialized = true;
	configuredLevel = getConfiguredLevel();

	if (configuredLevel === "off") {
		logFile = "";
		return;
	}

	const sessionId = process.env["MCLAUDE_SESSION_ID"] ?? String(process.pid);

	try {
		mkdirSync(LOGS_DIR, { recursive: true });
		const fileName = buildLogFileName(processRole, sessionId);
		logFile = join(LOGS_DIR, fileName);
		const header = [
			"=== mclaude debug log ===",
			`Started: ${new Date().toISOString()}`,
			`PID: ${process.pid}`,
			`Role: ${processRole}`,
			`Session: ${sessionId}`,
			`Platform: ${process.platform}`,
			`Log level: ${configuredLevel}`,
			"===",
			"",
		].join("\n");
		writeFileSync(logFile, header);
		cleanOldLogs();
	} catch {
		logFile = "";
	}
}

export function initLogger(role: "cli" | "tui" | "headless", sessionId?: string): void {
	processRole = role;
	if (sessionId) {
		process.env["MCLAUDE_SESSION_ID"] = sessionId;
	}
	// Reset so next log call re-initializes with the correct role/session
	if (initialized) {
		initialized = false;
		logFile = "";
	}
}

// --- Core Write ---

function writeLog(
	level: Exclude<LogLevel, "off">,
	source: string,
	msg: string,
	err?: unknown,
): void {
	ensureInit();
	if (!logFile) return;
	if (LOG_LEVELS[level] > LOG_LEVELS[configuredLevel]) return;

	const tag = level.toUpperCase().padEnd(5);
	let line = `[${new Date().toISOString()}] [${tag}] [${source}] ${msg}`;
	if (err !== undefined) {
		line += "\n  " + formatError(err).replace(/\n/g, "\n  ");
	}

	try {
		appendFileSync(logFile, line + "\n");
	} catch {
		// Silently ignore write errors
	}
}

// --- Logger Interface & Factory ---

export interface Logger {
	error(msg: string, err?: unknown): void;
	warn(msg: string): void;
	info(msg: string): void;
	debug(msg: string): void;
}

export function createLogger(source: string): Logger {
	return {
		error: (msg, err?) => writeLog("error", source, msg, err),
		warn: (msg) => writeLog("warn", source, msg),
		info: (msg) => writeLog("info", source, msg),
		debug: (msg) => writeLog("debug", source, msg),
	};
}
