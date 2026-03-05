import { Box, Text } from "ink";
import React from "react";
import { useTerminalSize } from "../../hooks/useTerminalSize.ts";

export interface FooterShortcut {
	key: string;
	label: string;
}

interface FooterProps {
	items: FooterShortcut[];
}

export function Footer({ items }: FooterProps) {
	const { columns } = useTerminalSize();
	const gap = columns < 50 ? 1 : 2;
	const visibleItems = columns < 35 ? items.slice(-1) : items;

	return (
		<Box borderStyle="round" borderColor="gray" paddingX={1} gap={gap}>
			{visibleItems.length > 0 ? (
				visibleItems.map((item) => (
					<Text key={item.key}>
						<Text color="cyan">{item.key}</Text> {item.label}
					</Text>
				))
			) : (
				<Text>{" "}</Text>
			)}
		</Box>
	);
}
