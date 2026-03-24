import { Box, Text, useInput } from "ink";
import React, { useEffect, useMemo, useState } from "react";
import pkg from "../../../package.json";
import type { ChangelogVersion } from "../../changelog.ts";
import { parseChangelog } from "../../changelog.ts";
import { loadConfig, saveConfig } from "../../config.ts";
import { useTerminalSize } from "../../hooks/useTerminalSize.ts";
import { useTranslation } from "../../i18n/context.tsx";
import { AppShell } from "../layout/AppShell.tsx";

interface ChangelogPageProps {
	onBack: () => void;
}

const TYPE_COLORS: Record<string, string> = {
	feat: "green",
	fix: "yellow",
	refactor: "blue",
	docs: "magenta",
};

interface ChangelogLine {
	type: "header" | "entry" | "spacer";
	version?: string;
	isCurrent?: boolean;
	entryType?: string;
	description?: string;
}

export function ChangelogPage({ onBack }: ChangelogPageProps) {
	const { t } = useTranslation();
	const { rows } = useTerminalSize();
	const [versions, setVersions] = useState<ChangelogVersion[]>([]);
	const [loading, setLoading] = useState(true);
	const [scrollOffset, setScrollOffset] = useState(0);

	useEffect(() => {
		parseChangelog().then((v) => {
			setVersions(v);
			setLoading(false);
		});
		loadConfig().then((config) => {
			if (config.lastSeenChangelogVersion !== pkg.version) {
				config.lastSeenChangelogVersion = pkg.version;
				saveConfig(config);
			}
		});
	}, []);

	const lines = useMemo(() => {
		const result: ChangelogLine[] = [];
		for (const ver of versions) {
			result.push({ type: "header", version: ver.version, isCurrent: ver.isCurrent });
			for (const entry of ver.entries) {
				result.push({ type: "entry", entryType: entry.type, description: entry.description });
			}
			result.push({ type: "spacer" });
		}
		return result;
	}, [versions]);

	// header(1) + title(1) + blank(1) + footer(1) + padding = ~6 lines overhead
	const maxVisible = Math.max(3, rows - 6);
	const canScrollUp = scrollOffset > 0;
	const canScrollDown = scrollOffset + maxVisible < lines.length;

	useInput((_input, key) => {
		if (key.escape) {
			onBack();
			return;
		}
		if (key.upArrow) {
			setScrollOffset((o) => Math.max(0, o - 1));
		}
		if (key.downArrow) {
			setScrollOffset((o) => Math.min(Math.max(0, lines.length - maxVisible), o + 1));
		}
	});

	const footerItems = [
		{ key: "↑↓", label: t("footer.scroll") },
		{ key: "esc", label: t("footer.back") },
	];

	const visibleLines = lines.slice(scrollOffset, scrollOffset + maxVisible);

	return (
		<AppShell footerItems={footerItems}>
			<Text bold color="cyan">
				{t("changelog.title")}
			</Text>
			<Text> </Text>

			{loading && <Text dimColor>{t("common.loading")}</Text>}

			{!loading && versions.length === 0 && <Text color="yellow">{t("changelog.empty")}</Text>}

			{!loading && versions.length > 0 && (
				<Box flexDirection="column" overflow="hidden">
					{canScrollUp && <Text dimColor>{" ↑ ..."}</Text>}
					{visibleLines.map((line, i) => {
						if (line.type === "header") {
							return (
								<Text key={`${line.version}-h-${i}`} bold color="cyan">
									{"  "}
									{line.version}
									{line.isCurrent && <Text color="green">{" (current)"}</Text>}
								</Text>
							);
						}
						if (line.type === "entry") {
							const color = TYPE_COLORS[line.entryType ?? ""] ?? "white";
							return (
								<Text key={`entry-${i}`}>
									{"    "}
									<Text bold color={color}>
										{line.entryType}
									</Text>
									<Text>{`: ${line.description}`}</Text>
								</Text>
							);
						}
						return <Text key={`spacer-${i}`}> </Text>;
					})}
					{canScrollDown && <Text dimColor>{" ↓ ..."}</Text>}
				</Box>
			)}
		</AppShell>
	);
}
