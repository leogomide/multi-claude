import { Box, Text } from "ink";
import React from "react";
import { terminalLink } from "../../utils/terminal-link.ts";

export interface SidebarItem {
	label: string;
	value: string;
	color?: string;
	/** Makes the value a clickable hyperlink to this URL. */
	href?: string;
}

interface SidebarProps {
	title?: string;
	items: SidebarItem[];
}

export function Sidebar({ title, items }: SidebarProps) {
	return (
		<Box flexDirection="column" paddingX={1}>
			{title && (
				<Text bold color="cyan">
					{title}
				</Text>
			)}
			{items.map((item) => (
				<Box key={item.label}>
					{/* Long values wrap; without this the label shrinks and loses its ": " */}
					<Box flexShrink={0}>
						<Text dimColor>{item.label}: </Text>
					</Box>
					{item.href ? (
						<Text color={item.color} underline>
							{terminalLink(item.value, item.href)}
						</Text>
					) : (
						<Text color={item.color}>{item.value}</Text>
					)}
				</Box>
			))}
		</Box>
	);
}
