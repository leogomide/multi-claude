import { execSync } from "node:child_process";
import { useApp } from "ink";
import React, { useCallback, useState } from "react";
import { CONFIG_DIR, loadConfig, saveConfig } from "../../config.ts";
import { BreadcrumbProvider, useBreadcrumb } from "../../hooks/useBreadcrumb.tsx";
import { useTranslation } from "../../i18n/context.tsx";
import { initLocale } from "../../i18n/index.ts";
import type { ConfiguredProvider } from "../../schema.ts";
import { LanguageSelector } from "../common/LanguageSelector.tsx";
import { AddInstallationFlow } from "../config-wizard/AddInstallationFlow.tsx";
import { AddProviderFlow } from "../config-wizard/AddProviderFlow.tsx";
import { EditInstallationFlow } from "../config-wizard/EditInstallationFlow.tsx";
import { EditProviderFlow } from "../config-wizard/EditProviderFlow.tsx";
import { ManageModelsFlow } from "../config-wizard/ManageModelsFlow.tsx";
import type { FlowMessage } from "../types.ts";
import type { ManageInstallationsResult } from "./ManageInstallationsPage.tsx";
import { ManageInstallationsPage } from "./ManageInstallationsPage.tsx";
import type { MainMenuResult } from "./MainMenu.tsx";
import { MainMenu } from "./MainMenu.tsx";
import type { ManageProvidersResult } from "./ManageProvidersPage.tsx";
import { ManageProvidersPage } from "./ManageProvidersPage.tsx";
import type { SettingsAction } from "./SettingsPage.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import { StartClaudeFlow } from "./StartClaudeFlow.tsx";

type AppView =
	| "main-menu"
	| "select-model"
	| "manage-providers"
	| "edit-provider"
	| "manage-models"
	| "add-provider"
	| "manage-installations"
	| "add-installation"
	| "edit-installation"
	| "settings"
	| "change-language";

interface UnifiedAppProps {
	onStartClaude: (result: { provider: ConfiguredProvider; model: string; installationId: string }) => void;
	onOAuthLogin: (result: { providerId: string; providerName: string; isNew: boolean }) => void;
}

export function UnifiedApp({ onStartClaude, onOAuthLogin }: UnifiedAppProps) {
	return (
		<BreadcrumbProvider>
			<UnifiedAppInner onStartClaude={onStartClaude} onOAuthLogin={onOAuthLogin} />
		</BreadcrumbProvider>
	);
}

