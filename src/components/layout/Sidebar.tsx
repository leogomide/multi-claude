import { Box, Text } from "ink";
import React from "react";

export interface SidebarItem {
	label: string;
	value: string;
	color?: string;
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
					<Text dimColor>{item.label}: </Text>
					<Text color={item.color}>{item.value}</Text>
				</Box>
			))}
		</Box>
	);
}
