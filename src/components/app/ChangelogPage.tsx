import { Box, Text, useInput } from "ink";
import React, { useEffect, useMemo, useState } from "react";
import pkg from "../../../package.json";
import type { ChangelogVersion } from "../../changelog.ts";
import { parseChangelog } from "../../changelog.ts";
import { loadConfig, saveConfig } from "../../config.ts";
import { useTerminalSize } from "../../hooks/useTerminalSize.ts";
import { useTranslation } from "../../i18n/context.tsx";
import CyanSelectInput from "../common/CyanSelectInput.tsx";
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
	const [highlightedVersion, setHighlightedVersion] = useState<string | null>(null);

	useEffect(() => {
		parseChangelog().then((v) => {
			setVersions(v);
			if (v.length > 0) setHighlightedVersion(v[0]!.version);
			setLoading(false);
		});
		loadConfig().then((config) => {
			if (config.lastSeenChangelogVersion !== pkg.version) {
				config.lastSeenChangelogVersion = pkg.version;
				saveConfig(config);
			}
		});
	}, []);

	const items = useMemo(
		() =>
			versions.map((v) => ({
				label: v.isCurrent ? `${v.version} (current)` : v.version,
				value: v.version,
			})),
		[versions],
	);

	const highlightedVer = useMemo(
		() => versions.find((v) => v.version === highlightedVersion) ?? null,
		[highlightedVersion, versions],
	);

	const sidebarContent = useMemo(() => {
		if (!highlightedVer) return null;
		return <ChangelogSidebar key={highlightedVer.version} version={highlightedVer} />;
	}, [highlightedVer]);

	useInput((_input, key) => {
		if (key.escape) onBack();
	});

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
					<CyanSelectInput
						items={items}
						limit={Math.max(3, rows - 6)}
						onHighlight={(item) => setHighlightedVersion(item.value)}
						onSelect={() => {}}
					/>
				</Box>
			)}
		</AppShell>
	);
}
