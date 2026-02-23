import { Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import React from "react";
import { useTranslation } from "../../i18n/context.tsx";
import { AppShell } from "../layout/AppShell.tsx";

interface LanguageSelectorProps {
	onSelect: (locale: string) => void;
	onCancel?: () => void;
}

const LANGUAGE_ITEMS = [
	{ label: "English", value: "en" },
	{ label: "Portugu\u00eas (Brasil)", value: "pt-BR" },
	{ label: "Español", value: "es" },
];

export function LanguageSelector({ onSelect, onCancel }: LanguageSelectorProps) {
	const { t } = useTranslation();

	useInput((_input, key) => {
		if (key.escape && onCancel) {
			onCancel();
		}
	});

	const footerItems = [
		{ key: "↑↓", label: t("footer.navigate") },
		{ key: "⏎", label: t("footer.select") },
		...(onCancel ? [{ key: "esc", label: t("footer.back") }] : []),
	];

	return (
		<AppShell footerItems={footerItems}>
			<Text bold color="cyan">
				Select language / Selecione o idioma
			</Text>
			<SelectInput items={LANGUAGE_ITEMS} onSelect={(item) => onSelect(item.value)} />
		</AppShell>
	);
}
