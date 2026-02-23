import { Box, Text } from "ink";
import React from "react";

export interface FooterShortcut {
	key: string;
	label: string;
}

interface FooterProps {
	items: FooterShortcut[];
}

export function Footer({ items }: FooterProps) {
	return (
		<Box borderStyle="round" borderColor="gray" paddingX={1} gap={2}>
			{items.length > 0 ? (
				items.map((item) => (
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
