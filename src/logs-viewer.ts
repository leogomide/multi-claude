import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { LOGS_DIR } from "./config.ts";

function getLogFiles(): string[] {
	if (!existsSync(LOGS_DIR)) return [];
	return readdirSync(LOGS_DIR)
		.filter((f) => f.endsWith(".log"))
		.sort();
}

function getSessionFiles(files: string[]): string[] {
	if (files.length === 0) return [];
	// Extract session ID from last file: YYYYMMDDTHHmmss-sessionId-role.log
	const last = files[files.length - 1]!;
	const parts = last.replace(".log", "").split("-");
	// parts: [timestamp, sessionId, role] or [timestamp, pid] (legacy)
	if (parts.length >= 3) {
		const sessionId = parts[1]!;
		return files.filter((f) => f.includes(`-${sessionId}-`));
	}
	return [last];
}

function printFile(filePath: string): void {
	try {
		const content = readFileSync(filePath, "utf-8");
		console.log(content);
	} catch {
		console.error("Failed to read: " + filePath);
	}
}

export async function handleLogs(subcommand?: string): Promise<void> {
	const files = getLogFiles();

	if (!subcommand) {
		console.log(`Log directory: ${LOGS_DIR}`);
		if (files.length === 0) {
			console.log("\nNo log files found.");
		} else {
			console.log(`\nRecent log files (${files.length}):`);
			for (const f of files.slice(-20)) {
				const fullPath = join(LOGS_DIR, f);
				try {
					const stat = statSync(fullPath);
					const size = stat.size < 1024 ? `${stat.size}B` : `${(stat.size / 1024).toFixed(1)}KB`;
					console.log(`  ${f}  (${size})`);
				} catch {
					console.log(`  ${f}`);
				}
			}
		}
		return;
	}

	if (subcommand === "last") {
		const sessionFiles = getSessionFiles(files);
		if (sessionFiles.length === 0) {
			console.log("No log files found.");
			return;
		}
		for (const f of sessionFiles) {
			printFile(join(LOGS_DIR, f));
		}
		return;
	}

	if (subcommand === "tail") {
		const sessionFiles = getSessionFiles(files);
		if (sessionFiles.length === 0) {
			console.log("No log files found.");
			return;
		}
		// Print last session files and watch for changes
		const paths = sessionFiles.map((f) => join(LOGS_DIR, f));
		for (const p of paths) {
			printFile(p);
		}

		console.log("\n--- Watching for changes (Ctrl+C to stop) ---\n");
		const sizes = new Map<string, number>();
		for (const p of paths) {
			try {
				sizes.set(p, statSync(p).size);
			} catch {
				sizes.set(p, 0);
			}
		}

		const interval = setInterval(() => {
			for (const p of paths) {
				try {
					const newSize = statSync(p).size;
					const oldSize = sizes.get(p) ?? 0;
					if (newSize > oldSize) {
						const fd = readFileSync(p, "utf-8");
						const newContent = fd.slice(oldSize);
						if (newContent) process.stdout.write(newContent);
						sizes.set(p, newSize);
					}
				} catch {
					// File may have been deleted
				}
			}
		}, 500);

		// Keep process alive until Ctrl+C
		await new Promise<void>((resolve) => {
			process.on("SIGINT", () => {
				clearInterval(interval);
				resolve();
			});
		});
		return;
	}

	console.error(`Unknown subcommand: ${subcommand}`);
	console.log("Usage: mclaude --logs [last|tail]");
}
