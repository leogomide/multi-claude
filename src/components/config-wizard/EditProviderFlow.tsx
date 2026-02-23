import { Spinner } from "@inkjs/ui";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import React, { useEffect, useState } from "react";
import { loadConfig, removeAccountDir, saveConfig } from "../../config.ts";
import { useTranslation } from "../../i18n/context.tsx";
import { getTemplate } from "../../providers.ts";
import type { ConfiguredProvider } from "../../schema.ts";
import { hasApiKeyValidation, validateApiKey } from "../../services/api-models.ts";
import { ConfirmPrompt } from "../common/ConfirmPrompt.tsx";
import { StatusMessage } from "../common/StatusMessage.tsx";
import { TextPrompt } from "../common/TextPrompt.tsx";
import { AppShell } from "../layout/AppShell.tsx";
import type { FlowMessage } from "../types.ts";

type Step = "loading" | "menu" | "edit-name" | "edit-key" | "edit-url" | "validating-key" | "confirm-remove";

interface EditProviderFlowProps {
	providerId: string;
	onDone: (message?: FlowMessage) => void;
	onManageModels: () => void;
	onOAuthLogin: (result: { providerId: string; providerName: string; isNew: boolean }) => void;
	onCancel: () => void;
}

export function EditProviderFlow({ providerId, onDone, onManageModels, onOAuthLogin, onCancel }: EditProviderFlowProps) {
	const { t } = useTranslation();
	const [step, setStep] = useState<Step>("loading");
	const [provider, setProvider] = useState<ConfiguredProvider | null>(null);
	const [message, setMessage] = useState<FlowMessage | null>(null);
	const [pendingApiKey, setPendingApiKey] = useState("");
	const [validationError, setValidationError] = useState<string | null>(null);

	useInput((_input, key) => {
		if (key.escape) {
			if (step === "menu") {
				onCancel();
			} else if (step === "edit-name" || step === "edit-key" || step === "edit-url" || step === "confirm-remove") {
				setStep("menu");
			} else if (step === "validating-key") {
				setStep("edit-key");
			}
		}
	});

	useEffect(() => {
		if (step !== "validating-key") return;
		let cancelled = false;

		validateApiKey(provider?.templateId ?? "", pendingApiKey).then((result) => {
			if (cancelled) return;
			if (result.valid) {
				loadConfig().then((config) => {
					if (cancelled) return;
					const prov = config.providers.find((p) => p.id === providerId);
					if (prov) {
						prov.apiKey = pendingApiKey.trim();
					}
					saveConfig(config).then(() => {
						if (cancelled) return;
						refreshProvider().then(() => {
							if (cancelled) return;
							setMessage({ text: t("editProvider.apiKeyUpdated"), variant: "success" });
							setStep("menu");
						});
					});
				});
			} else {
				const template = getTemplate(provider?.templateId ?? "");
				const providerLabel = template?.description ?? provider?.templateId ?? "";
				const errorMsg = result.error === "auth"
					? t("apiModels.keyInvalid")
					: result.error === "network"
						? t("apiModels.networkError", { provider: providerLabel })
						: t("apiModels.fetchError", { provider: providerLabel });
				setValidationError(errorMsg);
				setStep("edit-key");
			}
		});

		return () => { cancelled = true; };
	}, [step]);

	useEffect(() => {
		loadConfig().then((config) => {
			const prov = config.providers.find((p) => p.id === providerId);
			if (!prov) {
				onDone({ text: t("editFlow.noProviders"), variant: "warning" });
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
		const isOAuth = provider.type === "oauth";
		const hasDefaultApiKey = template?.defaultApiKey != null;
		const menuItems = isOAuth
			? [
				{ label: `✏️ ${t("editProvider.editName")}`, value: "edit-name" },
				{ label: `🔐 ${t("anthropic.reAuthenticate")}`, value: "re-auth" },
				{ label: `🗑️ ${t("editProvider.removeProvider")}`, value: "remove" },
				{ label: `↩ ${t("editProvider.back")}`, value: "back" },
			]
			: [
				{ label: `✏️ ${t("editProvider.editName")}`, value: "edit-name" },
				...(hasDefaultApiKey ? [{ label: `🌐 ${t("editProvider.editUrl")}`, value: "edit-url" }] : []),
				...(!hasDefaultApiKey ? [{ label: `🔑 ${t("editProvider.editApiKey")}`, value: "edit-key" }] : []),
				{ label: `📋 ${t("editProvider.manageModels")}`, value: "manage-models" },
				{ label: `🗑️ ${t("editProvider.removeProvider")}`, value: "remove" },
				{ label: `↩ ${t("editProvider.back")}`, value: "back" },
			];

		return (
			<AppShell footerItems={footerItems}>
				<StatusMessage variant="info">
					{provider.name} ({template?.description ?? provider.templateId})
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
							} else if (item.value === "edit-url") {
								setStep("edit-url");
							} else if (item.value === "edit-key") {
								setStep("edit-key");
							} else if (item.value === "manage-models") {
								onManageModels();
							} else if (item.value === "re-auth") {
								onOAuthLogin({ providerId, providerName: provider.name, isNew: false });
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

	if (step === "edit-name" && provider) {
		return (
			<AppShell footerItems={[{ key: "⏎", label: t("footer.confirm") }, { key: "esc", label: t("footer.back") }]}>
				<TextPrompt
					label={t("editFlow.nameLabel")}
					initialValue={provider.name}
					validate={(val) => {
						if (!val.trim()) return t("validation.nameRequired");
						return undefined;
					}}
					onSubmit={(val) => {
						loadConfig().then((config) => {
							const prov = config.providers.find((p) => p.id === providerId);
							if (prov) {
								prov.name = val.trim();
							}
							saveConfig(config).then(() => {
								refreshProvider().then(() => {
									setMessage({ text: t("editProvider.nameUpdated", { name: val.trim() }), variant: "success" });
									setStep("menu");
								});
							});
						});
					}}
				/>
			</AppShell>
		);
	}

	if (step === "edit-url" && provider) {
		const template = getTemplate(provider.templateId);
		const currentUrl = provider.baseUrl || template?.baseUrl || "";
		return (
			<AppShell footerItems={[{ key: "⏎", label: t("footer.confirm") }, { key: "esc", label: t("footer.back") }]}>
				<TextPrompt
					label={t("editFlow.urlLabel")}
					initialValue={currentUrl}
					validate={(val) => {
						const trimmed = val.trim();
						if (!trimmed) return t("validation.urlInvalid");
						if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
							return t("validation.urlMustBeHttp");
						}
						try {
							new URL(trimmed);
						} catch {
							return t("validation.urlInvalid");
						}
						return undefined;
					}}
					onSubmit={(url) => {
						const trimmedUrl = url.trim().replace(/\/+$/, "");
						loadConfig().then((config) => {
							const prov = config.providers.find((p) => p.id === providerId);
							if (prov) {
								const templateUrl = getTemplate(prov.templateId)?.baseUrl;
								prov.baseUrl = trimmedUrl !== templateUrl ? trimmedUrl : undefined;
							}
							saveConfig(config).then(() => {
								refreshProvider().then(() => {
									setMessage({ text: t("editProvider.urlUpdated", { url: trimmedUrl }), variant: "success" });
									setStep("menu");
								});
							});
						});
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

	if (step === "edit-key") {
		return (
			<AppShell footerItems={[{ key: "⏎", label: t("footer.confirm") }, { key: "esc", label: t("footer.back") }]}>
				<TextPrompt
					label={t("editFlow.apiKeyLabel")}
					mask="*"
					validate={(val) => {
						if (!val.trim()) return t("validation.apiKeyRequired");
						return undefined;
					}}
					onSubmit={(apiKey) => {
						if (hasApiKeyValidation(provider?.templateId ?? "")) {
							setPendingApiKey(apiKey);
							setValidationError(null);
							setStep("validating-key");
						} else {
							loadConfig().then((config) => {
								const prov = config.providers.find((p) => p.id === providerId);
								if (prov) {
									prov.apiKey = apiKey.trim();
								}
								saveConfig(config).then(() => {
									refreshProvider().then(() => {
										setMessage({ text: t("editProvider.apiKeyUpdated"), variant: "success" });
										setStep("menu");
									});
								});
							});
						}
					}}
				/>
				{validationError && (
					<Box marginTop={1}>
						<StatusMessage variant="error">{validationError}</StatusMessage>
					</Box>
				)}
			</AppShell>
		);
	}

	if (step === "confirm-remove" && provider) {
		return (
			<AppShell footerItems={[{ key: "y/n", label: t("footer.confirm") }, { key: "esc", label: t("footer.back") }]}>
				<ConfirmPrompt
					message={t("removeFlow.confirmRemove", { name: provider.name })}
					onConfirm={(confirmed) => {
						if (!confirmed) {
							setStep("menu");
							return;
						}
						loadConfig().then((config) => {
							const prov = config.providers.find((p) => p.id === providerId);
							const isOAuthProv = prov?.type === "oauth";
							config.providers = config.providers.filter((p) => p.id !== providerId);
							saveConfig(config).then(async () => {
								if (isOAuthProv) {
									await removeAccountDir(providerId);
								}
								onDone({
									text: t("removeFlow.success", { name: provider.name }),
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
