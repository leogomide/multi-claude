import { Text } from "ink";
import React, { useEffect, useMemo, useState } from "react";
import { isAccountAuthenticated, loadConfig } from "../../config.ts";
import { useTranslation } from "../../i18n/context.tsx";
import { getEffectiveModels, getProviderBaseUrl, getTemplate } from "../../providers.ts";
import type { ConfiguredProvider } from "../../schema.ts";
import { hasApiModelFetching } from "../../services/api-models.ts";
import type { GroupedSelectItem } from "../common/GroupedSelect.tsx";
import { GroupedSelect } from "../common/GroupedSelect.tsx";
import { StatusMessage } from "../common/StatusMessage.tsx";
import { AppShell } from "../layout/AppShell.tsx";
import type { SidebarItem } from "../layout/Sidebar.tsx";
import { Sidebar } from "../layout/Sidebar.tsx";
import type { FlowMessage } from "../types.ts";

export type ManageProvidersResult =
	| { type: "select-provider"; providerId: string; providerName: string }
	| { type: "add-provider" }
	| { type: "back" };

interface ManageProvidersPageProps {
	onSelect: (result: ManageProvidersResult) => void;
	onEscape: () => void;
	lastMessage?: FlowMessage | null;
}

export function ManageProvidersPage({ onSelect, onEscape, lastMessage }: ManageProvidersPageProps) {
	const { t } = useTranslation();
	const [providers, setProviders] = useState<ConfiguredProvider[]>([]);
	const [highlightedValue, setHighlightedValue] = useState<string | null>(null);

	useEffect(() => {
		loadConfig().then((config) => {
			setProviders(config.providers);
		});
	}, []);

	const groups = useMemo(() => {
		const providerItems: GroupedSelectItem[] = providers.map((p) => ({
			label: p.name,
			value: `provider:${p.id}`,
			icon: "🔧",
		}));

		const providerGroup =
			providerItems.length > 0
				? { label: t("manageProviders.title"), items: providerItems }
				: { label: t("manageProviders.title"), items: [{ label: t("manageProviders.noProviders"), value: "__no-providers__", icon: "💤" }] };

		const actionsGroup = {
			label: t("mainMenu.options"),
			items: [
				{ label: t("manageProviders.addProvider"), value: "add-provider", icon: "➕" },
				{ label: t("manageProviders.back"), value: "back", icon: "↩" },
			],
		};

		return [providerGroup, actionsGroup];
	}, [providers, t]);

	const handleSelect = (item: GroupedSelectItem) => {
		if (item.value === "__no-providers__") return;
		if (item.value.startsWith("provider:")) {
			const providerId = item.value.replace("provider:", "");
			const provider = providers.find((p) => p.id === providerId);
			onSelect({ type: "select-provider", providerId, providerName: provider?.name ?? "" });
		} else if (item.value === "add-provider") {
			onSelect({ type: "add-provider" });
		} else if (item.value === "back") {
			onSelect({ type: "back" });
		}
	};

	const handleHighlight = (item: GroupedSelectItem) => {
		setHighlightedValue(item.value);
	};

	const sidebarContent = useMemo(() => {
		if (!highlightedValue) return null;

		if (highlightedValue.startsWith("provider:")) {
			const providerId = highlightedValue.replace("provider:", "");
			const provider = providers.find((p) => p.id === providerId);
			if (!provider) return null;
			const template = getTemplate(provider.templateId);

			if (provider.type === "oauth") {
				const authenticated = isAccountAuthenticated(provider.id);
				const items: SidebarItem[] = [
					{ label: t("sidebar.name"), value: provider.name },
					{ label: t("sidebar.template"), value: template?.description ?? provider.templateId },
					{ label: t("sidebar.authStatus"), value: authenticated ? t("anthropic.authenticated") : t("anthropic.notAuthenticated"), color: authenticated ? "green" : "red" },
				];
				return <Sidebar title={t("sidebar.providerInfo")} items={items} />;
			}

			const modelCount = getEffectiveModels(provider).length;
			const modelsValue = hasApiModelFetching(provider.templateId) && modelCount === 0
				? t("sidebar.modelsViaApi")
				: String(modelCount);
			const items: SidebarItem[] = [
				{ label: t("sidebar.name"), value: provider.name },
				{ label: t("sidebar.template"), value: template?.description ?? provider.templateId },
				{ label: t("sidebar.models"), value: modelsValue },
			];
			const effectiveUrl = getProviderBaseUrl(provider);
			if (effectiveUrl) {
				items.push({ label: t("sidebar.baseUrl"), value: effectiveUrl.replace(/^https?:\/\//, "") });
			}
			return <Sidebar title={t("sidebar.providerInfo")} items={items} />;
		}

		let description = "";
		if (highlightedValue === "add-provider") description = t("sidebar.addProviderDesc");
		else if (highlightedValue === "back") description = t("footer.back");

		if (description) {
			return <Sidebar items={[{ label: "", value: description }]} />;
		}

		return null;
	}, [highlightedValue, providers, t]);

	const footerItems = [
		{ key: "↑↓", label: t("footer.navigate") },
		{ key: "⏎", label: t("footer.select") },
		{ key: "esc", label: t("footer.back") },
	];

	return (
		<AppShell sidebar={sidebarContent} footerItems={footerItems}>
			{lastMessage && (
				<StatusMessage variant={lastMessage.variant}>{lastMessage.text}</StatusMessage>
			)}
			<GroupedSelect groups={groups} onSelect={handleSelect} onHighlight={handleHighlight} onEscape={onEscape} />
		</AppShell>
	);
}
