import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Config } from "./schema.ts";
import { configSchema } from "./schema.ts";

export const CONFIG_DIR = join(homedir(), ".multi-claude");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
export const ACCOUNTS_DIR = join(CONFIG_DIR, "accounts");
export const INSTALLATIONS_DIR = join(CONFIG_DIR, "installations");

function defaultConfig(): Config {
	return { providers: [], installations: [] };
}

export async function loadConfig(): Promise<Config> {
	try {
		const raw = await readFile(CONFIG_FILE, "utf-8");
		const parsed = JSON.parse(raw);
		return configSchema.parse(parsed);
	} catch {
		return defaultConfig();
	}
}

export async function saveConfig(config: Config): Promise<void> {
	await mkdir(CONFIG_DIR, { recursive: true });
	await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

export function getAccountDir(providerId: string): string {
	return join(ACCOUNTS_DIR, providerId);
}

export async function ensureAccountDir(providerId: string): Promise<string> {
	const dir = getAccountDir(providerId);
	await mkdir(dir, { recursive: true });
	return dir;
}

export async function removeAccountDir(providerId: string): Promise<void> {
	const dir = getAccountDir(providerId);
	if (existsSync(dir)) {
		await rm(dir, { recursive: true, force: true });
	}
}

export function getInstallationPath(id: string): string {
	return join(INSTALLATIONS_DIR, id);
}

export async function ensureInstallationDir(id: string): Promise<string> {
	const dir = getInstallationPath(id);
	await mkdir(dir, { recursive: true });
	return dir;
}

export async function removeInstallationDir(id: string): Promise<void> {
	const dir = getInstallationPath(id);
	if (existsSync(dir)) {
		await rm(dir, { recursive: true, force: true });
	}
}

export async function resetAllConfig(): Promise<void> {
	// Remove accounts (OAuth credentials)
	if (existsSync(ACCOUNTS_DIR)) {
		await rm(ACCOUNTS_DIR, { recursive: true, force: true });
	}
	// Remove custom installations
	if (existsSync(INSTALLATIONS_DIR)) {
		await rm(INSTALLATIONS_DIR, { recursive: true, force: true });
	}
	// Reset config to defaults (preserves language preference)
	const current = await loadConfig();
	await saveConfig({ providers: [], installations: [], language: current.language });
}

export function isAccountAuthenticated(providerId: string): boolean {
	const credFile = join(getAccountDir(providerId), ".credentials.json");
	return existsSync(credFile);
}

export interface OAuthCredentials {
	accessToken: string;
	refreshToken: string;
	expiresAt: number;
}

export function readOAuthCredentials(providerId: string): OAuthCredentials | null {
	const credFile = join(getAccountDir(providerId), ".credentials.json");
	if (!existsSync(credFile)) return null;
	try {
		const raw = JSON.parse(readFileSync(credFile, "utf-8")) as Record<string, unknown>;
		const oauth = raw["claudeAiOauth"] as Record<string, unknown> | undefined;
		if (!oauth?.["accessToken"]) return null;
		return {
			accessToken: oauth["accessToken"] as string,
			refreshToken: oauth["refreshToken"] as string,
			expiresAt: oauth["expiresAt"] as number,
		};
	} catch {
		return null;
	}
}

export function isOAuthTokenValid(creds: OAuthCredentials): boolean {
	// Consider expired if less than 5 minutes remaining
	return creds.expiresAt > Date.now() + 5 * 60 * 1000;
}
