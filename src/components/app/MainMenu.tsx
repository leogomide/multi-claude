import { Text } from "ink";
import React, { useEffect, useMemo, useState } from "react";
import pkg from "../../../package.json";
import { isAccountAuthenticated, loadConfig } from "../../config.ts";
import { getCliId } from "../../headless.ts";
import { useUpdateCheck } from "../../hooks/useUpdateCheck.ts";
import { useTranslation } from "../../i18n/context.tsx";
import { getEffectiveModels, getTemplate } from "../../providers.ts";
import type { ConfiguredProvider } from "../../schema.ts";
import { hasApiModelFetching } from "../../services/api-models.ts";
import type { GroupedSelectGroup, GroupedSelectItem } from "../common/GroupedSelect.tsx";
import { GroupedSelect } from "../common/GroupedSelect.tsx";
import { StatusMessage } from "../common/StatusMessage.tsx";
import { AppShell } from "../layout/AppShell.tsx";
import type { SidebarItem } from "../layout/Sidebar.tsx";
import { Sidebar } from "../layout/Sidebar.tsx";
import type { FlowMessage } from "../types.ts";

export type MainMenuResult =
	| { type: "launch-provider"; providerId: string; providerName: string }
	| { type: "launch-default" }
	| { type: "manage-providers" }
	| { type: "manage-installations" }
	| { type: "settings" }
	| { type: "update" }
	| { type: "changelog" }
	| { type: "exit" };

interface MainMenuProps {
	onSelect: (result: MainMenuResult) => void;
	onEscape: () => void;
	lastMessage?: FlowMessage | null;
}

