import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import React, { useEffect, useState } from "react";
import { computeDirName, loadConfig, removeInstallationDir, renameInstallationDir, saveConfig } from "../../config.ts";
import { useTranslation } from "../../i18n/context.tsx";
import type { Installation } from "../../schema.ts";
import { ConfirmPrompt } from "../common/ConfirmPrompt.tsx";
import { StatusMessage } from "../common/StatusMessage.tsx";
import { TextPrompt } from "../common/TextPrompt.tsx";
import { AppShell } from "../layout/AppShell.tsx";
import type { FlowMessage } from "../types.ts";

type Step = "loading" | "menu" | "edit-name" | "confirm-remove";

interface EditInstallationFlowProps {
	installationId: string;
	onDone: (message?: FlowMessage) => void;
	onCancel: () => void;
}

export function EditInstallationFlow({ installationId, onDone, onCancel }: EditInstallationFlowProps) {
	const { t } = useTranslation();
	const [step, setStep] = useState<Step>("loading");
	const [installation, setInstallation] = useState<Installation | null>(null);
	const [message, setMessage] = useState<FlowMessage | null>(null);

	useInput((_input, key) => {
		if (key.escape) {
			if (step === "menu") {
				onCancel();
			} else if (step === "edit-name" || step === "confirm-remove") {
				setStep("menu");
			}
		}
	});

	useEffect(() => {
		loadConfig().then((config) => {
			const inst = config.installations.find((i) => i.id === installationId);
			if (!inst) {
				onDone({ text: t("installations.noInstallations"), variant: "warning" });
				return;
			}
			setInstallation(inst);
			setStep("menu");
		});
	}, []);

	const refreshInstallation = async () => {
		const config = await loadConfig();
		const inst = config.installations.find((i) => i.id === installationId);
		if (inst) setInstallation(inst);
	};

	const footerItems = [
		{ key: "↑↓", label: t("footer.navigate") },
		{ key: "⏎", label: t("footer.select") },
		{ key: "esc", label: t("footer.back") },
	];

	if (step === "loading") {
		return (
			<AppShell footerItems={[{ key: "esc", label: t("footer.back") }]}>
				<Text color="gray">{t("common.loading")}</Text>
			</AppShell>
		);
	}

	if (step === "menu" && installation) {
		const menuItems = [
			{ label: `✏️ ${t("installations.editName")}`, value: "edit-name" },
			{ label: `🗑️ ${t("installations.removeInstallation")}`, value: "remove" },
			{ label: `↩ ${t("installations.back")}`, value: "back" },
		];

		return (
			<AppShell footerItems={footerItems}>
				<StatusMessage variant="info">
					{installation.name}
				</StatusMessage>
				{message && <StatusMessage variant={message.variant}>{message.text}</StatusMessage>}
				<Box marginTop={1} flexDirection="column">
					<Text bold color="cyan">
						{t("common.whatToDo")}
					</Text>
					<SelectInput
						items={menuItems}
						onSelect={(item) => {
							setMessage(null);
							if (item.value === "edit-name") {
								setStep("edit-name");
							} else if (item.value === "remove") {
								setStep("confirm-remove");
							} else if (item.value === "back") {
								onCancel();
							}
						}}
					/>
				</Box>
			</AppShell>
		);
	}

	if (step === "edit-name" && installation) {
		return (
			<AppShell footerItems={[{ key: "⏎", label: t("footer.confirm") }, { key: "esc", label: t("footer.back") }]}>
				<TextPrompt
					label={t("installations.nameLabel")}
					initialValue={installation.name}
					validate={(val) => {
						if (!val.trim()) return t("validation.nameRequired");
						return undefined;
					}}
					onSubmit={(val) => {
						loadConfig().then(async (config) => {
							const inst = config.installations.find((i) => i.id === installationId);
							if (inst) {
								const oldDirName = inst.dirName;
								inst.name = val.trim();
								inst.dirName = computeDirName(inst.id, inst.name);
								await renameInstallationDir(oldDirName, inst.dirName);
							}
							await saveConfig(config);
							await refreshInstallation();
							setMessage({ text: t("installations.renamed", { name: val.trim() }), variant: "success" });
							setStep("menu");
						});
					}}
				/>
			</AppShell>
		);
	}

	if (step === "confirm-remove" && installation) {
		return (
			<AppShell footerItems={[{ key: "y/n", label: t("footer.confirm") }, { key: "esc", label: t("footer.back") }]}>
				<ConfirmPrompt
					message={t("installations.confirmRemove", { name: installation.name })}
					onConfirm={(confirmed) => {
						if (!confirmed) {
							setStep("menu");
							return;
						}
						loadConfig().then((config) => {
							const inst = config.installations.find((i) => i.id === installationId);
							const dirNameToRemove = inst?.dirName || installationId;
							config.installations = config.installations.filter((i) => i.id !== installationId);
							saveConfig(config).then(async () => {
								await removeInstallationDir(dirNameToRemove);
								onDone({
									text: t("installations.removed", { name: installation.name }),
									variant: "success",
								});
							});
						});
					}}
				/>
			</AppShell>
		);
	}

	return null;
}
