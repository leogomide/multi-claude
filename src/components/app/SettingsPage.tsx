import { Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import React, { useState } from "react";
import { resetAllConfig } from "../../config.ts";
import { useTranslation } from "../../i18n/context.tsx";
import { ConfirmPrompt } from "../common/ConfirmPrompt.tsx";
import { StatusMessage } from "../common/StatusMessage.tsx";
import { AppShell } from "../layout/AppShell.tsx";
import type { FlowMessage } from "../types.ts";

export type SettingsAction = "open-folder" | "language" | "back";

interface SettingsPageProps {
	onSelect: (action: SettingsAction) => void;
	lastMessage?: FlowMessage | null;
}

export function SettingsPage({ onSelect, lastMessage }: SettingsPageProps) {
	const { t } = useTranslation();
	const [confirming, setConfirming] = useState(false);
	const [message, setMessage] = useState<FlowMessage | null>(lastMessage ?? null);

	useInput((_input, key) => {
		if (key.escape && !confirming) {
			onSelect("back");
		}
	});

	const handleResetConfirm = (confirmed: boolean) => {
		if (confirmed) {
			resetAllConfig().then(() => {
				process.exit(1);
			});
		} else {
			setConfirming(false);
		}
	};

	const menuItems = [
		{ label: `📂 ${t("settings.openConfigFolder")}`, value: "open-folder" as const },
		{ label: `🌐 ${t("settings.changeLanguage")}`, value: "language" as const },
		{ label: `🗑️ ${t("settings.resetAll")}`, value: "reset-all" as const },
		{ label: `↩ ${t("settings.back")}`, value: "back" as const },
	];

	const footerItems = [
		{ key: "↑↓", label: t("footer.navigate") },
		{ key: "⏎", label: t("footer.select") },
		{ key: "esc", label: t("footer.back") },
	];

	const handleSelect = (item: { value: string }) => {
		if (item.value === "reset-all") {
			setConfirming(true);
		} else {
			onSelect(item.value as SettingsAction);
		}
	};

	return (
		<AppShell footerItems={footerItems}>
			{message && (
				<StatusMessage variant={message.variant}>{message.text}</StatusMessage>
			)}
			<Text bold color="cyan">
				{t("settings.title")}
			</Text>
			{confirming ? (
				<ConfirmPrompt message={t("settings.confirmResetAll")} onConfirm={handleResetConfirm} />
			) : (
				<SelectInput items={menuItems} onSelect={handleSelect} />
			)}
		</AppShell>
	);
}
