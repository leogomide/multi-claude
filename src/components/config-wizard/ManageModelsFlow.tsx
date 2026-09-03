import { Box, Text, useInput } from "ink";
import React, { useEffect, useState } from "react";
import { loadConfig, saveConfig } from "../../config.ts";
import { useTranslation } from "../../i18n/context.tsx";
import { getEffectiveModels, getTemplate, resolveModelSpec } from "../../providers.ts";
import type { ConfiguredProvider } from "../../schema.ts";
import { formatContextLength } from "../../utils/format-tokens.ts";
import { parseContextWindow, validateContextWindow } from "../../utils/validate-context.ts";
import CyanSelectInput from "../common/CyanSelectInput.tsx";
import { Note } from "../common/Note.tsx";
import { StatusMessage } from "../common/StatusMessage.tsx";
import { TextPrompt } from "../common/TextPrompt.tsx";
import { AppShell } from "../layout/AppShell.tsx";

type Step =
	| "loading"
	| "menu"
	| "add-model"
	| "add-model-context"
	| "remove-model"
	| "set-context-select"
	| "set-context-value";

interface ManageModelsFlowProps {
	providerId: string;
	onDone: () => void;
	onCancel: () => void;
}

export function ManageModelsFlow({ providerId, onDone, onCancel }: ManageModelsFlowProps) {
	const { t } = useTranslation();
	const [step, setStep] = useState<Step>("loading");
	const [provider, setProvider] = useState<ConfiguredProvider | null>(null);
	const [pendingModel, setPendingModel] = useState("");
	const [message, setMessage] = useState<{
		text: string;
		variant: "success" | "warning" | "info";
	} | null>(null);

	useInput((_input, key) => {
		if (key.escape) {
			if (step === "menu") onCancel();
			else if (step !== "loading") setStep("menu");
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

	/** Read, mutate, save, refresh and report — the same four steps every action needs. */
	const mutateProvider = async (
		mutate: (prov: ConfiguredProvider) => void,
		msg: { text: string; variant: "success" | "warning" | "info" },
	) => {
		const config = await loadConfig();
		const prov = config.providers.find((p) => p.id === providerId);
		if (prov) mutate(prov);
		await saveConfig(config);
		await refreshProvider();
		setMessage(msg);
		setStep("menu");
	};

	/** Drop an override without leaving an empty object behind in config.json. */
	const withoutOverride = (prov: ConfiguredProvider, model: string) => {
		if (!prov.modelSpecs) return;
		const next = { ...prov.modelSpecs };
		delete next[model.toLowerCase()];
		prov.modelSpecs = Object.keys(next).length > 0 ? next : undefined;
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

		const specTag = (m: string) => {
			const spec = resolveModelSpec(provider, m);
			return spec ? ` — ${formatContextLength(spec.context)} ctx` : "";
		};

		const modelLines: string[] = [];
		for (const m of defaultModels) {
			modelLines.push(`  ${m} ${t("modelsFlow.defaultTag")}${specTag(m)}`);
		}
		for (const m of userOnlyModels) {
			modelLines.push(`  ${m}${specTag(m)}`);
		}

		const menuItems = [
			{ label: `➕ ${t("modelsFlow.addModel")}`, value: "add" },
			{ label: `📐 ${t("modelsFlow.setContext")}`, value: "set-context" },
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
					<CyanSelectInput
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
							if (item.value === "set-context") {
								if (getEffectiveModels(provider).length === 0) {
									setMessage({ text: t("modelsFlow.noModelsForContext"), variant: "warning" });
									return;
								}
								setStep("set-context-select");
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
			<AppShell
				footerItems={[
					{ key: "⏎", label: t("footer.confirm") },
					{ key: "esc", label: t("footer.back") },
				]}
			>
				{/* Keyed so the next TextPrompt step does not inherit this one's typed value. */}
				<TextPrompt
					key="add-model"
					label={t("modelsFlow.modelNameLabel")}
					validate={(val) => {
						if (!val.trim()) return t("validation.modelNameRequired");
						return undefined;
					}}
					onSubmit={(modelName) => {
						setPendingModel(modelName.trim());
						setStep("add-model-context");
					}}
				/>
			</AppShell>
		);
	}

	if (step === "add-model-context") {
		return (
			<AppShell
				footerItems={[
					{ key: "⏎", label: t("footer.confirm") },
					{ key: "esc", label: t("footer.back") },
				]}
			>
				<TextPrompt
					key="add-model-context"
					label={t("modelsFlow.contextLabel")}
					validate={(val) => validateContextWindow(val, t)}
					onSubmit={(val) => {
						const tokens = parseContextWindow(val);
						mutateProvider(
							(prov) => {
								prov.models.push(pendingModel);
								if (tokens) {
									prov.modelSpecs = {
										...prov.modelSpecs,
										[pendingModel.toLowerCase()]: { context: tokens },
									};
								}
							},
							{ text: t("modelsFlow.modelAdded", { name: pendingModel }), variant: "success" },
						);
					}}
				/>
			</AppShell>
		);
	}

	if (step === "set-context-select" && provider) {
		// Covers the template defaults too, so a built-in table entry can be corrected.
		const items = getEffectiveModels(provider).map((m) => {
			const spec = resolveModelSpec(provider, m);
			return { label: spec ? `${m} — ${formatContextLength(spec.context)} ctx` : m, value: m };
		});
		return (
			<AppShell footerItems={footerItems}>
				<Text bold color="cyan">
					{t("modelsFlow.selectModelForContext")}
				</Text>
				<CyanSelectInput
					items={items}
					onSelect={(item) => {
						setPendingModel(item.value);
						setStep("set-context-value");
					}}
				/>
			</AppShell>
		);
	}

	if (step === "set-context-value" && provider) {
		return (
			<AppShell
				footerItems={[
					{ key: "⏎", label: t("footer.confirm") },
					{ key: "esc", label: t("footer.back") },
				]}
			>
				<TextPrompt
					key={`set-context-value-${pendingModel}`}
					label={t("modelsFlow.contextEditLabel")}
					initialValue={String(resolveModelSpec(provider, pendingModel)?.context ?? "")}
					validate={(val) => validateContextWindow(val, t)}
					onSubmit={(val) => {
						const tokens = parseContextWindow(val);
						const key = pendingModel.toLowerCase();
						mutateProvider(
							(prov) => {
								if (tokens) prov.modelSpecs = { ...prov.modelSpecs, [key]: { context: tokens } };
								else withoutOverride(prov, pendingModel);
							},
							tokens
								? {
										text: t("modelsFlow.contextUpdated", {
											name: pendingModel,
											value: formatContextLength(tokens),
										}),
										variant: "success",
									}
								: { text: t("modelsFlow.contextCleared", { name: pendingModel }), variant: "info" },
						);
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
				<CyanSelectInput
					items={items}
					onSelect={(item) => {
						mutateProvider(
							(prov) => {
								prov.models = prov.models.filter((m) => m !== item.value);
								// A removed model must not leave its override behind (RN-05).
								withoutOverride(prov, item.value);
							},
							{ text: t("modelsFlow.modelRemoved", { name: item.value }), variant: "success" },
						);
					}}
				/>
			</AppShell>
		);
	}

	return null;
}
