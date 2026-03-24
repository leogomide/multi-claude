import { Box, Text, useInput } from "ink";
import React, { useEffect, useMemo, useState } from "react";
import pkg from "../../../package.json";
import type { ChangelogVersion } from "../../changelog.ts";
import { parseChangelog } from "../../changelog.ts";
import { loadConfig, saveConfig } from "../../config.ts";
import { useTerminalSize } from "../../hooks/useTerminalSize.ts";
import { useTranslation } from "../../i18n/context.tsx";
import { AppShell } from "../layout/AppShell.tsx";
import { ChangelogSidebar } from "./ChangelogSidebar.tsx";

interface ChangelogPageProps {
	onBack: () => void;
}

export function ChangelogPage({ onBack }: ChangelogPageProps) {
	const { t } = useTranslation();
	const { rows } = useTerminalSize();
	const [versions, setVersions] = useState<ChangelogVersion[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeIndex, setActiveIndex] = useState(0);

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

	const highlightedVer = versions[activeIndex] ?? null;

	const sidebarContent = useMemo(() => {
		if (!highlightedVer) return null;
		return <ChangelogSidebar key={highlightedVer.version} version={highlightedVer} />;
	}, [highlightedVer]);

	// header(~3) + title(1) + blank(1) + footer(~1) = ~6 lines overhead
	const maxVisible = Math.max(3, rows - 6);

	useInput((_input, key) => {
		if (key.escape) {
			onBack();
			return;
		}
		if (key.upArrow) {
			setActiveIndex((prev) => Math.max(0, prev - 1));
		}
		if (key.downArrow) {
			setActiveIndex((prev) => Math.min(versions.length - 1, prev + 1));
		}
	});

	// Scroll windowing: keep active item centered
	const visibleWindow = useMemo(() => {
		const total = versions.length;
		if (total <= maxVisible) return { start: 0, end: total };

		// Reserve 2 lines for scroll indicators when list needs scrolling
		const itemSlots = Math.max(1, maxVisible - 2);
		const half = Math.floor(itemSlots / 2);
		let start: number;
		if (activeIndex <= half) {
			start = 0;
		} else if (activeIndex >= total - itemSlots + half) {
			start = Math.max(0, total - itemSlots);
		} else {
			start = activeIndex - half;
		}
		return { start, end: Math.min(total, start + itemSlots) };
	}, [activeIndex, versions.length, maxVisible]);

	const showUpIndicator = visibleWindow.start > 0;
	const showDownIndicator = visibleWindow.end < versions.length;

	const footerItems = [
		{ key: "↑↓", label: t("footer.navigate") },
		{ key: "esc", label: t("footer.back") },
	];

	return (
		<AppShell sidebar={sidebarContent} footerItems={footerItems}>
			<Text bold color="cyan">
				{t("changelog.title")}
			</Text>
			<Text> </Text>

			{loading && <Text dimColor>{t("common.loading")}</Text>}

			{!loading && versions.length === 0 && <Text color="yellow">{t("changelog.empty")}</Text>}

			{!loading && versions.length > 0 && (
				<Box flexDirection="column">
					{showUpIndicator && <Text dimColor>{" ↑ ..."}</Text>}
					{versions.slice(visibleWindow.start, visibleWindow.end).map((ver, i) => {
						const globalIndex = visibleWindow.start + i;
						const isActive = globalIndex === activeIndex;
						const label = ver.isCurrent ? `${ver.version} (current)` : ver.version;
						return (
							<Box key={ver.version}>
								<Text bold={isActive} color={isActive ? "cyan" : undefined}>
									{isActive ? "❯ " : "  "}
									{label}
								</Text>
							</Box>
						);
					})}
					{showDownIndicator && <Text dimColor>{" ↓ ..."}</Text>}
				</Box>
			)}
		</AppShell>
	);
}
