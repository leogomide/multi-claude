import { existsSync, readFileSync } from "node:fs";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { decrypt, deriveKey, encrypt, isEncryptedPayload } from "./crypto.ts";
import type { EncryptedPayload } from "./crypto.ts";

const CONFIG_DIR = join(homedir(), ".multi-claude");
const KEY_FILE = join(CONFIG_DIR, ".key");
const SALT_FILE = join(CONFIG_DIR, ".salt");

let cachedKey: Buffer | null = null;

async function setSecurePermissions(filePath: string): Promise<void> {
	if (process.platform !== "win32") {
		try {
			await chmod(filePath, 0o600);
		} catch {
			// Ignore permission errors (e.g., on some filesystems)
		}
	}
}

export async function initKeystore(): Promise<void> {
	await mkdir(CONFIG_DIR, { recursive: true });

	if (!existsSync(KEY_FILE)) {
		const key = randomBytes(32);
		await writeFile(KEY_FILE, key.toString("base64"), "utf-8");
		await setSecurePermissions(KEY_FILE);
	}

	if (!existsSync(SALT_FILE)) {
		const salt = randomBytes(32);
		await writeFile(SALT_FILE, salt.toString("base64"), "utf-8");
		await setSecurePermissions(SALT_FILE);
	}
}

export function readKeyFileRaw(): string {
	return readFileSync(KEY_FILE, "utf-8").trim();
}

export function readSaltFile(): Buffer {
	return Buffer.from(readFileSync(SALT_FILE, "utf-8").trim(), "base64");
}

export function isKeyWrapped(): boolean {
	if (!existsSync(KEY_FILE)) return false;
	const content = readKeyFileRaw();
	return isEncryptedPayload(content);
}

export async function getEncryptionKey(masterPassword?: string): Promise<Buffer> {
	if (cachedKey) return cachedKey;

	const raw = readKeyFileRaw();

	if (isEncryptedPayload(raw)) {
		if (!masterPassword) {
			throw new Error("Master password required to decrypt key file");
		}
		const salt = readSaltFile();
		const wrappingKey = deriveKey(masterPassword, salt);
		const payload = JSON.parse(raw) as EncryptedPayload;
		const keyStr = decrypt(payload, wrappingKey);
		cachedKey = Buffer.from(keyStr, "base64");
	} else {
		cachedKey = Buffer.from(raw, "base64");
	}

	return cachedKey;
}

export async function wrapKey(masterPassword: string): Promise<void> {
	const raw = readKeyFileRaw();
	let keyBase64: string;

	if (isEncryptedPayload(raw)) {
		// Already wrapped — unwrap first to get the raw key
		const salt = readSaltFile();
		const oldWrappingKey = deriveKey(masterPassword, salt);
		const payload = JSON.parse(raw) as EncryptedPayload;
		keyBase64 = decrypt(payload, oldWrappingKey);
	} else {
		keyBase64 = raw;
	}

	const salt = readSaltFile();
	const wrappingKey = deriveKey(masterPassword, salt);
	const encrypted = encrypt(keyBase64, wrappingKey);
	await writeFile(KEY_FILE, JSON.stringify(encrypted), "utf-8");
	await setSecurePermissions(KEY_FILE);
	cachedKey = null;
}

export async function unwrapKey(masterPassword: string): Promise<void> {
	const raw = readKeyFileRaw();
	if (!isEncryptedPayload(raw)) return;

	const salt = readSaltFile();
	const wrappingKey = deriveKey(masterPassword, salt);
	const payload = JSON.parse(raw) as EncryptedPayload;
	const keyBase64 = decrypt(payload, wrappingKey);

	await writeFile(KEY_FILE, keyBase64, "utf-8");
	await setSecurePermissions(KEY_FILE);
	cachedKey = null;
}

export function clearCachedKey(): void {
	cachedKey = null;
}
