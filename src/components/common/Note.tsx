import { Box, Text } from "ink";
import type React from "react";

interface NoteProps {
	title?: string;
	children: React.ReactNode;
}

export function Note({ title, children }: NoteProps) {
	return (
		<Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
			{title && (
				<Text bold color="cyan">
					{title}
				</Text>
			)}
			<Text>{children}</Text>
		</Box>
	);
}
