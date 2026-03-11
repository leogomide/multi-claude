import { existsSync, readFileSync } from "node:fs";
import { chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { isEncryptedPayload } from "./crypto.ts";
import { decryptCredential, encryptCredential } from "./credential-store.ts";
import type { Config } from "./schema.ts";
import { configSchema } from "./schema.ts";

export const CONFIG_DIR = join(homedir(), ".multi-claude");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
export const ACCOUNTS_DIR = join(CONFIG_DIR, "accounts");
export const INSTALLATIONS_DIR = join(CONFIG_DIR, "installations");
export const LOGS_DIR = join(CONFIG_DIR, "logs");

function defaultConfig(): Config {
	return { providers: [], installations: [] };
}

// Master password for current session (set by TUI or headless mode)
let sessionMasterPassword: string | undefined;

export function setSessionMasterPassword(password: string | undefined): void {
	sessionMasterPassword = password;
}

export function getSessionMasterPassword(): string | undefined {
	return sessionMasterPassword;
}

export async function loadConfig(): Promise<Config> {
	try {
		const raw = await readFile(CONFIG_FILE, "utf-8");
		const parsed = JSON.parse(raw);
		const config = configSchema.parse(parsed);

		// Decrypt API keys in memory
		for (const provider of config.providers) {
			if (provider.apiKey && isEncryptedPayload(provider.apiKey)) {
				const encrypted = provider.apiKey;
				const decrypted = await decryptCredential(encrypted, sessionMasterPassword);
				if (decrypted === "" && encrypted !== "") {
					// Decryption failed — key is irrecoverable
					provider.apiKeyValid = false;
				}
				provider.apiKey = decrypted;
			}
		}

		return config;
	} catch {
		return defaultConfig();
	}
}

export async function saveConfig(config: Config): Promise<void> {
	await mkdir(CONFIG_DIR, { recursive: true });

	// Deep clone and encrypt API keys before writing to disk
	const toSave = JSON.parse(JSON.stringify(config)) as Config;
	for (const provider of toSave.providers) {
		if (provider.apiKey && !isEncryptedPayload(provider.apiKey)) {
			provider.apiKey = await encryptCredential(provider.apiKey, sessionMasterPassword);
		}
	}

	await writeFile(CONFIG_FILE, JSON.stringify(toSave, null, 2) + "\n", "utf-8");
	await setSecurePermissions(CONFIG_FILE);
}

async function setSecurePermissions(filePath: string): Promise<void> {
	if (process.platform !== "win32") {
		try {
			await chmod(filePath, 0o600);
		} catch {
			// Ignore permission errors
		}
	}
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

export function generateShortId(): string {
	return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

export function slugify(name: string): string {
	return name
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 40);
}

export function computeDirName(id: string, name: string): string {
	const slug = slugify(name);
	return slug ? `${id}-${slug}` : id;
}

export async function renameInstallationDir(oldDirName: string, newDirName: string): Promise<void> {
	if (oldDirName === newDirName) return;
	const oldPath = join(INSTALLATIONS_DIR, oldDirName);
	const newPath = join(INSTALLATIONS_DIR, newDirName);
	if (existsSync(oldPath) && !existsSync(newPath)) {
		await rename(oldPath, newPath);
	}
}

export const TEMPLATE_ID_RENAMES: Record<string, string> = {
	alibaba: "alibaba-coding",
};

export async function migrateProviderTemplateIds(config: Config): Promise<void> {
	let changed = false;
	for (const provider of config.providers) {
		const newId = TEMPLATE_ID_RENAMES[provider.templateId];
		if (newId) {
			provider.templateId = newId;
			changed = true;
		}
	}
	if (changed) await saveConfig(config);
}

export async function migrateInstallations(config: Config): Promise<void> {
	const needsMigration = config.installations.some((inst) => !inst.dirName);
	if (!needsMigration) return;

	for (const inst of config.installations) {
		if (inst.dirName) continue;

		const oldId = inst.id;
		const shortId = oldId.replace(/-/g, "").slice(0, 8);
		const dirName = computeDirName(shortId, inst.name);

		const oldPath = join(INSTALLATIONS_DIR, oldId);
		const newPath = join(INSTALLATIONS_DIR, dirName);
		if (existsSync(oldPath) && !existsSync(newPath)) {
			try {
				await rename(oldPath, newPath);
			} catch {
				// If rename fails, continue — directory will be recreated on next use
			}
		}

		inst.id = shortId;
		inst.dirName = dirName;
	}

	await saveConfig(config);
}

export async function resetAllConfig(): Promise<void> {
	if (existsSync(CONFIG_DIR)) {
		await rm(CONFIG_DIR, { recursive: true, force: true });
	}
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
