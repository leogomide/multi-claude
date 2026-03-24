import { Spinner } from "@inkjs/ui";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import React, { useEffect, useMemo, useState } from "react";
import {
	getInstallationPath,
	isAccountAuthenticated,
	isOAuthTokenValid,
	loadConfig,
	readOAuthCredentials,
	saveConfig,
} from "../../config.ts";
import { useTerminalSize } from "../../hooks/useTerminalSize.ts";
import { useTranslation } from "../../i18n/context.tsx";
import type { ModelWithSource } from "../../providers.ts";
import { getEffectiveModelsWithSource, getProviderBaseUrl, getTemplate } from "../../providers.ts";
import type { ConfiguredProvider, Installation } from "../../schema.ts";
import { DEFAULT_INSTALLATION_ID, DEFAULT_LAUNCH_TEMPLATE_ID } from "../../schema.ts";
import type { ApiModelError } from "../../services/api-models.ts";
import { fetchApiModels, hasApiModelFetching } from "../../services/api-models.ts";
import type { ChecklistItem, ChecklistResult } from "../common/ChecklistSelect.tsx";
import { ChecklistSelect } from "../common/ChecklistSelect.tsx";
import { StatusMessage } from "../common/StatusMessage.tsx";
import { AppShell } from "../layout/AppShell.tsx";
import type { SidebarItem } from "../layout/Sidebar.tsx";
import { Sidebar } from "../layout/Sidebar.tsx";

const STRATEGIC_FLAGS = new Set([
	"--resume",
	"-r",
	"--dangerously-skip-permissions",
	"--enable-auto-mode",
	"--verbose",
	"--worktree",
	"-w",
]);

function parsePreCheckedFlags(args: string[]): Set<string> {
	const checked = new Set<string>();
	for (const arg of args) {
		if (arg === "-r") checked.add("--resume");
		else if (arg === "-w") checked.add("--worktree");
		else if (STRATEGIC_FLAGS.has(arg)) checked.add(arg);
	}
	return checked;
}

type Step =
	| "loading-models"
	| "select-model"
	| "select-installation"
	| "select-options"
	| "no-models"
	| "error"
	| "auth-expired";

interface StartClaudeFlowProps {
	providerId: string | null;
	cliArgs?: string[];
	onComplete: (result: {
		provider: ConfiguredProvider;
		model: string;
		installationId: string;
		selectedFlags: string[];
		selectedEnvVars?: Record<string, string>;
	}) => void;
	onOAuthLogin: (result: { providerId: string; providerName: string; isNew: boolean }) => void;
	onCancel: () => void;
}

function formatContextLength(tokens: number): string {
	if (tokens >= 1_000_000) {
		const m = tokens / 1_000_000;
		return `${Number.isInteger(m) ? m : m.toFixed(1)}M`;
	}
	const k = tokens / 1_000;
	return `${Number.isInteger(k) ? k : k.toFixed(0)}K`;
}

function formatPricePerMillion(pricePerToken: string): string {
	const perM = parseFloat(pricePerToken) * 1_000_000;
	return Number.isNaN(perM) ? "\u2014" : `$${perM.toFixed(2)}`;
}

function formatFileSize(bytes: number): string {
	if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
	if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
	if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
	return `${bytes} B`;
}

