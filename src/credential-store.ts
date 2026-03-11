import { timingSafeEqual } from "node:crypto";
import { decrypt, encrypt, hashPassword, isEncryptedPayload, legacyHashPassword } from "./crypto.ts";
import type { EncryptedPayload } from "./crypto.ts";
import { createLogger } from "./debug.ts";
import { getEncryptionKey, readSaltFile } from "./keystore.ts";
import type { Config } from "./schema.ts";

const log = createLogger("credential-store");

export async function encryptCredential(
	plaintext: string,
	masterPassword?: string,
): Promise<string> {
	if (!plaintext) return plaintext;
	const key = await getEncryptionKey(masterPassword);
	const payload = encrypt(plaintext, key);
	return JSON.stringify(payload);
}

export async function decryptCredential(
	value: string,
	masterPassword?: string,
): Promise<string> {
	if (!value || !isEncryptedPayload(value)) return value;
	try {
		const key = await getEncryptionKey(masterPassword);
		const payload = JSON.parse(value) as EncryptedPayload;
		return decrypt(payload, key);
	} catch (err) {
		log.error("decryptCredential failed", err);
		return "";
	}
}

/**
 * Check if any provider has plain text API keys that need encryption.
 * Does NOT mutate the config — saveConfig() handles encryption.
 */
export function needsEncryptionMigration(config: Config): boolean {
	return config.providers.some((p) => p.apiKey && !isEncryptedPayload(p.apiKey));
}

export function hasMasterPassword(config: Config): boolean {
	return !!config.masterPasswordHash;
}

function timingSafeCompare(a: string, b: string): boolean {
	const bufA = Buffer.from(a, "utf-8");
	const bufB = Buffer.from(b, "utf-8");
	if (bufA.length !== bufB.length) return false;
	return timingSafeEqual(bufA, bufB);
}

export interface MasterPasswordResult {
	valid: boolean;
	isLegacy: boolean;
}

export function verifyMasterPassword(password: string, config: Config): MasterPasswordResult {
	if (!config.masterPasswordHash) return { valid: false, isLegacy: false };
	const salt = readSaltFile();
	// Try new format (domain-separated) first
	const newHash = hashPassword(password, salt);
	if (timingSafeCompare(newHash, config.masterPasswordHash)) return { valid: true, isLegacy: false };
	// Fallback: legacy format (no domain separation)
	const oldHash = legacyHashPassword(password, salt);
	if (timingSafeCompare(oldHash, config.masterPasswordHash)) return { valid: true, isLegacy: true };
	return { valid: false, isLegacy: false };
}

export function generateMasterPasswordHash(password: string): string {
	const salt = readSaltFile();
	return hashPassword(password, salt);
}
