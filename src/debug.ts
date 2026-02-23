import {
	appendFileSync,
	mkdirSync,
	readdirSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { CONFIG_DIR } from "./config.ts";

const LOGS_DIR = join(CONFIG_DIR, "logs");
const MAX_LOG_FILES = 10;

let initialized = false;
let logFile = "";

function buildLogFileName(): string {
	const now = new Date();
	const pad2 = (n: number) => String(n).padStart(2, "0");
	const ts = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}T${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;
	return `${ts}-${process.pid}.log`;
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
	try {
		mkdirSync(LOGS_DIR, { recursive: true });
		const fileName = buildLogFileName();
		logFile = join(LOGS_DIR, fileName);
		const header = [
			"=== mclaude debug log ===",
			`Started: ${new Date().toISOString()}`,
			`PID: ${process.pid}`,
			`Platform: ${process.platform}`,
			"===",
			"",
		].join("\n");
		writeFileSync(logFile, header);
		cleanOldLogs();
	} catch {
		// Config dir might not exist yet on first run, or disk error
		logFile = "";
	}
}

export function debugLog(msg: string): void {
	ensureInit();
	if (!logFile) return;
	try {
		appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
	} catch {
		// Silently ignore write errors
	}
}
