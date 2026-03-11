import { Text, useInput } from "ink";
import React, { useState } from "react";
import { loadConfig, resetAllConfig, saveConfig, setSessionMasterPassword } from "../../config.ts";
import {
	generateMasterPasswordHash,
	hasMasterPassword,
	verifyMasterPassword,
} from "../../credential-store.ts";
import { useTranslation } from "../../i18n/context.tsx";
import { clearCachedKey, unwrapKey, wrapKey } from "../../keystore.ts";
import { ConfirmPrompt } from "../common/ConfirmPrompt.tsx";
import CyanSelectInput from "../common/CyanSelectInput.tsx";
import { StatusMessage } from "../common/StatusMessage.tsx";
import { TextPrompt } from "../common/TextPrompt.tsx";
import { AppShell } from "../layout/AppShell.tsx";
import type { FlowMessage } from "../types.ts";

export type SettingsAction = "open-folder" | "language" | "statusline" | "back";

type MasterPasswordStep =
	| "current-password"
	| "new-password"
	| "confirm-password"
	| "confirm-remove";

interface SettingsPageProps {
	onSelect: (action: SettingsAction) => void;
	lastMessage?: FlowMessage | null;
}

export function SettingsPage({ onSelect, lastMessage }: SettingsPageProps) {
	const { t } = useTranslation();
	const [confirming, setConfirming] = useState(false);
	const [message, setMessage] = useState<FlowMessage | null>(lastMessage ?? null);
	const [mpStep, setMpStep] = useState<MasterPasswordStep | null>(null);
	const [mpPassword, setMpPassword] = useState("");
	const [hasMp, setHasMp] = useState(false);

	// Check master password status on mount
	React.useEffect(() => {
		loadConfig().then((cfg) => setHasMp(hasMasterPassword(cfg)));
	}, []);

	useInput((_input, key) => {
		if (key.escape && !confirming && !mpStep) {
			onSelect("back");
		}
		if (key.escape && mpStep) {
			setMpStep(null);
			setMpPassword("");
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

	const handleMasterPasswordSelect = () => {
		if (hasMp) {
			// Remove: ask for current password first
			setMpStep("current-password");
		} else {
			// Set: ask for new password
			setMpStep("new-password");
		}
	};

	const handleMpCurrentPassword = async (password: string) => {
		const config = await loadConfig();
		const result = verifyMasterPassword(password, config);
		if (!result.valid) {
			setMessage({ variant: "error", text: t("settings.masterPasswordInvalid") });
			setMpStep(null);
			setMpPassword("");
			return;
		}

		if (mpStep === "current-password" && hasMp) {
			// Removing master password
			setMpStep("confirm-remove");
			setMpPassword(password);
		}
	};

	const handleRemoveConfirm = async (confirmed: boolean) => {
		if (confirmed) {
			try {
				// Unwrap the key file
				await unwrapKey(mpPassword);
				clearCachedKey();
				setSessionMasterPassword(undefined);

				// Remove hash from config and re-save (saveConfig encrypts with unwrapped key)
				const config = await loadConfig();
				delete config.masterPasswordHash;
				await saveConfig(config);
				setHasMp(false);
				setMessage({ variant: "success", text: t("settings.masterPasswordRemoved") });
			} catch {
				setMessage({ variant: "error", text: t("settings.masterPasswordInvalid") });
			}
		}
		setMpStep(null);
		setMpPassword("");
	};

	const handleNewPassword = (password: string) => {
		setMpPassword(password);
		setMpStep("confirm-password");
	};

	const handleConfirmPassword = async (confirm: string) => {
		if (confirm !== mpPassword) {
			setMessage({ variant: "error", text: t("settings.masterPasswordMismatch") });
			setMpStep(null);
			setMpPassword("");
			return;
		}

		try {
			// Load config, re-encrypt all credentials, wrap key
			const config = await loadConfig();
			config.masterPasswordHash = generateMasterPasswordHash(mpPassword);
			await saveConfig(config);
			await wrapKey(mpPassword);
			clearCachedKey();
			setSessionMasterPassword(mpPassword);
			setHasMp(true);
			setMessage({ variant: "success", text: t("settings.masterPasswordSet") });
		} catch {
			setMessage({ variant: "error", text: t("settings.masterPasswordInvalid") });
		}
		setMpStep(null);
		setMpPassword("");
	};

	const mpLabel = hasMp
		? `🔓 ${t("settings.removeMasterPassword")}`
		: `🔒 ${t("settings.setMasterPassword")}`;

	const menuItems = [
		{ label: `📂 ${t("settings.openConfigFolder")}`, value: "open-folder" as const },
		{ label: `🌐 ${t("settings.changeLanguage")}`, value: "language" as const },
		{ label: `📊 ${t("settings.statusLine")}`, value: "statusline" as const },
		{ label: mpLabel, value: "master-password" as const },
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
		} else if (item.value === "master-password") {
			handleMasterPasswordSelect();
		} else {
			onSelect(item.value as SettingsAction);
		}
	};

	const renderContent = () => {
		if (confirming) {
			return (
				<ConfirmPrompt message={t("settings.confirmResetAll")} onConfirm={handleResetConfirm} />
			);
		}

		if (mpStep === "current-password") {
			return (
				<TextPrompt
					label={t("settings.masterPasswordCurrentLabel")}
					mask="*"
					onSubmit={handleMpCurrentPassword}
				/>
			);
		}

		if (mpStep === "confirm-remove") {
			return (
				<ConfirmPrompt
					message={t("settings.removeMasterPassword") + "?"}
					onConfirm={handleRemoveConfirm}
				/>
			);
		}

		if (mpStep === "new-password") {
			return (
				<TextPrompt
					key="new-password"
					label={t("settings.masterPasswordLabel")}
					mask="*"
					onSubmit={handleNewPassword}
				/>
			);
		}

		if (mpStep === "confirm-password") {
			return (
				<TextPrompt
					key="confirm-password"
					label={t("settings.masterPasswordConfirmLabel")}
					mask="*"
					onSubmit={handleConfirmPassword}
				/>
			);
		}

		return <CyanSelectInput items={menuItems} onSelect={handleSelect} />;
	};

	return (
		<AppShell footerItems={footerItems}>
			{message && <StatusMessage variant={message.variant}>{message.text}</StatusMessage>}
			<Text bold color="cyan">
				{t("settings.title")}
			</Text>
			{renderContent()}
		</AppShell>
	);
}
