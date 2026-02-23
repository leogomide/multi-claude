import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import React, { useEffect, useState } from "react";
import { loadConfig, saveConfig } from "../../config.ts";
import { useTranslation } from "../../i18n/context.tsx";
import { getTemplate } from "../../providers.ts";
import type { ConfiguredProvider } from "../../schema.ts";
import { Note } from "../common/Note.tsx";
import { StatusMessage } from "../common/StatusMessage.tsx";
import { TextPrompt } from "../common/TextPrompt.tsx";
import { AppShell } from "../layout/AppShell.tsx";

type Step = "loading" | "menu" | "add-model" | "remove-model";

interface ManageModelsFlowProps {
	providerId: string;
	onDone: () => void;
	onCancel: () => void;
}

export function ManageModelsFlow({ providerId, onDone, onCancel }: ManageModelsFlowProps) {
	const { t } = useTranslation();
	const [step, setStep] = useState<Step>("loading");
	const [provider, setProvider] = useState<ConfiguredProvider | null>(null);
	const [message, setMessage] = useState<{
		text: string;
		variant: "success" | "warning" | "info";
	} | null>(null);

	useInput((_input, key) => {
		if (key.escape) {
			if (step === "menu") {
				onCancel();
			} else if (step === "add-model" || step === "remove-model") {
				setStep("menu");
			}
		}
	});

	useEffect(() => {
		loadConfig().then((config) => {
			const prov = config.providers.find((p) => p.id === providerId);
			if (!prov) {
				onDone();
				return;
			}
			setProvider(prov);
			setStep("menu");
		});
	}, []);

	const refreshProvider = async () => {
		const config = await loadConfig();
		const prov = config.providers.find((p) => p.id === providerId);
		if (prov) setProvider(prov);
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

	if (step === "menu" && provider) {
		const template = getTemplate(provider.templateId);
		const defaultModels = template?.defaultModels ?? [];
		const userModels = provider.models;
		const defaultSet = new Set(defaultModels);
		const userOnlyModels = userModels.filter((m) => !defaultSet.has(m));
		const hasModels = defaultModels.length > 0 || userModels.length > 0;

		const modelLines: string[] = [];
		for (const m of defaultModels) {
			modelLines.push(`  ${m} ${t("modelsFlow.defaultTag")}`);
		}
		for (const m of userOnlyModels) {
			modelLines.push(`  ${m}`);
		}

		const menuItems = [
			{ label: `➕ ${t("modelsFlow.addModel")}`, value: "add" },
			{ label: `🗑️ ${t("modelsFlow.removeModel")}`, value: "remove" },
			{ label: `↩ ${t("modelsFlow.back")}`, value: "back" },
		];

		return (
			<AppShell footerItems={footerItems}>
				{hasModels ? (
					<Note title={t("modelsFlow.modelsForProvider", { name: provider.name })}>
						{modelLines.join("\n")}
					</Note>
				) : (
					<StatusMessage variant="info">
						{t("modelsFlow.noModels", { name: provider.name })}
					</StatusMessage>
				)}
				{message && <StatusMessage variant={message.variant}>{message.text}</StatusMessage>}
				<Box marginTop={1} flexDirection="column">
					<Text bold color="cyan">
						{t("common.whatToDo")}
					</Text>
					<SelectInput
						items={menuItems}
						onSelect={(item) => {
							setMessage(null);
							if (item.value === "back") {
								onCancel();
								return;
							}
							if (item.value === "add") {
								setStep("add-model");
								return;
							}
							if (item.value === "remove") {
								if (provider.models.length === 0) {
									setMessage({ text: t("modelsFlow.noUserModels"), variant: "warning" });
									return;
								}
								setStep("remove-model");
								return;
							}
						}}
					/>
				</Box>
			</AppShell>
		);
	}

	if (step === "add-model") {
		return (
			<AppShell footerItems={[{ key: "⏎", label: t("footer.confirm") }, { key: "esc", label: t("footer.back") }]}>
				<TextPrompt
					label={t("modelsFlow.modelNameLabel")}
					validate={(val) => {
						if (!val.trim()) return t("validation.modelNameRequired");
						return undefined;
					}}
					onSubmit={(modelName) => {
						loadConfig().then((config) => {
							const prov = config.providers.find((p) => p.id === providerId);
							if (prov) {
								prov.models.push(modelName.trim());
							}
							saveConfig(config).then(() => {
								refreshProvider().then(() => {
									setMessage({
										text: t("modelsFlow.modelAdded", { name: modelName.trim() }),
										variant: "success",
									});
									setStep("menu");
								});
							});
						});
					}}
				/>
			</AppShell>
		);
	}

	if (step === "remove-model" && provider) {
		const items = provider.models.map((m) => ({ label: m, value: m }));
		return (
			<AppShell footerItems={footerItems}>
				<Text bold color="cyan">
					{t("modelsFlow.selectModelToRemove")}
				</Text>
				<SelectInput
					items={items}
					onSelect={(item) => {
						loadConfig().then((config) => {
							const prov = config.providers.find((p) => p.id === providerId);
							if (prov) {
								prov.models = prov.models.filter((m) => m !== item.value);
							}
							saveConfig(config).then(() => {
								refreshProvider().then(() => {
									setMessage({
										text: t("modelsFlow.modelRemoved", { name: item.value }),
										variant: "success",
									});
									setStep("menu");
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
