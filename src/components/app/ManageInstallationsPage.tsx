import React, { useEffect, useMemo, useState } from "react";
import { loadConfig } from "../../config.ts";
import { getInstallationPath } from "../../config.ts";
import { useTranslation } from "../../i18n/context.tsx";
import type { Installation } from "../../schema.ts";
import type { GroupedSelectItem } from "../common/GroupedSelect.tsx";
import { GroupedSelect } from "../common/GroupedSelect.tsx";
import { StatusMessage } from "../common/StatusMessage.tsx";
import { AppShell } from "../layout/AppShell.tsx";
import { Sidebar } from "../layout/Sidebar.tsx";
import type { SidebarItem } from "../layout/Sidebar.tsx";
import type { FlowMessage } from "../types.ts";

export type ManageInstallationsResult =
	| { type: "select-installation"; installationId: string; installationName: string }
	| { type: "add-installation" }
	| { type: "back" };

interface ManageInstallationsPageProps {
	onSelect: (result: ManageInstallationsResult) => void;
	onEscape: () => void;
	lastMessage?: FlowMessage | null;
}

export function ManageInstallationsPage({ onSelect, onEscape, lastMessage }: ManageInstallationsPageProps) {
	const { t } = useTranslation();
	const [installations, setInstallations] = useState<Installation[]>([]);
	const [highlightedValue, setHighlightedValue] = useState<string | null>(null);

	useEffect(() => {
		loadConfig().then((config) => {
			setInstallations(config.installations);
		});
	}, []);

	const groups = useMemo(() => {
		const installationItems: GroupedSelectItem[] = installations.map((inst) => ({
			label: inst.name,
			value: `installation:${inst.id}`,
			icon: "📁",
		}));

		const installationGroup =
			installationItems.length > 0
				? { label: t("installations.title"), items: installationItems }
				: { label: t("installations.title"), items: [{ label: t("installations.noInstallations"), value: "__no-installations__", icon: "💤" }] };

		const actionsGroup = {
			label: t("mainMenu.options"),
			items: [
				{ label: t("installations.addInstallation"), value: "add-installation", icon: "➕" },
				{ label: t("installations.back"), value: "back", icon: "↩" },
			],
		};

		return [installationGroup, actionsGroup];
	}, [installations, t]);

	const handleSelect = (item: GroupedSelectItem) => {
		if (item.value === "__no-installations__") return;
		if (item.value.startsWith("installation:")) {
			const installationId = item.value.replace("installation:", "");
			const installation = installations.find((i) => i.id === installationId);
			onSelect({ type: "select-installation", installationId, installationName: installation?.name ?? "" });
		} else if (item.value === "add-installation") {
			onSelect({ type: "add-installation" });
		} else if (item.value === "back") {
			onSelect({ type: "back" });
		}
	};

	const handleHighlight = (item: GroupedSelectItem) => {
		setHighlightedValue(item.value);
	};

	const sidebarContent = useMemo(() => {
		if (!highlightedValue) return null;

		if (highlightedValue.startsWith("installation:")) {
			const installationId = highlightedValue.replace("installation:", "");
			const installation = installations.find((i) => i.id === installationId);
			if (!installation) return null;
			const items: SidebarItem[] = [
				{ label: t("sidebar.name"), value: installation.name },
				{ label: t("sidebar.installationPath"), value: getInstallationPath(installation.dirName) },
			];
			return <Sidebar title={t("sidebar.installationInfo")} items={items} />;
		}

		let description = "";
		if (highlightedValue === "add-installation") description = t("sidebar.manageInstallationsDesc");
		else if (highlightedValue === "back") description = t("footer.back");

		if (description) {
			return <Sidebar items={[{ label: "", value: description }]} />;
		}

		return null;
	}, [highlightedValue, installations, t]);

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
