import {
	createCipheriv,
	createDecipheriv,
	pbkdf2Sync,
	randomBytes,
} from "node:crypto";

export interface EncryptedPayload {
	v: 1;
	alg: "aes-256-gcm";
	iv: string;
	tag: string;
	data: string;
}

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 600_000;
const KEY_LENGTH = 32;

export function encrypt(plaintext: string, key: Buffer): EncryptedPayload {
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
	const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
	const tag = cipher.getAuthTag();
	return {
		v: 1,
		alg: ALGORITHM,
		iv: iv.toString("base64"),
		tag: tag.toString("base64"),
		data: encrypted.toString("base64"),
	};
}

export function decrypt(payload: EncryptedPayload, key: Buffer): string {
	const iv = Buffer.from(payload.iv, "base64");
	const tag = Buffer.from(payload.tag, "base64");
	const data = Buffer.from(payload.data, "base64");
	const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
	decipher.setAuthTag(tag);
	return decipher.update(data) + decipher.final("utf-8");
}

export function isEncryptedPayload(value: string): boolean {
	if (!value.startsWith("{")) return false;
	try {
		const parsed = JSON.parse(value) as Record<string, unknown>;
		return parsed.v === 1 && parsed.alg === "aes-256-gcm";
	} catch {
		return false;
	}
}

export function deriveKey(secret: string, salt: Buffer): Buffer {
	return pbkdf2Sync(secret, salt, PBKDF2_ITERATIONS, KEY_LENGTH, "sha512");
}

export function hashPassword(password: string, salt: Buffer): string {
	return pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, "sha512").toString("base64");
}
