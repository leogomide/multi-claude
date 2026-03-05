import { createLogger } from "../debug.ts";

const log = createLogger("version-check");

const NPM_REGISTRY_URL = "https://registry.npmjs.org/@leogomide/multi-claude/latest";

export type VersionCheckResult =
	| { updateAvailable: true; latestVersion: string }
	| { updateAvailable: false };

export function compareSemver(a: string, b: string): number {
	const pa = a.split(".").map(Number);
	const pb = b.split(".").map(Number);
	for (let i = 0; i < 3; i++) {
		const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
		if (diff !== 0) return diff;
	}
	return 0;
}

export async function checkForUpdate(
	currentVersion: string,
	signal?: AbortSignal,
): Promise<VersionCheckResult> {
	try {
		const response = await fetch(NPM_REGISTRY_URL, {
			signal,
			headers: { Accept: "application/json" },
		});

		if (!response.ok) {
			log.warn("registry returned status " + response.status);
			return { updateAvailable: false };
		}

		const data = (await response.json()) as { version?: string };
		const latestVersion = data.version;

		if (!latestVersion) {
			log.warn("no version field in response");
			return { updateAvailable: false };
		}

		log.info(`current=${currentVersion}, latest=${latestVersion}`);

		if (compareSemver(latestVersion, currentVersion) > 0) {
			return { updateAvailable: true, latestVersion };
		}

		return { updateAvailable: false };
	} catch (err) {
		log.debug("fetch failed: " + String(err));
		return { updateAvailable: false };
	}
}
