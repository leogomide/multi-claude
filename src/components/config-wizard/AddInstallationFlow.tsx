import React from "react";
import { computeDirName, ensureInstallationDir, generateShortId, loadConfig, saveConfig } from "../../config.ts";
import { useTranslation } from "../../i18n/context.tsx";
import { TextPrompt } from "../common/TextPrompt.tsx";
import { AppShell } from "../layout/AppShell.tsx";
import type { FlowMessage } from "../types.ts";

interface AddInstallationFlowProps {
	onDone: (message?: FlowMessage) => void;
	onCancel: () => void;
}

export function AddInstallationFlow({ onDone, onCancel }: AddInstallationFlowProps) {
	const { t } = useTranslation();

	const footerItems = [
		{ key: "⏎", label: t("footer.confirm") },
		{ key: "esc", label: t("footer.back") },
	];

	return (
		<AppShell footerItems={footerItems}>
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
								onDone({ text: t("installations.added", { name: installationName }), variant: "success" });
							});
						});
					});
				}}
				onCancel={onCancel}
			/>
		</AppShell>
	);
}
