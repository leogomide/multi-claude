import { appendFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const LOG_FILE = join(homedir(), ".multi-claude", "debug.log");

let initialized = false;

function ensureInit() {
	if (!initialized) {
		initialized = true;
		try {
			writeFileSync(LOG_FILE, `=== mclaude debug log — ${new Date().toISOString()} ===\n`);
		} catch {
			// Config dir might not exist yet on first run
		}
	}
}

export function debugLog(msg: string) {
	ensureInit();
	try {
		appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
	} catch {
		// silently ignore write errors
	}
}
