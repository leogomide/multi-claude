import { Spinner } from "@inkjs/ui";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import React, { useEffect, useMemo, useState } from "react";
import { ensureInstallationDir, loadConfig, saveConfig } from "../../config.ts";
import { useTranslation } from "../../i18n/context.tsx";
import { PROVIDER_TEMPLATES } from "../../providers.ts";
import type { ConfiguredProvider } from "../../schema.ts";
import { hasApiKeyValidation, validateApiKey } from "../../services/api-models.ts";
import { StatusMessage } from "../common/StatusMessage.tsx";
import { TextPrompt } from "../common/TextPrompt.tsx";
import { AppShell } from "../layout/AppShell.tsx";
import type { SidebarItem } from "../layout/Sidebar.tsx";
import { Sidebar } from "../layout/Sidebar.tsx";
import type { FlowMessage } from "../types.ts";

type Step = "template" | "details" | "validating-key" | "oauth-name" | "create-installation";

interface AddProviderFlowProps {
	onDone: (message?: FlowMessage) => void;
	onOAuthLogin: (result: { providerId: string; providerName: string; isNew: boolean }) => void;
	onCancel: () => void;
}

export function AddProviderFlow({ onDone, onOAuthLogin, onCancel }: AddProviderFlowProps) {
	const { t } = useTranslation();
	const [step, setStep] = useState<Step>("template");
	const [templateId, setTemplateId] = useState("");
	const [name, setName] = useState("");
	const [activeField, setActiveField] = useState<"name" | "key">("name");
	const [highlightedTemplateId, setHighlightedTemplateId] = useState<string | null>(PROVIDER_TEMPLATES[0]?.id ?? null);
	const [apiKey, setApiKey] = useState("");
	const [validationError, setValidationError] = useState<string | null>(null);

	useInput(
		(_input, key) => {
			if (key.escape) {
				if (step === "template") {
					onCancel();
				} else if (step === "validating-key") {
					setStep("details");
					setActiveField("key");
				} else if (step === "create-installation") {
					setStep("template");
				}
			}
		},
		{ isActive: step === "template" || step === "validating-key" || step === "create-installation" },
	);

	const isOAuthTemplate = (id: string) => id === "anthropic";

	useEffect(() => {
		if (step !== "validating-key") return;
		let cancelled = false;

		validateApiKey(templateId, apiKey).then((result) => {
			if (cancelled) return;
			if (result.valid) {
				loadConfig().then((config) => {
					if (cancelled) return;
					const provider: ConfiguredProvider = {
						id: crypto.randomUUID(),
						name,
						templateId,
						type: "api",
						apiKey,
						models: [...(template?.defaultModels ?? [])],
					};
					config.providers.push(provider);
					saveConfig(config).then(() => {
						if (cancelled) return;
						onDone({ text: t("addFlow.success", { name }), variant: "success" });
					});
				});
			} else {
				const providerLabel = template?.description ?? templateId;
				const errorMsg = result.error === "auth"
					? t("apiModels.keyInvalid")
					: result.error === "network"
						? t("apiModels.networkError", { provider: providerLabel })
						: t("apiModels.fetchError", { provider: providerLabel });
				setValidationError(errorMsg);
				setActiveField("key");
				setStep("details");
			}
		});

		return () => { cancelled = true; };
	}, [step]);

	const template = PROVIDER_TEMPLATES.find((tmpl) => tmpl.id === templateId);

	const templateItems = PROVIDER_TEMPLATES.map((tmpl) => ({
		label: tmpl.description,
		value: tmpl.id,
	}));

	const sidebarContent = useMemo(() => {
		const currentId = step === "template" ? highlightedTemplateId : templateId;
		if (!currentId) return undefined;

		const tmpl = PROVIDER_TEMPLATES.find((tp) => tp.id === currentId);
		if (!tmpl) return undefined;

		const items: SidebarItem[] = [
			{ label: t("sidebar.name"), value: tmpl.description },
		];

		if (isOAuthTemplate(tmpl.id)) {
			items.push(
				{ label: t("sidebar.type"), value: "OAuth" },
				{ label: "", value: t("anthropic.noApiKeyNeeded") },
			);
		} else if (tmpl.defaultApiKey) {
			items.push(
				{ label: t("sidebar.baseUrl"), value: tmpl.baseUrl.replace(/^https?:\/\//, "") },
				{ label: t("sidebar.type"), value: "Local" },
				{ label: "", value: t("localProvider.noApiKeyNeeded") },
			);
		} else {
			items.push(
				{ label: t("sidebar.baseUrl"), value: tmpl.baseUrl.replace(/^https?:\/\//, "") },
				{ label: t("sidebar.models"), value: String(tmpl.defaultModels.length) },
			);

			if (tmpl.defaultModels.length > 0) {
				items.push({
					label: t("addFlow.defaultModels"),
					value: tmpl.defaultModels.join(", "),
				});
			} else {
				items.push({
					label: t("addFlow.defaultModels"),
					value: t("sidebar.modelsViaApi"),
				});
			}
		}

		return <Sidebar title={t("sidebar.providerInfo")} items={items} />;
	}, [step, highlightedTemplateId, templateId, t]);

	const templateFooterItems = [
		{ key: "↑↓", label: t("footer.navigate") },
		{ key: "⏎", label: t("footer.select") },
		{ key: "esc", label: t("footer.back") },
	];

	if (step === "template") {
		return (
			<AppShell sidebar={sidebarContent} footerItems={templateFooterItems}>
				<Text bold color="cyan">
					{t("addFlow.selectTemplate")}
				</Text>
				<SelectInput
					items={templateItems}
					onHighlight={(item) => {
						setHighlightedTemplateId(item.value);
					}}
					onSelect={(item) => {
						setTemplateId(item.value);
						const tmpl = PROVIDER_TEMPLATES.find((tp) => tp.id === item.value);
						if (tmpl) setName(tmpl.description);
						if (isOAuthTemplate(item.value)) {
							// Check if custom installations exist
							loadConfig().then((config) => {
								if (config.installations.length === 0) {
									setStep("create-installation");
								} else {
									setActiveField("name");
									setStep("oauth-name");
								}
							});
						} else {
							setActiveField("name");
							setStep("details");
						}
					}}
				/>
			</AppShell>
		);
	}

	if (step === "create-installation") {
		return (
			<AppShell sidebar={sidebarContent} footerItems={[{ key: "⏎", label: t("footer.confirm") }, { key: "esc", label: t("footer.back") }]}>
				<StatusMessage variant="info">
					{t("installations.requiredForAnthropic")}
				</StatusMessage>
				<Text>{t("installations.createForAnthropic")}</Text>
				<Box marginTop={1}>
					<TextPrompt
						label={t("installations.nameLabel")}
						placeholder="My Installation"
						validate={(val) => {
							if (!val.trim()) return t("validation.nameRequired");
							return undefined;
						}}
						onSubmit={(val) => {
							const installationName = val.trim();
							const installationId = crypto.randomUUID();
							loadConfig().then((config) => {
								config.installations.push({ id: installationId, name: installationName });
								saveConfig(config).then(() => {
									ensureInstallationDir(installationId).then(() => {
										setActiveField("name");
										setStep("oauth-name");
									});
								});
							});
						}}
						onCancel={() => {
							setStep("template");
						}}
					/>
				</Box>
			</AppShell>
		);
	}

	if (step === "oauth-name") {
		return (
			<AppShell sidebar={sidebarContent} footerItems={[{ key: "⏎", label: t("footer.confirm") }, { key: "esc", label: t("footer.back") }]}>
				<TextPrompt
					label={t("addFlow.nameLabel")}
					initialValue={name}
					placeholder="My Anthropic Account"
					validate={(val) => {
						if (!val.trim()) return t("validation.nameRequired");
						return undefined;
					}}
					onSubmit={(val) => {
						const providerName = val.trim();
						setName(providerName);
						const newProvider = {
							id: crypto.randomUUID(),
							name: providerName,
							templateId: "anthropic",
							type: "oauth" as const,
							apiKey: "",
							models: [],
						};
						loadConfig().then((config) => {
							config.providers.push(newProvider);
							saveConfig(config).then(() => {
								onOAuthLogin({ providerId: newProvider.id, providerName, isNew: true });
							});
						});
					}}
					onCancel={() => {
						setStep("template");
					}}
				/>
			</AppShell>
		);
	}

	if (step === "validating-key") {
		return (
			<AppShell footerItems={[{ key: "esc", label: t("footer.back") }]}>
				<Spinner label={t("apiModels.validatingKey")} />
			</AppShell>
		);
	}

	const detailsFooterItems = [
		{ key: "⏎", label: activeField === "name" ? t("footer.next") : t("footer.confirm") },
		{ key: "esc", label: t("footer.back") },
	];

	return (
		<AppShell sidebar={sidebarContent} footerItems={detailsFooterItems}>
			<TextPrompt
				label={t("addFlow.nameLabel")}
				initialValue={name}
				placeholder={template?.description}
				focus={activeField === "name"}
				validate={(val) => {
					if (!val.trim()) return t("validation.nameRequired");
					return undefined;
				}}
				onSubmit={(val) => {
					setName(val);
					const defaultKey = template?.defaultApiKey;
					if (defaultKey) {
						loadConfig().then((config) => {
							const provider: ConfiguredProvider = {
								id: crypto.randomUUID(),
								name: val,
								templateId,
								type: "api",
								apiKey: defaultKey,
								models: [...(template?.defaultModels ?? [])],
							};
							config.providers.push(provider);
							saveConfig(config).then(() => {
								onDone({ text: t("addFlow.success", { name: val }), variant: "success" });
							});
						});
					} else {
						setActiveField("key");
					}
				}}
				onCancel={() => {
					setStep("template");
				}}
			/>
			{!template?.defaultApiKey && (
				<Box marginTop={1}>
					<TextPrompt
						label={t("addFlow.apiKeyLabel")}
						mask="*"
						focus={activeField === "key"}
						validate={(val) => {
							if (!val.trim()) return t("validation.apiKeyRequired");
							return undefined;
						}}
						onSubmit={(key) => {
							if (hasApiKeyValidation(templateId)) {
								setApiKey(key);
								setValidationError(null);
								setStep("validating-key");
							} else {
								loadConfig().then((config) => {
									const provider: ConfiguredProvider = {
										id: crypto.randomUUID(),
										name,
										templateId,
										type: "api",
										apiKey: key,
										models: [...(template?.defaultModels ?? [])],
									};
									config.providers.push(provider);
									saveConfig(config).then(() => {
										onDone({ text: t("addFlow.success", { name }), variant: "success" });
									});
								});
							}
						}}
						onCancel={() => {
							setActiveField("name");
						}}
					/>
					{validationError && (
						<Box marginTop={1}>
							<StatusMessage variant="error">{validationError}</StatusMessage>
						</Box>
					)}
				</Box>
			)}
		</AppShell>
	);
}
