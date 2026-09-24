import { Spinner } from "@inkjs/ui";
import { Box, Text, useInput } from "ink";
import React, { useEffect, useMemo, useState } from "react";
import {
	computeDirName,
	ensureInstallationDir,
	generateShortId,
	loadConfig,
	saveConfig,
} from "../../config.ts";
import { useTerminalSize } from "../../hooks/useTerminalSize.ts";
import { useTranslation } from "../../i18n/context.tsx";
import { getTemplateLabel, PROVIDER_TEMPLATES } from "../../providers.ts";
import type { AuthVar, ConfiguredProvider } from "../../schema.ts";
import {
	hasApiKeyValidation,
	hasApiModelFetching,
	validateApiKey,
} from "../../services/api-models.ts";
import {
	ignoresContextWindow,
	parseContextWindow,
	validateContextWindow,
} from "../../utils/validate-context.ts";
import { normalizeBaseUrl, validateBaseUrl } from "../../utils/validate-url.ts";
import CyanSelectInput from "../common/CyanSelectInput.tsx";
import { StatusMessage } from "../common/StatusMessage.tsx";
import { TextPrompt } from "../common/TextPrompt.tsx";
import { AppShell } from "../layout/AppShell.tsx";
import type { SidebarItem } from "../layout/Sidebar.tsx";
import { Sidebar } from "../layout/Sidebar.tsx";
import type { FlowMessage } from "../types.ts";

type Step = "template" | "details" | "validating-key" | "oauth-name" | "create-installation";
type Field = "name" | "url" | "auth" | "key" | "model" | "context";

interface AddProviderFlowProps {
	onDone: (message?: FlowMessage) => void;
	onOAuthLogin: (result: { providerId: string; providerName: string; isNew: boolean }) => void;
	onCancel: () => void;
}

