import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import React from "react";
import { useTranslation } from "../../i18n/context.tsx";

interface ConfirmPromptProps {
	message: string;
	onConfirm: (confirmed: boolean) => void;
}

export function ConfirmPrompt({ message, onConfirm }: ConfirmPromptProps) {
	const { t } = useTranslation();

	useInput((_input, key) => {
		if (key.escape) {
			onConfirm(false);
		}
	});

	const items = [
		{ label: t("common.yes"), value: "yes" },
		{ label: t("common.no"), value: "no" },
	];

	return (
		<Box flexDirection="column">
			<Text bold color="cyan">
				{message}
			</Text>
			<SelectInput items={items} onSelect={(item) => onConfirm(item.value === "yes")} />
		</Box>
	);
}
