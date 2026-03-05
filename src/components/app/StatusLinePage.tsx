import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import React, { useEffect, useState } from "react";
import { loadConfig, saveConfig } from "../../config.ts";
import { useTerminalSize } from "../../hooks/useTerminalSize.ts";
import { useTranslation } from "../../i18n/context.tsx";
import { STATUSLINE_TEMPLATES, type StatusLineTemplateId } from "../../statusline.ts";
import { AppShell } from "../layout/AppShell.tsx";
import type { FlowMessage } from "../types.ts";

const Sep = () => <Text dimColor>{" | "}</Text>;
const BAR_USED = "\u2593".repeat(23);
const BAR_FREE = "\u2591".repeat(7);

function StatusLinePreview({ id }: { id: StatusLineTemplateId }) {
	if (id === "none") return null;

	const line1 = (
		<Text>
			<Text color="cyan">Provider</Text>/Model{"  "}
			<Text color="yellow">{BAR_USED + BAR_FREE} 153.9k/77%</Text>
			<Sep />
			<Text color="yellow">46.1k/23% left</Text>
		</Text>
	);

	if (id === "full") {
		return (
			<Box flexDirection="column">
				{line1}
				<Text>
					<Text color="cyan">In:84.2k</Text><Sep />
					<Text color="yellow">Out:62.8k</Text><Sep />
					<Text color="blueBright">I/O 1.3:1</Text><Sep />
					<Text color="green">Cache:20.6M</Text>
					<Text dimColor>{" ("}</Text><Text color="green">71% hit</Text><Text dimColor>{")"}</Text><Sep />
					<Text color="cyan">$0.19/min</Text><Sep />
					<Text bold color="green">Cost:$11.15</Text>
				</Text>
				<Text>
					<Text color="white">Session:3h31m</Text><Sep />
					<Text color="cyan">API:1h38m</Text><Sep />
					<Text color="magenta">master</Text><Sep />
					<Text color="green">+45</Text>{" "}<Text color="red">-7</Text>
				</Text>
			</Box>
		);
	}

	if (id === "slim") {
		return (
			<Box flexDirection="column">
				{line1}
				<Text>
					<Text color="cyan">In:84.2k</Text>{" "}
					<Text color="yellow">Out:62.8k</Text><Sep />
					<Text bold color="green">$11.15</Text><Sep />
					<Text color="white">3h31m</Text><Sep />
					<Text color="magenta">master</Text><Sep />
					<Text color="green">+45</Text>{" "}<Text color="red">-7</Text>
				</Text>
			</Box>
		);
	}

	// mini
	return (
		<Text>
			<Text color="cyan">Provider</Text>/Model<Sep />
			<Text color="yellow">Ctx 77%</Text><Sep />
			<Text bold color="green">$11.15</Text><Sep />
			<Text color="white">3h31m</Text><Sep />
			<Text color="magenta">master</Text><Sep />
			<Text color="green">+45</Text>{" "}<Text color="red">-7</Text>
		</Text>
	);
}

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
			const tmpl = (config.statusLine?.template ?? "full") as StatusLineTemplateId;
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
			{highlighted.id !== "none" && (
				<>
					<Text> </Text>
					<Text dimColor>Preview:</Text>
					<Box borderStyle="single" paddingX={1}>
						<StatusLinePreview id={highlighted.id} />
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