export function StartClaudeFlow({
	providerId,
	cliArgs = [],
	onComplete,
	onOAuthLogin,
	onCancel,
}: StartClaudeFlowProps) {
	const { t } = useTranslation();
	const [step, setStep] = useState<Step>("loading-models");
	const [selectedProvider, setSelectedProvider] = useState<ConfiguredProvider | null>(null);
	const [modelItems, setModelItems] = useState<ModelWithSource[]>([]);
	const [activeIndex, setActiveIndex] = useState(0);
	const [query, setQuery] = useState("");
	const [fetchError, setFetchError] = useState<ApiModelError | null>(null);
	const [installations, setInstallations] = useState<Installation[]>([]);
	const [selectedModel, setSelectedModel] = useState<string>("");
	const [installationActiveIndex, setInstallationActiveIndex] = useState(0);
	const [selectedInstallationIdForFlags, setSelectedInstallationIdForFlags] = useState<string>("");
	const [highlightedFlag, setHighlightedFlag] = useState<ChecklistItem | null>(null);
	const [savedFlags, setSavedFlags] = useState<string[]>([]);
	const [savedEnvVars, setSavedEnvVars] = useState<string[]>([]);
	const preCheckedFlags = useMemo(() => {
		const fromCli = parsePreCheckedFlags(cliArgs);
		// Merge with saved flags from config (CLI args take priority)
		for (const flag of savedFlags) {
			fromCli.add(flag);
		}
		return fromCli;
	}, [cliArgs, savedFlags]);
	const preCheckedEnvVars = useMemo(() => new Set(savedEnvVars), [savedEnvVars]);

	const goToFlagsStep = (provider: ConfiguredProvider, model: string, installationId: string) => {
		setSelectedProvider(provider);
		setSelectedModel(model);
		setSelectedInstallationIdForFlags(installationId);
		setStep("select-options");
	};

	useEffect(() => {
		loadConfig().then((config) => {
			setInstallations(config.installations);
			if (config.lastFlags) {
				setSavedFlags(config.lastFlags);
			}
			if (config.lastEnvVars) {
				setSavedEnvVars(config.lastEnvVars);
			}

			if (providerId === null) {
				// Default launch: create virtual provider, skip model selection
				const virtualProvider: ConfiguredProvider = {
					id: "__default__",
					name: t("mainMenu.defaultLaunch"),
					templateId: DEFAULT_LAUNCH_TEMPLATE_ID,
					type: "api",
					apiKey: "",
					apiKeyValid: true,
					models: [],
				};
				setSelectedProvider(virtualProvider);
				setSelectedModel("");
				// Always use DEFAULT_INSTALLATION_ID — custom installations override
				// CLAUDE_CONFIG_DIR, which breaks auth for default launch (no explicit
				// auth env vars; relies on stored credentials in ~/.claude/)
				goToFlagsStep(virtualProvider, "", DEFAULT_INSTALLATION_ID);
				return;
			}

			const provider = config.providers.find((p) => p.id === providerId);
			if (!provider) {
				onCancel();
				return;
			}
			setSelectedProvider(provider);

			if (provider.type === "oauth") {
				if (!isAccountAuthenticated(provider.id)) {
					setStep("auth-expired");
					return;
				}
				const creds = readOAuthCredentials(provider.id);
				if (!creds || !isOAuthTokenValid(creds)) {
					// Token expired or unreadable \u2014 trigger re-authentication
					setStep("auth-expired");
					return;
				}
				// OAuth: skip model selection, go to flags step
				// Anthropic must use a custom installation (not Default)
				setSelectedModel("");
				if (config.installations.length === 1) {
					// Single custom installation: auto-select, go to flags
					goToFlagsStep(provider, "", config.installations[0]!.dirName);
				} else if (config.installations.length === 0) {
					// No installations \u2014 go to flags with default
					goToFlagsStep(provider, "", DEFAULT_INSTALLATION_ID);
				} else {
					setStep("select-installation");
				}
				return;
			}

			loadModelsForProvider(provider);
		});
	}, [providerId]);

	const loadModelsForProvider = async (provider: ConfiguredProvider) => {
		if (hasApiModelFetching(provider.templateId)) {
			setStep("loading-models");
			const result = await fetchApiModels(
				provider.templateId,
				provider.apiKey,
				getProviderBaseUrl(provider),
			);

			if (!result.ok) {
				setFetchError(result.error);
				setStep("error");
				return;
			}

			const apiModels = result.models;
			const effective = getEffectiveModelsWithSource(provider);
			const effectiveNames = new Set(effective.map((m) => m.name));
			const apiOnly = apiModels
				.filter((meta) => !effectiveNames.has(meta.id))
				.map((meta): ModelWithSource => ({ name: meta.id, source: "api", meta }));
			const all = [...effective, ...apiOnly];

			if (all.length === 0) {
				setStep("no-models");
			} else {
				setModelItems(all);
				setStep("select-model");
			}
		} else {
			const effective = getEffectiveModelsWithSource(provider);
			if (effective.length === 0) {
				setStep("no-models");
			} else {
				setModelItems(effective);
				setStep("select-model");
			}
		}
	};

	const { rows } = useTerminalSize();
	const searchable = modelItems.length > 10;

	const filteredItems = useMemo(() => {
		const sorted = [...modelItems].sort((a, b) => {
			const nameA = (a.meta?.name ?? a.name).toLowerCase();
			const nameB = (b.meta?.name ?? b.name).toLowerCase();
			return nameA.localeCompare(nameB);
		});
		if (!query.trim()) return sorted;
		const lower = query.toLowerCase();
		return sorted.filter(
			(item) =>
				item.name.toLowerCase().includes(lower) ||
				(item.meta?.name ?? "").toLowerCase().includes(lower),
		);
	}, [modelItems, query]);

	// header(5) + footer(3) + status(1) + title(1) + scroll indicators(2) + search(1 if searchable)
	const fixedOverhead = 12 + (searchable ? 1 : 0);
	const visibleLimit = Math.max(3, rows - fixedOverhead);
	const scrollOffset = useMemo(() => {
		if (filteredItems.length <= visibleLimit) return 0;
		const half = Math.floor(visibleLimit / 2);
		if (activeIndex <= half) return 0;
		if (activeIndex >= filteredItems.length - half)
			return Math.max(0, filteredItems.length - visibleLimit);
		return activeIndex - half;
	}, [activeIndex, filteredItems.length]);
	const visibleItems =
		filteredItems.length <= visibleLimit
			? filteredItems
			: filteredItems.slice(scrollOffset, scrollOffset + visibleLimit);

	const goToInstallationOrComplete = (provider: ConfiguredProvider, model: string) => {
		const isOAuth = provider.type === "oauth";
		if (!isOAuth && installations.length === 0) {
			// Non-Anthropic, no custom installations: auto-select Default, go to flags
			goToFlagsStep(provider, model, DEFAULT_INSTALLATION_ID);
		} else {
			setSelectedModel(model);
			setInstallationActiveIndex(0);
			setStep("select-installation");
		}
	};

	const installationListItems = useMemo(() => {
		if (!selectedProvider) return [];
		const isOAuth = selectedProvider.type === "oauth";
		const items: { id: string; name: string; path: string }[] = [];
		if (!isOAuth) {
			items.push({
				id: DEFAULT_INSTALLATION_ID,
				name: t("installations.defaultName"),
				path: "~/.claude/",
			});
		}
		for (const inst of installations) {
			items.push({ id: inst.dirName, name: inst.name, path: getInstallationPath(inst.dirName) });
		}
		return items;
	}, [selectedProvider, installations, t]);

	const optionGroups = useMemo(() => {
		return [
			{
				label: t("launchOptions.groupPermissions"),
				items: [
					{
						label: t("launchOptions.autoMode"),
						value: "--enable-auto-mode",
						description: t("launchOptions.descAutoMode"),
						checked: preCheckedFlags.has("--enable-auto-mode"),
					},
					{
						label: t("launchOptions.skipPermissions"),
						value: "--dangerously-skip-permissions",
						description: t("launchOptions.descSkipPermissions"),
						checked: preCheckedFlags.has("--dangerously-skip-permissions"),
					},
				],
			},
			{
				label: t("launchOptions.groupSession"),
				items: [
					{
						label: t("launchOptions.resume"),
						value: "--resume",
						description: t("launchOptions.descResume"),
						checked: preCheckedFlags.has("--resume"),
					},
				],
			},
			{
				label: t("launchOptions.groupDevelopment"),
				items: [
					{
						label: t("launchOptions.verbose"),
						value: "--verbose",
						description: t("launchOptions.descVerbose"),
						checked: preCheckedFlags.has("--verbose"),
					},
					{
						label: t("launchOptions.worktree"),
						value: "--worktree",
						description: t("launchOptions.descWorktree"),
						checked: preCheckedFlags.has("--worktree"),
						acceptsValue: true,
						valuePlaceholder: t("launchOptions.worktreePlaceholder"),
					},
				],
			},
			{
				label: t("launchOptions.groupExperimental"),
				items: [
					{
						label: t("launchOptions.agentTeams"),
						value: "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS",
						description: t("launchOptions.descAgentTeams"),
						checked: preCheckedEnvVars.has("CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS"),
						isEnvVar: true,
						envVarValue: "1",
					},
				],
			},
		];
	}, [t, preCheckedFlags, preCheckedEnvVars]);

	const handleOptionsConfirm = (selected: ChecklistResult[]) => {
		if (!selectedProvider) return;
		const flags: string[] = [];
		const envVars: Record<string, string> = {};
		for (const s of selected) {
			if (s.isEnvVar) {
				envVars[s.flag] = s.envVarValue ?? "1";
			} else {
				flags.push(s.flag);
				if (s.value) {
					flags.push(s.value);
				}
			}
		}
		onComplete({
			provider: selectedProvider,
			model: selectedModel,
			installationId: selectedInstallationIdForFlags,
			selectedFlags: flags,
			selectedEnvVars: Object.keys(envVars).length > 0 ? envVars : undefined,
		});
	};

	useInput((input, key) => {
		if (step === "select-options") return; // ChecklistSelect handles its own input

		if (key.escape) {
			if (step === "select-installation") {
				// Go back: for OAuth/default cancel, for API go back to model selection
				if (
					selectedProvider?.type === "oauth" ||
					selectedProvider?.templateId === DEFAULT_LAUNCH_TEMPLATE_ID
				) {
					onCancel();
				} else {
					setStep("select-model");
				}
				return;
			}
			onCancel();
			return;
		}
		if (step === "auth-expired" && key.return && selectedProvider) {
			onOAuthLogin({
				providerId: selectedProvider.id,
				providerName: selectedProvider.name,
				isNew: false,
			});
			return;
		}
		if (step === "select-installation") {
			if (key.upArrow) {
				setInstallationActiveIndex((prev) => Math.max(0, prev - 1));
			} else if (key.downArrow) {
				setInstallationActiveIndex((prev) => Math.min(installationListItems.length - 1, prev + 1));
			} else if (key.return && selectedProvider) {
				const item = installationListItems[installationActiveIndex];
				if (item) {
					goToFlagsStep(selectedProvider, selectedModel, item.id);
				}
			}
			return;
		}
		if (key.upArrow) {
			setActiveIndex((prev) => Math.max(0, prev - 1));
		} else if (key.downArrow) {
			setActiveIndex((prev) => Math.min(filteredItems.length - 1, prev + 1));
		} else if (key.return) {
			const item = filteredItems[activeIndex];
			if (item && selectedProvider) {
				goToInstallationOrComplete(selectedProvider, item.name);
			}
		}
	});

	// Reset index when search query changes
	useEffect(() => {
		setActiveIndex(0);
	}, [query]);

	const highlightedItem = filteredItems[activeIndex];

	const providerLabel = useMemo(() => {
		if (!selectedProvider) return "";
		const tmpl = getTemplate(selectedProvider.templateId);
		return tmpl?.description ?? selectedProvider.templateId;
	}, [selectedProvider]);

	const sidebarContent = useMemo(() => {
		if (!highlightedItem) return null;
		const sourceLabel =
			highlightedItem.source === "default"
				? t("sidebar.sourceDefault")
				: highlightedItem.source === "api"
					? "API"
					: t("sidebar.sourceUser");

		const meta = highlightedItem.meta;

		if (meta) {
			const items: SidebarItem[] = [
				{ label: t("sidebar.name"), value: meta.name ?? highlightedItem.name },
				...(meta.context_length !== undefined
					? [
							{
								label: t("sidebar.context"),
								value: `${formatContextLength(meta.context_length)} tokens`,
							},
						]
					: []),
				...(meta.max_output_tokens != null
					? [
							{
								label: t("sidebar.maxOutput"),
								value: `${meta.max_output_tokens.toLocaleString()} tokens`,
							},
						]
					: []),
				...(meta.pricing
					? [
							{
								label: t("sidebar.inPrice"),
								value: `${formatPricePerMillion(meta.pricing.prompt)} /M tokens`,
							},
							{
								label: t("sidebar.outPrice"),
								value: `${formatPricePerMillion(meta.pricing.completion)} /M tokens`,
							},
						]
					: []),
				...(meta.input_modalities && meta.input_modalities.length > 0
					? [{ label: t("sidebar.modalities"), value: meta.input_modalities.join(", ") }]
					: []),
				...(meta.supported_parameters
					? [
							{
								label: t("sidebar.tools"),
								value: meta.supported_parameters.includes("tools")
									? t("common.yes")
									: t("common.no"),
							},
							{
								label: t("sidebar.reasoning"),
								value: meta.supported_parameters.includes("reasoning")
									? t("common.yes")
									: t("common.no"),
							},
						]
					: []),
				...(meta.is_moderated === true
					? [{ label: t("sidebar.moderated"), value: t("common.yes"), color: "yellow" as const }]
					: []),
				...(meta.parameter_size
					? [{ label: t("sidebar.params"), value: meta.parameter_size }]
					: []),
				...(meta.quantization
					? [{ label: t("sidebar.quantization"), value: meta.quantization }]
					: []),
				...(meta.architecture
					? [{ label: t("sidebar.architecture"), value: meta.architecture }]
					: []),
				...(meta.file_size != null
					? [{ label: t("sidebar.fileSize"), value: formatFileSize(meta.file_size) }]
					: []),
				{ label: t("sidebar.source"), value: sourceLabel },
			];
			return <Sidebar title={t("sidebar.modelInfo")} items={items} />;
		}

		const items: SidebarItem[] = [
			{ label: t("sidebar.name"), value: highlightedItem.name },
			{ label: t("sidebar.source"), value: sourceLabel },
		];
		return <Sidebar title={t("sidebar.modelInfo")} items={items} />;
	}, [highlightedItem, t]);

	const optionSidebar = useMemo(() => {
		if (!highlightedFlag) return null;
		const isEnv = highlightedFlag.isEnvVar;
		const items: SidebarItem[] = [
			{ label: isEnv ? t("sidebar.envVar") : t("sidebar.flag"), value: highlightedFlag.value },
			{ label: t("sidebar.name"), value: highlightedFlag.description },
		];
		return (
			<Sidebar title={isEnv ? t("sidebar.envVarInfo") : t("sidebar.flagInfo")} items={items} />
		);
	}, [highlightedFlag, t]);

	const footerItems = [
		{ key: "\u2191\u2193", label: t("footer.navigate") },
		{ key: "\u23CE", label: t("footer.select") },
		{ key: "esc", label: t("footer.back") },
		...(searchable ? [{ key: "/", label: t("footer.search") }] : []),
	];

	if (step === "loading-models") {
		return (
			<AppShell footerItems={footerItems}>
				<Box>
					<Spinner label={t("apiModels.fetching", { provider: providerLabel })} />
				</Box>
			</AppShell>
		);
	}

	if (step === "no-models") {
		return (
			<AppShell footerItems={[{ key: "esc", label: t("footer.back") }]}>
				<StatusMessage variant="error">{t("selector.noModels")}</StatusMessage>
			</AppShell>
		);
	}

	if (step === "error") {
		const errorMessage =
			fetchError === "auth"
				? t("apiModels.authError", { provider: providerLabel })
				: fetchError === "network"
					? t("apiModels.networkError", { provider: providerLabel })
					: t("apiModels.fetchError", { provider: providerLabel });

		return (
			<AppShell footerItems={[{ key: "esc", label: t("footer.back") }]}>
				<StatusMessage variant="error">{errorMessage}</StatusMessage>
			</AppShell>
		);
	}

	if (step === "auth-expired" && selectedProvider) {
		return (
			<AppShell
				footerItems={[
					{ key: "\u23CE", label: t("anthropic.reAuthenticate") },
					{ key: "esc", label: t("footer.back") },
				]}
			>
				<StatusMessage variant="warning">{t("anthropic.authExpired")}</StatusMessage>
			</AppShell>
		);
	}

	if (step === "select-options" && selectedProvider) {
		const optionsFooter = [
			{ key: "\u2191\u2193", label: t("footer.navigate") },
			{ key: "space", label: t("footer.toggle") },
			{ key: "\u23CE", label: t("footer.launch") },
			{ key: "esc", label: t("footer.back") },
		];

		return (
			<AppShell sidebar={optionSidebar} footerItems={optionsFooter}>
				<StatusMessage variant="info">
					{t("selector.providerLabel")}: {selectedProvider.name}
					{selectedModel ? ` | ${selectedModel}` : ""}
				</StatusMessage>
				<Text bold color="cyan">
					{t("launchOptions.title")}
				</Text>
				<ChecklistSelect
					groups={optionGroups}
					onConfirm={handleOptionsConfirm}
					onHighlight={setHighlightedFlag}
					onEscape={() => {
						// Go back to installation selection if there are installations to choose from,
						// otherwise go back to model selection (or cancel for OAuth/default)
						if (installationListItems.length > 1) {
							setStep("select-installation");
						} else if (
							selectedProvider.type === "oauth" ||
							selectedProvider.templateId === DEFAULT_LAUNCH_TEMPLATE_ID
						) {
							onCancel();
						} else {
							setStep("select-model");
						}
					}}
				/>
			</AppShell>
		);
	}

	if (step === "select-installation" && selectedProvider) {
		const highlightedInstallation = installationListItems[installationActiveIndex];
		const installationSidebar = highlightedInstallation ? (
			<Sidebar
				title={t("sidebar.installationInfo")}
				items={[
					{ label: t("sidebar.name"), value: highlightedInstallation.name },
					{ label: t("sidebar.installationPath"), value: highlightedInstallation.path },
				]}
			/>
		) : null;

		const installationFooter = [
			{ key: "\u2191\u2193", label: t("footer.navigate") },
			{ key: "\u23CE", label: t("footer.select") },
			{ key: "esc", label: t("footer.back") },
		];

		return (
			<AppShell sidebar={installationSidebar} footerItems={installationFooter}>
				<StatusMessage variant="info">
					{t("selector.providerLabel")}: {selectedProvider.name}
				</StatusMessage>
				<Text bold color="cyan">
					{t("installations.selectInstallation")}
				</Text>
				<Box flexDirection="column">
					{installationListItems.map((item, idx) => {
						const isActive = idx === installationActiveIndex;
						return (
							<Box key={item.id} flexDirection="row">
								<Text bold={isActive} color={isActive ? "cyan" : undefined}>
									{isActive ? "\u276F " : "  "}
									{item.name}
								</Text>
							</Box>
						);
					})}
				</Box>
			</AppShell>
		);
	}

	if (step === "select-model" && selectedProvider) {
		return (
			<AppShell sidebar={sidebarContent} footerItems={footerItems}>
				<StatusMessage variant="info">
					{t("selector.providerLabel")}: {selectedProvider.name}
				</StatusMessage>
				<Text bold color="cyan">
					{t("selector.selectModel")}
				</Text>
				{searchable && (
					<Box>
						<Text color="green">{"> "}</Text>
						<TextInput
							value={query}
							onChange={setQuery}
							placeholder={t("searchSelect.placeholder")}
						/>
						<Text color="gray" dimColor>
							{" "}
							({filteredItems.length}/{modelItems.length})
						</Text>
					</Box>
				)}
				<Box flexDirection="column">
					{scrollOffset > 0 && <Text dimColor> \u2191 ...</Text>}
					{visibleItems.map((item) => {
						const globalIdx = filteredItems.indexOf(item);
						const isActive = globalIdx === activeIndex;
						return (
							<Box key={item.name} flexDirection="row">
								<Text bold={isActive} color={isActive ? "cyan" : undefined}>
									{isActive ? "\u276F " : "  "}
									{item.meta?.name ?? item.name}
								</Text>
								{item.meta?.context_length !== undefined && (
									<Text dimColor>
										{"  "}
										{formatContextLength(item.meta.context_length)} ctx
									</Text>
								)}
								{item.meta?.pricing && (
									<Text dimColor>
										{"  "}
										{formatPricePerMillion(item.meta.pricing.prompt)}/
										{formatPricePerMillion(item.meta.pricing.completion)}
									</Text>
								)}
							</Box>
						);
					})}
					{scrollOffset + visibleLimit < filteredItems.length && <Text dimColor> \u2193 ...</Text>}
				</Box>
			</AppShell>
		);
	}

	return null;
}
