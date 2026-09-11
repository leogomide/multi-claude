import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ChangelogEntry {
	type: string;
	description: string;
}

export interface ChangelogVersion {
	version: string;
	isCurrent: boolean;
	entries: ChangelogEntry[];
}

export async function parseChangelog(): Promise<ChangelogVersion[]> {
	try {
		const changelogPath = join(__dirname, "..", "CHANGELOG.md");
		const content = await readFile(changelogPath, "utf-8");

		const changelogMatch = content.match(/^## Changelog\s*$/m);
		if (!changelogMatch || changelogMatch.index === undefined) return [];

		const afterChangelog = content.slice(changelogMatch.index + changelogMatch[0].length);
		const nextSectionMatch = afterChangelog.match(/^## /m);
		const changelogSection = nextSectionMatch?.index
			? afterChangelog.slice(0, nextSectionMatch.index)
			: afterChangelog;

		const versions: ChangelogVersion[] = [];
		const versionRegex = /^### (v[\d.]+)(?:\s+\(current\))?/gm;
		const versionPositions: { version: string; isCurrent: boolean; index: number }[] = [];

		for (const match of changelogSection.matchAll(versionRegex)) {
			versionPositions.push({
				version: match[1]!,
				isCurrent: match[0].includes("(current)"),
				index: match.index + match[0].length,
			});
		}

		for (let i = 0; i < versionPositions.length; i++) {
			const pos = versionPositions[i]!;
			const nextPos = versionPositions[i + 1];
			const start = pos.index;
			const end = nextPos ? nextPos.index - nextPos.version.length - 5 : changelogSection.length;
			const block = changelogSection.slice(start, end);

			const entries: ChangelogEntry[] = [];
			const entryRegex = /^- \*\*(\w+):\*\*\s+(.+)$/gm;
			for (const entryMatch of block.matchAll(entryRegex)) {
				entries.push({ type: entryMatch[1]!, description: entryMatch[2]! });
			}

			versions.push({
				version: pos.version,
				isCurrent: pos.isCurrent,
				entries,
			});
		}

		return versions;
	} catch {
		return [];
	}
}
