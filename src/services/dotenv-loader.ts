import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "dotenv";
import { createLogger } from "../debug.ts";

const log = createLogger("dotenv-loader");

export function loadDotenvFromCwd(): Record<string, string> {
	const cwd = process.cwd();
	const path = join(cwd, ".env");

	if (!existsSync(path)) {
		console.error(`[mclaude] .env not found in ${cwd}, skipping`);
		log.info("no .env file at " + path);
		return {};
	}

	let parsed: Record<string, string>;
	try {
		parsed = parse(readFileSync(path));
	} catch (err) {
		console.error(`[mclaude] failed to parse .env: ${String(err)}`);
		log.error("parse failed", err);
		return {};
	}

	const result: Record<string, string> = {};
	for (const [k, v] of Object.entries(parsed)) {
		if (v === "" || v == null) continue;
		result[k] = v;
	}

	log.info(`loaded ${Object.keys(result).length} vars from ${path}`);
	return result;
}
