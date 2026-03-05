import { Box, Text, useInput } from "ink";
import CyanSelectInput from "../common/CyanSelectInput.tsx";
import React, { useEffect, useState } from "react";
import { loadConfig, saveConfig } from "../../config.ts";
import { useTerminalSize } from "../../hooks/useTerminalSize.ts";
import { useTranslation } from "../../i18n/context.tsx";
import { STATUSLINE_TEMPLATES, type StatusLineTemplateId } from "../../statusline.ts";
import { AppShell } from "../layout/AppShell.tsx";
import type { FlowMessage } from "../types.ts";

const Sep = () => <Text dimColor>{" | "}</Text>;
const P = (s: string, w: number) => s + " ".repeat(Math.max(0, w - s.length));

function StatusLinePreview({ id }: { id: StatusLineTemplateId }) {
	if (id === "none") return null;

	const provLine = (
		<Text><Text color="cyan">Provider</Text>/Model</Text>
	);

	// Grid bar: spans (cols-1) columns fused + 1 column for rest
	const gridBar = (barW: number, colW: number) => {
		const usedW = Math.floor(barW * 0.77);
		const freeW = barW - usedW;
		return (
			<Text>
				<Text color="yellow">{"\u2501".repeat(usedW) + "\u254c".repeat(freeW)}</Text>
				<Sep />
				<Text color="yellow">{P("46.1k/23% left", colW)}</Text>
			</Text>
		);
	};

	// Column width for previews (approximate)
	const W4 = 14; // 4-col templates
	const W3 = 18; // 3-col templates
	const W5 = 17; // 5-col templates

	if (id === "default") {
		// Grid: 3 columns
		const W = W4;
		return (
			<Box flexDirection="column">
				<Text><Text color="cyan">Provider</Text>/Model <Text dimColor>(</Text><Text color="magenta">master</Text> <Text color="green">+45</Text>{" "}<Text color="red">-7</Text><Text dimColor>)</Text></Text>
				<Text>
					<Text color="cyan">{P("Input:84.2k", W)}</Text><Sep />
					<Text color="yellow">{P("Output:62.8k", W)}</Text><Sep />
					<Text color="green">{P("Cache:20.6M", W)}</Text>
				</Text>
				<Text>
					<Text color="cyan">{P("Session:3h31m", W)}</Text><Sep />
					<Text color="yellow">{P("API:1h38m", W)}</Text><Sep />
					<Text color="green">{P("Cost:$11.15", W)}</Text><Sep />
					<Text color="green">$0.19/min</Text>
				</Text>
				<Text>
					<Text color="yellow">{(() => { const bW = 2 * W + 3; return "\u2501".repeat(Math.floor(bW * 0.77)) + "\u254c".repeat(bW - Math.floor(bW * 0.77)); })()}</Text><Sep />
					<Text color="yellow">{P("153.9k/77%", W)}</Text><Sep />
					<Text color="yellow">{P("46.1k/23% left", W)}</Text>
				</Text>
			</Box>
		);
	}

	if (id === "full") {
		// Grid: 3 columns — same as default + context detail line
		const W = W4;
		return (
			<Box flexDirection="column">
				<Text><Text color="cyan">Provider</Text>/Model <Text dimColor>(</Text><Text color="magenta">master</Text> <Text color="green">+45</Text>{" "}<Text color="red">-7</Text><Text dimColor>)</Text></Text>
				<Text>
					<Text color="cyan">{P("Ctx:153.9k/77%", W)}</Text><Sep />
					<Text color="yellow">{P("Left:46.1k/23%", W)}</Text><Sep />
					<Text color="green">{P("Win:200k", W)}</Text>
				</Text>
				<Text>
					<Text color="cyan">{P("Input:84.2k", W)}</Text><Sep />
					<Text color="yellow">{P("Output:62.8k", W)}</Text><Sep />
					<Text color="green">{P("Cache:20.6M", W)}</Text>
				</Text>
				<Text>
					<Text color="cyan">{P("Session:3h31m", W)}</Text><Sep />
					<Text color="yellow">{P("API:1h38m", W)}</Text><Sep />
					<Text color="green">{P("Cost:$11.15", W)}</Text><Sep />
					<Text color="green">$0.19/min</Text>
				</Text>
			</Box>
		);
	}

	if (id === "slim") {
		// Grid: 3 columns
		const bW = 2 * W3 + 1 * 3;
		return (
			<Box flexDirection="column">
				{provLine}
				{gridBar(bW, W3)}
				<Text>
					<Text><Text color="cyan">Input:84.2k</Text>{" "}<Text color="yellow">{P("Output:62.8k", W3 - 12)}</Text></Text><Sep />
					<Text bold color="green">{P("$11.15", W3)}</Text><Sep />
					<Text color="white">{P("3h31m", W3)}</Text><Sep />
					<Text color="magenta">master</Text><Sep />
					<Text color="green">+45</Text>{" "}<Text color="red">-7</Text>
				</Text>
			</Box>
		);
	}

	if (id === "mini") {
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

	if (id === "cost") {
		// Grid: 5 columns
		const bW = 4 * W5 + 3 * 3;
		return (
			<Box flexDirection="column">
				{provLine}
				{gridBar(bW, W5)}
				<Text>
					<Text bold color="green">{P("Cost:$11.15", W5)}</Text><Sep />
					<Text color="cyan">{P("$0.19/min", W5)}</Text><Sep />
					<Text color="yellow">{P("~$11.40/h", W5)}</Text><Sep />
					<Text><Text color="cyan">Input:$3.40</Text>{" "}<Text color="yellow">{P("Output:$7.75", W5 - 11)}</Text></Text><Sep />
					<Text color="white">{P("Session:3h31m", W5)}</Text>
				</Text>
			</Box>
		);
	}

	if (id === "dev") {
		return (
			<Box flexDirection="column">
				{provLine}
				<Text>
					<Text color="magenta">master</Text><Sep />
					<Text color="green">+145</Text>{" "}<Text color="red">-32</Text><Sep />
					<Text color="yellow">Agent:explorer</Text><Sep />
					<Text bold color="blueBright">WT:feature</Text>{" "}
					<Text dimColor>{"("}</Text><Text color="magenta">feat</Text>{" "}<Text dimColor>{"<-"}</Text>{" "}<Text color="white">main</Text><Text dimColor>{")"}</Text>
				</Text>
				<Text>
					<Text color="yellow">Ctx 77%</Text><Sep />
					<Text bold color="green">$11.15</Text><Sep />
					<Text color="white">3h31m</Text>
				</Text>
			</Box>
		);
	}

	if (id === "perf") {
		// Grid: 5 columns
		const bW = 4 * W5 + 3 * 3;
		return (
			<Box flexDirection="column">
				{provLine}
				{gridBar(bW, W5)}
				<Text>
					<Text color="green">{P("Cache:71% hit", W5)}</Text><Sep />
					<Text color="blueBright">{P("I/O 1.3:1", W5)}</Text><Sep />
					<Text color="cyan">{P("API:47% time", W5)}</Text><Sep />
					<Text color="yellow">{P("Out:~297tok/s", W5)}</Text><Sep />
					<Text bold color="green">{P("$11.15", W5)}</Text>
				</Text>
			</Box>
		);
	}

	// context: Grid 5 columns
	const bW5 = 4 * W5 + 3 * 3;
	return (
		<Box flexDirection="column">
			{provLine}
			{gridBar(bW5, W5)}
			<Text>
				<Text color="cyan">{P("Input:84.2k", W5)}</Text><Sep />
				<Text color="green">{P("CacheCreate:2.1k", W5)}</Text><Sep />
				<Text color="green">{P("CacheRead:18.5k", W5)}</Text><Sep />
				<Text color="yellow">{P("Output:62.8k", W5)}</Text><Sep />
				<Text bold color="white">{P("Total:167.6k/200k", W5)}</Text>
			</Text>
		</Box>
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
			const tmpl = (config.statusLine?.template ?? "default") as StatusLineTemplateId;
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
			<CyanSelectInput
				items={items}
				onSelect={handleSelect}
				onHighlight={(item) => setHighlightedId(item.value as StatusLineTemplateId)}
				limit={Math.max(3, rows - 9)}
			/>
		</AppShell>
	);
}
