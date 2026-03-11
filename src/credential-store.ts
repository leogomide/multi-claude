import { decrypt, encrypt, hashPassword, isEncryptedPayload } from "./crypto.ts";
import type { EncryptedPayload } from "./crypto.ts";
import { getEncryptionKey, readSaltFile } from "./keystore.ts";
import type { Config } from "./schema.ts";

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
	} catch {
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

export function verifyMasterPassword(password: string, config: Config): boolean {
	if (!config.masterPasswordHash) return false;
	const salt = readSaltFile();
	const hash = hashPassword(password, salt);
	return hash === config.masterPasswordHash;
}

export function generateMasterPasswordHash(password: string): string {
	const salt = readSaltFile();
	return hashPassword(password, salt);
}
