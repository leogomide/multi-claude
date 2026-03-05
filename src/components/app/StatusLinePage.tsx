import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import React, { useEffect, useState } from "react";
import { loadConfig, saveConfig } from "../../config.ts";
import { useTerminalSize } from "../../hooks/useTerminalSize.ts";
import { useTranslation } from "../../i18n/context.tsx";
import { STATUSLINE_TEMPLATES, type StatusLineTemplateId } from "../../statusline.ts";
import { AppShell } from "../layout/AppShell.tsx";
import type { FlowMessage } from "../types.ts";

interface StatusLinePageProps {
	onDone: (message?: FlowMessage) => void;
	onCancel: () => void;
}

function useTemplateStrings() {
	const { t } = useTranslation();
	return {
		name: (id: StatusLineTemplateId): string => {
			return t(`statusLine.${id}`) as string;
		},
		desc: (id: StatusLineTemplateId): string => {
			return t(`statusLine.${id}Desc`) as string;
		},
	};
}

export function StatusLinePage({ onDone, onCancel }: StatusLinePageProps) {
	const { t } = useTranslation();
	const { rows } = useTerminalSize();
	const ts = useTemplateStrings();
	const [currentTemplate, setCurrentTemplate] = useState<string>("none");
	const [highlightedId, setHighlightedId] = useState<StatusLineTemplateId>("none");

	useEffect(() => {
		loadConfig().then((config) => {
			const tmpl = (config.statusLine?.template ?? "none") as StatusLineTemplateId;
			setCurrentTemplate(tmpl);
			setHighlightedId(tmpl);
		});
	}, []);

	useInput((_input, key) => {
		if (key.escape) {
			onCancel();
		}
	});

	const items = STATUSLINE_TEMPLATES.map((tmpl) => {
		const current = tmpl.id === currentTemplate ? " *" : "";
		return {
			label: `${ts.name(tmpl.id)}${current}`,
			value: tmpl.id as string,
		};
	});

	const highlighted = STATUSLINE_TEMPLATES.find((tmpl) => tmpl.id === highlightedId);

	const handleSelect = (item: { value: string }) => {
		loadConfig().then((config) => {
			config.statusLine = { template: item.value };
			saveConfig(config).then(() => {
				const name = ts.name(item.value as StatusLineTemplateId);
				onDone({ text: t("statusLine.changed", { template: name }), variant: "success" });
			});
		});
	};

	const footerItems = [
		{ key: "\u2191\u2193", label: t("footer.navigate") as string },
		{ key: "\u23CE", label: t("footer.select") as string },
		{ key: "esc", label: t("footer.back") as string },
	];

	const sidebarContent = highlighted ? (
		<Box flexDirection="column">
			<Text bold>{ts.name(highlighted.id)}</Text>
			<Text dimColor>{ts.desc(highlighted.id)}</Text>
			{highlighted.preview && (
				<>
					<Text> </Text>
					<Text dimColor>Preview:</Text>
					<Box borderStyle="single" paddingX={1}>
						<Text>{highlighted.preview}</Text>
					</Box>
				</>
			)}
		</Box>
	) : undefined;

	return (
		<AppShell footerItems={footerItems} sidebar={sidebarContent}>
			<Text bold color="cyan">
				{t("statusLine.selectTemplate")}
			</Text>
			<SelectInput
				items={items}
				onSelect={handleSelect}
				onHighlight={(item) => setHighlightedId(item.value as StatusLineTemplateId)}
				limit={Math.max(3, rows - 9)}
			/>
		</AppShell>
	);
}