export function MainMenu({ onSelect, onEscape, lastMessage }: MainMenuProps) {
	const { t } = useTranslation();
	const [providers, setProviders] = useState<ConfiguredProvider[]>([]);
	const [highlightedValue, setHighlightedValue] = useState<string | null>(null);
	const [message, setMessage] = useState<FlowMessage | null>(lastMessage ?? null);
	const [hasNewChangelog, setHasNewChangelog] = useState(false);
	const { latestVersion } = useUpdateCheck(pkg.version);

	useEffect(() => {
		loadConfig().then((config) => {
			setProviders(config.providers);
			setHasNewChangelog(config.lastSeenChangelogVersion !== pkg.version);
		});
	}, []);

	const groups = useMemo(() => {
		const defaultItem: GroupedSelectItem = {
			label: t("mainMenu.defaultLaunch"),
			value: "__launch-default__",
			icon: "🏠",
		};

		const providerItems: GroupedSelectItem[] = [
			defaultItem,
			...providers.map((p) => ({
				label: p.name,
				value: `provider:${p.id}`,
				icon: p.apiKeyValid === false ? "⚠" : p.type === "oauth" ? "🔐" : "🚀",
				color: p.apiKeyValid === false ? "yellow" : undefined,
			})),
		];

		const launchGroup = { label: t("mainMenu.startClaude"), items: providerItems };

		const actionsGroup = {
			label: t("mainMenu.options"),
			items: [
				{ label: t("mainMenu.manageProviders"), value: "manage-providers", icon: "🔧" },
				{ label: t("mainMenu.manageInstallations"), value: "manage-installations", icon: "📁" },
				{ label: t("mainMenu.settings"), value: "settings", icon: "⚙️" },
				{
					label: hasNewChangelog ? t("changelog.menuItemNew") : t("changelog.menuItem"),
					value: "changelog",
					icon: "📋",
					color: hasNewChangelog ? "green" : undefined,
				},
				{ label: t("menu.exit"), value: "exit", icon: "🚪" },
			],
		};

		const result: GroupedSelectGroup[] = [];
		if (latestVersion) {
			result.push({
				label: t("update.groupLabel"),
				labelColor: "yellow",
				items: [
					{
						label: t("update.menuItem", { version: latestVersion }),
						value: "update",
						icon: "⬆️",
						color: "yellow",
					},
				],
			});
		}
		result.push(launchGroup, actionsGroup);
		return result;
	}, [providers, t, latestVersion, hasNewChangelog]);

	const handleSelect = (item: GroupedSelectItem) => {
		if (item.value === "__launch-default__") {
			onSelect({ type: "launch-default" });
			return;
		}
		if (item.value === "update") {
			onSelect({ type: "update" });
		} else if (item.value.startsWith("provider:")) {
			const providerId = item.value.replace("provider:", "");
			const provider = providers.find((p) => p.id === providerId);
			if (provider?.apiKeyValid === false) {
				setMessage({ variant: "error", text: t("mainMenu.apiKeyInvalidError") });
				return;
			}
			onSelect({ type: "launch-provider", providerId, providerName: provider?.name ?? "" });
		} else if (item.value === "manage-providers") {
			onSelect({ type: "manage-providers" });
		} else if (item.value === "manage-installations") {
			onSelect({ type: "manage-installations" });
		} else if (item.value === "settings") {
			onSelect({ type: "settings" });
		} else if (item.value === "changelog") {
			onSelect({ type: "changelog" });
		} else if (item.value === "exit") {
			onSelect({ type: "exit" });
		}
	};

	const handleHighlight = (item: GroupedSelectItem) => {
		setHighlightedValue(item.value);
	};

	const sidebarContent = useMemo(() => {
		if (!highlightedValue) return null;

		if (highlightedValue === "__launch-default__") {
			return <Sidebar items={[{ label: "", value: t("mainMenu.defaultLaunchDesc") }]} />;
		}

		if (highlightedValue.startsWith("provider:")) {
			const providerId = highlightedValue.replace("provider:", "");
			const provider = providers.find((p) => p.id === providerId);
			if (!provider) return null;
			const template = getTemplate(provider.templateId);

			if (provider.type === "oauth") {
				const authenticated = isAccountAuthenticated(provider.id);
				const items: SidebarItem[] = [
					{ label: t("sidebar.name"), value: provider.name },
					{ label: t("sidebar.cliId"), value: getCliId(provider, providers) },
					{ label: t("sidebar.template"), value: template?.description ?? provider.templateId },
					{
						label: t("sidebar.authStatus"),
						value: authenticated ? t("anthropic.authenticated") : t("anthropic.notAuthenticated"),
						color: authenticated ? "green" : "red",
					},
				];
				return <Sidebar title={t("sidebar.providerInfo")} items={items} />;
			}

			const modelCount = getEffectiveModels(provider).length;
			const modelsValue =
				hasApiModelFetching(provider.templateId) && modelCount === 0
					? t("sidebar.modelsViaApi")
					: String(modelCount);
			const items: SidebarItem[] = [
				{ label: t("sidebar.name"), value: provider.name },
				{ label: t("sidebar.cliId"), value: getCliId(provider, providers) },
				{ label: t("sidebar.template"), value: template?.description ?? provider.templateId },
				{ label: t("sidebar.models"), value: modelsValue },
			];
			if (template?.baseUrl) {
				items.push({
					label: t("sidebar.baseUrl"),
					value: template.baseUrl.replace("https://", ""),
				});
			}
			if (provider.apiKeyValid === false) {
				items.push({
					label: t("sidebar.apiKeyStatus"),
					value: t("sidebar.apiKeyInvalid"),
					color: "red",
				});
			}
			return <Sidebar title={t("sidebar.providerInfo")} items={items} />;
		}

		let description = "";
		if (highlightedValue === "update") description = t("update.sidebarDesc");
		else if (highlightedValue === "manage-providers")
			description = t("sidebar.manageProvidersDesc");
		else if (highlightedValue === "manage-installations")
			description = t("sidebar.manageInstallationsDesc");
		else if (highlightedValue === "settings") description = t("sidebar.settingsDesc");
		else if (highlightedValue === "changelog") description = t("sidebar.changelogDesc");
		else if (highlightedValue === "exit") description = t("sidebar.exitDesc");

		if (description) {
			return <Sidebar items={[{ label: "", value: description }]} />;
		}

		return null;
	}, [highlightedValue, providers, t]);

	const footerItems = [
		{ key: "↑↓", label: t("footer.navigate") },
		{ key: "⏎", label: t("footer.select") },
		{ key: "esc", label: t("footer.quit") },
	];

	return (
		<AppShell sidebar={sidebarContent} footerItems={footerItems}>
			{message && <StatusMessage variant={message.variant}>{message.text}</StatusMessage>}
			<GroupedSelect
				groups={groups}
				onSelect={handleSelect}
				onHighlight={handleHighlight}
				onEscape={onEscape}
			/>
		</AppShell>
	);
}