export function AddProviderFlow({ onDone, onOAuthLogin, onCancel }: AddProviderFlowProps) {
	const { t } = useTranslation();
	const { rows } = useTerminalSize();
	const [step, setStep] = useState<Step>("template");
	const [templateId, setTemplateId] = useState("");
	const [name, setName] = useState("");
	const [activeField, setActiveField] = useState<Field>("name");
	const [highlightedTemplateId, setHighlightedTemplateId] = useState<string | null>(
		PROVIDER_TEMPLATES[0]?.id ?? null,
	);
	const [baseUrl, setBaseUrl] = useState("");
	const [apiKey, setApiKey] = useState("");
	const [authVar, setAuthVar] = useState<AuthVar>("ANTHROPIC_AUTH_TOKEN");
	const [pendingModels, setPendingModels] = useState<string[]>([]);
	const [pendingSpecs, setPendingSpecs] = useState<ConfiguredProvider["modelSpecs"]>(undefined);
	const [modelDraft, setModelDraft] = useState("");
	const [validationError, setValidationError] = useState<string | null>(null);
	const [existingNames, setExistingNames] = useState<string[]>([]);

	useEffect(() => {
		loadConfig().then((config) => {
			setExistingNames(config.providers.map((p) => p.name.toLowerCase()));
		});
	}, []);

	const template = PROVIDER_TEMPLATES.find((tmpl) => tmpl.id === templateId);

	// A template that can list its models over the API does not need one typed by hand.
	const modelIsOptional = hasApiModelFetching(templateId);
	const modelId = modelDraft.trim();

	const persistProvider = async (
		effectiveKey: string,
		models: string[],
		modelSpecs?: ConfiguredProvider["modelSpecs"],
	) => {
		const config = await loadConfig();
		const provider: ConfiguredProvider = {
			id: crypto.randomUUID(),
			name,
			templateId,
			type: "api",
			apiKey: effectiveKey,
			apiKeyValid: true,
			models,
			baseUrl: baseUrl && baseUrl !== template?.baseUrl ? baseUrl : undefined,
			authVar: template?.promptAuthVar ? authVar : undefined,
			modelSpecs,
		};
		config.providers.push(provider);
		await saveConfig(config);
		onDone({ text: t("addFlow.success", { name }), variant: "success" });
	};

	useInput(
		(_input, key) => {
			if (!key.escape) return;
			if (step === "template") {
				onCancel();
			} else if (step === "validating-key") {
				setStep("details");
				setActiveField("key");
			} else if (step === "create-installation") {
				setStep("template");
			} else if (step === "details" && activeField === "auth") {
				setActiveField("url");
			}
		},
		{
			isActive:
				step === "template" ||
				step === "validating-key" ||
				step === "create-installation" ||
				(step === "details" && activeField === "auth"),
		},
	);

	const isOAuthTemplate = (id: string) => id === "anthropic";

	useEffect(() => {
		if (step !== "validating-key") return;
		let cancelled = false;

		validateApiKey(templateId, apiKey, baseUrl || undefined).then((result) => {
			if (cancelled) return;
			if (result.valid) {
				persistProvider(apiKey, pendingModels, pendingSpecs).catch(() => {});
			} else {
				// The name the user just typed beats the template label, which is identical
				// for every provider created from the same template.
				const providerLabel = name || (template ? getTemplateLabel(template, t) : templateId);
				const errorMsg =
					result.error === "auth"
						? t("apiModels.keyInvalid")
						: result.error === "network"
							? t("apiModels.networkError", { provider: providerLabel })
							: t("apiModels.fetchError", { provider: providerLabel });
				setValidationError(errorMsg);
				setActiveField("key");
				setStep("details");
			}
		});

		return () => {
			cancelled = true;
		};
	}, [step]);

	const templateItems = PROVIDER_TEMPLATES.map((tmpl) => ({
		// Decoration stays in the list only: the saved provider name is the plain label.
		label: tmpl.sponsor
			? `★ ${getTemplateLabel(tmpl, t)} (${t("templates.sponsor")})`
			: getTemplateLabel(tmpl, t),
		value: tmpl.id,
		color: tmpl.sponsor ? "green" : undefined,
	}));

	const authVarItems = [
		{ label: t("addFlow.authVarBearer"), value: "ANTHROPIC_AUTH_TOKEN" },
		{ label: t("addFlow.authVarApiKey"), value: "ANTHROPIC_API_KEY" },
	];

	const authVarLabel =
		authVar === "ANTHROPIC_API_KEY" ? t("addFlow.authVarApiKey") : t("addFlow.authVarBearer");

	const sidebarContent = useMemo(() => {
		const currentId = step === "template" ? highlightedTemplateId : templateId;
		if (!currentId) return undefined;

		const tmpl = PROVIDER_TEMPLATES.find((tp) => tp.id === currentId);
		if (!tmpl) return undefined;

		const items: SidebarItem[] = [{ label: t("sidebar.name"), value: getTemplateLabel(tmpl, t) }];

		if (isOAuthTemplate(tmpl.id)) {
			items.push({ label: "", value: t("anthropic.noApiKeyNeeded") });
		} else {
			items.push(
				{
					label: t("sidebar.baseUrl"),
					value: tmpl.baseUrl
						? tmpl.baseUrl.replace(/^https?:\/\//, "")
						: t("sidebar.baseUrlUserDefined"),
				},
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
					value: tmpl.promptModel ? t("sidebar.modelsUserDefined") : t("sidebar.modelsViaApi"),
				});
			}
		}

		if (tmpl.sponsor) {
			items.push(
				{ label: t("sidebar.sponsor"), value: t("sidebar.flattCta"), color: "yellow" },
				{
					label: t("sidebar.sponsorLink"),
					value: `${new URL(tmpl.sponsor.url).host} ↗`,
					color: "cyan",
					href: tmpl.sponsor.url,
				},
			);
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
				<CyanSelectInput
					items={templateItems}
					limit={Math.max(3, rows - 10)}
					onHighlight={(item) => {
						setHighlightedTemplateId(item.value);
					}}
					onSelect={(item) => {
						setTemplateId(item.value);
						const tmpl = PROVIDER_TEMPLATES.find((tp) => tp.id === item.value);
						if (tmpl) setName(getTemplateLabel(tmpl, t));
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
			<AppShell
				sidebar={sidebarContent}
				footerItems={[
					{ key: "⏎", label: t("footer.confirm") },
					{ key: "esc", label: t("footer.back") },
				]}
			>
				<StatusMessage variant="info">{t("installations.requiredForAnthropic")}</StatusMessage>
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
							const id = generateShortId();
							const dirName = computeDirName(id, installationName);
							loadConfig().then((config) => {
								config.installations.push({ id, name: installationName, dirName });
								saveConfig(config).then(() => {
									ensureInstallationDir(dirName).then(() => {
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
			<AppShell
				sidebar={sidebarContent}
				footerItems={[
					{ key: "⏎", label: t("footer.confirm") },
					{ key: "esc", label: t("footer.back") },
				]}
			>
				<TextPrompt
					label={t("addFlow.nameLabel")}
					initialValue={name}
					placeholder="My Anthropic Account"
					validate={(val) => {
						if (!val.trim()) return t("validation.nameRequired");
						if (existingNames.includes(val.trim().toLowerCase()))
							return t("validation.nameDuplicate");
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
							apiKeyValid: true,
							models: [] as string[],
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

	// Without a model id there is nothing to attach a context window to, so the model
	// field itself becomes the last one and the footer must say "confirm" there.
	const lastField: Field = template?.promptModel ? (modelId ? "context" : "model") : "key";

	const detailsFooterItems = [
		{
			key: "⏎",
			label: activeField === lastField ? t("footer.confirm") : t("footer.next"),
		},
		{ key: "esc", label: t("footer.back") },
	];

	const backFromKey = () => {
		if (template?.promptAuthVar) setActiveField("auth");
		else if (template?.promptBaseUrl) setActiveField("url");
		else setActiveField("name");
	};

	const proceedAfterKey = (effectiveKey: string, shouldValidate: boolean) => {
		setApiKey(effectiveKey);
		if (template?.promptModel) {
			setActiveField("model");
			return;
		}
		const models = [...(template?.defaultModels ?? [])];
		if (shouldValidate) {
			setPendingModels(models);
			setValidationError(null);
			setStep("validating-key");
		} else {
			persistProvider(effectiveKey, models).catch(() => {});
		}
	};

	const finishWithModels = (models: string[], specs?: ConfiguredProvider["modelSpecs"]) => {
		if (hasApiKeyValidation(templateId)) {
			setPendingModels(models);
			setPendingSpecs(specs);
			setValidationError(null);
			setStep("validating-key");
		} else {
			persistProvider(apiKey, models, specs).catch(() => {});
		}
	};

	return (
		<AppShell sidebar={sidebarContent} footerItems={detailsFooterItems}>
			<TextPrompt
				label={t("addFlow.nameLabel")}
				initialValue={name}
				placeholder={template ? getTemplateLabel(template, t) : undefined}
				focus={activeField === "name"}
				validate={(val) => {
					if (!val.trim()) return t("validation.nameRequired");
					if (existingNames.includes(val.trim().toLowerCase()))
						return t("validation.nameDuplicate");
					return undefined;
				}}
				onSubmit={(val) => {
					setName(val.trim());
					if (template?.promptBaseUrl) {
						setBaseUrl(template?.baseUrl ?? "");
						setActiveField("url");
					} else {
						setActiveField("key");
					}
				}}
				onCancel={() => {
					setStep("template");
				}}
			/>
			{template?.promptBaseUrl && (
				<Box marginTop={1}>
					<TextPrompt
						label={t("addFlow.urlLabel")}
						initialValue={baseUrl}
						placeholder={template?.baseUrl}
						focus={activeField === "url"}
						validate={(val) => validateBaseUrl(val, t)}
						onSubmit={(url) => {
							setBaseUrl(normalizeBaseUrl(url));
							if (template?.promptAuthVar) setActiveField("auth");
							else setActiveField("key");
						}}
						onCancel={() => {
							setActiveField("name");
						}}
					/>
				</Box>
			)}
			{template?.promptAuthVar && activeField === "auth" && (
				<Box marginTop={1} flexDirection="column">
					<Text bold color="cyan">
						{t("addFlow.authVarLabel")}
					</Text>
					<CyanSelectInput
						items={authVarItems}
						onSelect={(item) => {
							setAuthVar(item.value as AuthVar);
							setActiveField("key");
						}}
					/>
				</Box>
			)}
			{template?.promptAuthVar &&
				(activeField === "key" || activeField === "model" || activeField === "context") && (
					<Box marginTop={1} flexDirection="column">
						<Text dimColor>{t("addFlow.authVarLabel")}</Text>
						<Box>
							<Text color="green">{"✓ "}</Text>
							<Text>{authVarLabel}</Text>
						</Box>
					</Box>
				)}
			{template?.defaultApiKey ? (
				<Box marginTop={1} flexDirection="column">
					<TextPrompt
						label={t("addFlow.apiKeyLabelOptional")}
						mask="*"
						focus={activeField === "key"}
						onSubmit={(key) => {
							const typed = key.trim();
							const effectiveKey = typed || template.defaultApiKey!;
							proceedAfterKey(effectiveKey, Boolean(typed) && hasApiKeyValidation(templateId));
						}}
						onCancel={backFromKey}
					/>
					{validationError && activeField === "key" && (
						<Box marginTop={1}>
							<StatusMessage variant="error">{validationError}</StatusMessage>
						</Box>
					)}
				</Box>
			) : (
				<Box marginTop={1} flexDirection="column">
					<TextPrompt
						label={t("addFlow.apiKeyLabel")}
						mask="*"
						focus={activeField === "key"}
						validate={(val) => {
							if (!val.trim()) return t("validation.apiKeyRequired");
							return undefined;
						}}
						onSubmit={(key) => {
							proceedAfterKey(key, hasApiKeyValidation(templateId));
						}}
						onCancel={backFromKey}
					/>
					{validationError && activeField === "key" && (
						<Box marginTop={1}>
							<StatusMessage variant="error">{validationError}</StatusMessage>
						</Box>
					)}
				</Box>
			)}
			{template?.promptModel && (
				<Box marginTop={1}>
					<TextPrompt
						label={modelIsOptional ? t("addFlow.modelLabelOptional") : t("addFlow.modelLabel")}
						focus={activeField === "model"}
						validate={(val) => {
							if (!modelIsOptional && !val.trim()) return t("validation.modelNameRequired");
							return undefined;
						}}
						onChange={setModelDraft}
						onSubmit={(model) => {
							// Skipped: the model list comes from the API, so there is nothing to persist.
							if (!model.trim()) {
								finishWithModels([]);
								return;
							}
							setActiveField("context");
						}}
						onCancel={() => {
							setActiveField("key");
						}}
					/>
				</Box>
			)}
			{template?.promptModel && modelId && (
				<Box marginTop={1} flexDirection="column">
					<TextPrompt
						label={t("addFlow.contextLabel")}
						focus={activeField === "context"}
						validate={(val) => validateContextWindow(val, t)}
						onSubmit={(val) => {
							const tokens = parseContextWindow(val);
							finishWithModels(
								[modelId],
								tokens ? { [modelId.toLowerCase()]: { context: tokens } } : undefined,
							);
						}}
						onCancel={() => {
							setActiveField("model");
						}}
					/>
					{activeField === "context" && ignoresContextWindow(modelId) && (
						<StatusMessage variant="warning">{t("addFlow.contextClaudeWarning")}</StatusMessage>
					)}
				</Box>
			)}
		</AppShell>
	);
}