function UnifiedAppInner({ onStartClaude, onOAuthLogin }: UnifiedAppProps) {
	const { exit } = useApp();
	const { t } = useTranslation();
	const { setCrumbs } = useBreadcrumb();
	const [view, setView] = useState<AppView>("main-menu");
	const [flowKey, setFlowKey] = useState(0);
	const [lastMessage, setLastMessage] = useState<FlowMessage | null>(null);
	const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
	const [selectedProviderForEdit, setSelectedProviderForEdit] = useState<string | null>(null);
	const [selectedInstallationId, setSelectedInstallationId] = useState<string | null>(null);

	const goTo = useCallback(
		(nextView: AppView, crumbs: string[] = [], message?: FlowMessage) => {
			setLastMessage(message ?? null);
			setCrumbs(crumbs);
			setFlowKey((k) => k + 1);
			setView(nextView);
		},
		[setCrumbs],
	);

	const backToMenu = useCallback(
		(message?: FlowMessage) => {
			goTo("main-menu", [], message);
		},
		[goTo],
	);

	const backToManageProviders = useCallback(
		(message?: FlowMessage) => {
			goTo("manage-providers", [t("manageProviders.title")], message);
		},
		[goTo, t],
	);

	const backToEditProvider = useCallback(
		(message?: FlowMessage) => {
			if (selectedProviderForEdit) {
				goTo("edit-provider", [t("manageProviders.title"), t("editProvider.title")], message);
			}
		},
		[goTo, t, selectedProviderForEdit],
	);

	const backToSettings = useCallback(
		(message?: FlowMessage) => {
			goTo("settings", [t("settings.title")], message);
		},
		[goTo, t],
	);

	const handleMainMenuSelect = useCallback(
		(result: MainMenuResult) => {
			switch (result.type) {
				case "launch-provider":
					setSelectedProviderId(result.providerId);
					goTo("select-model", [result.providerName]);
					break;
				case "manage-providers":
					goTo("manage-providers", [t("manageProviders.title")]);
					break;
				case "manage-installations":
					goTo("manage-installations", [t("installations.title")]);
					break;
				case "settings":
					goTo("settings", [t("settings.title")]);
					break;
				case "exit":
					exit();
					break;
			}
		},
		[exit, goTo, t],
	);

	const handleManageProvidersSelect = useCallback(
		(result: ManageProvidersResult) => {
			const mpCrumb = t("manageProviders.title");
			switch (result.type) {
				case "select-provider":
					setSelectedProviderForEdit(result.providerId);
					goTo("edit-provider", [mpCrumb, result.providerName]);
					break;
				case "add-provider":
					goTo("add-provider", [mpCrumb, t("manageProviders.addProvider")]);
					break;
				case "back":
					backToMenu();
					break;
			}
		},
		[goTo, t, backToMenu],
	);

	const backToManageInstallations = useCallback(
		(message?: FlowMessage) => {
			goTo("manage-installations", [t("installations.title")], message);
		},
		[goTo, t],
	);

	const handleManageInstallationsSelect = useCallback(
		(result: ManageInstallationsResult) => {
			const miCrumb = t("installations.title");
			switch (result.type) {
				case "select-installation":
					setSelectedInstallationId(result.installationId);
					goTo("edit-installation", [miCrumb, result.installationName]);
					break;
				case "add-installation":
					goTo("add-installation", [miCrumb, t("installations.addInstallation")]);
					break;
				case "back":
					backToMenu();
					break;
			}
		},
		[goTo, t, backToMenu],
	);

	const handleSettingsSelect = useCallback(
		(action: SettingsAction) => {
			const settingsCrumb = t("settings.title");
			switch (action) {
				case "open-folder": {
					try {
						const cmd = process.platform === "win32"
							? `explorer "${CONFIG_DIR}"`
							: process.platform === "darwin"
								? `open "${CONFIG_DIR}"`
								: `xdg-open "${CONFIG_DIR}"`;
						execSync(cmd, { stdio: "ignore" });
					} catch {
						// ignore — explorer may return non-zero even on success
					}
					backToSettings({ text: t("menu.openedConfigFolder"), variant: "success" });
					break;
				}
				case "language":
					goTo("change-language", [settingsCrumb, t("settings.changeLanguage")]);
					break;
				case "back":
					backToMenu();
					break;
			}
		},
		[goTo, t, backToSettings, backToMenu],
	);

	const handleLanguageSelect = useCallback(
		(locale: string) => {
			initLocale(locale);
			loadConfig().then((config) => {
				config.language = locale;
				saveConfig(config).then(() => {
					backToSettings({
						text: t("languageSelect.changed", { lang: locale }),
						variant: "success",
					});
				});
			});
		},
		[backToSettings, t],
	);

	return (
		<>
			{view === "main-menu" && (
				<MainMenu key={flowKey} onSelect={handleMainMenuSelect} onEscape={() => exit()} lastMessage={lastMessage} />
			)}

			{view === "select-model" && selectedProviderId && (
				<StartClaudeFlow
					key={flowKey}
					providerId={selectedProviderId}
					onComplete={onStartClaude}
					onOAuthLogin={onOAuthLogin}
					onCancel={() => backToMenu()}
				/>
			)}

			{view === "manage-providers" && (
				<ManageProvidersPage key={flowKey} onSelect={handleManageProvidersSelect} onEscape={() => backToMenu()} lastMessage={lastMessage} />
			)}

			{view === "settings" && (
				<SettingsPage key={flowKey} onSelect={handleSettingsSelect} lastMessage={lastMessage} />
			)}

			{view === "add-provider" && (
				<AddProviderFlow key={flowKey} onDone={backToManageProviders} onOAuthLogin={onOAuthLogin} onCancel={() => backToManageProviders()} />
			)}

			{view === "manage-installations" && (
				<ManageInstallationsPage key={flowKey} onSelect={handleManageInstallationsSelect} onEscape={() => backToMenu()} lastMessage={lastMessage} />
			)}

			{view === "add-installation" && (
				<AddInstallationFlow key={flowKey} onDone={backToManageInstallations} onCancel={() => backToManageInstallations()} />
			)}

			{view === "edit-installation" && selectedInstallationId && (
				<EditInstallationFlow
					key={flowKey}
					installationId={selectedInstallationId}
					onDone={backToManageInstallations}
					onCancel={() => backToManageInstallations()}
				/>
			)}

			{view === "edit-provider" && selectedProviderForEdit && (
				<EditProviderFlow
					key={flowKey}
					providerId={selectedProviderForEdit}
					onDone={backToManageProviders}
					onManageModels={() => {
						goTo("manage-models", [t("manageProviders.title"), t("editProvider.title"), t("editProvider.manageModels")]);
					}}
					onOAuthLogin={onOAuthLogin}
					onCancel={() => backToManageProviders()}
				/>
			)}

			{view === "manage-models" && selectedProviderForEdit && (
				<ManageModelsFlow
					key={flowKey}
					providerId={selectedProviderForEdit}
					onDone={() => backToEditProvider()}
					onCancel={() => backToEditProvider()}
				/>
			)}

			{view === "change-language" && (
				<LanguageSelector key={flowKey} onSelect={handleLanguageSelect} onCancel={() => backToSettings()} />
			)}
		</>
	);
}
