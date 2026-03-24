import { Box, Text } from "ink";
import React from "react";
import type { ChangelogVersion } from "../../changelog.ts";

const TYPE_COLORS: Record<string, string> = {
	feat: "green",
	fix: "yellow",
	refactor: "blue",
	docs: "magenta",
};

interface ChangelogSidebarProps {
	version: ChangelogVersion;
	description?: string;
}

export function ChangelogSidebar({ version, description }: ChangelogSidebarProps) {
	return (
		<Box flexDirection="column" paddingX={1}>
			<Text bold color="cyan">
				{version.version}
				{version.isCurrent && <Text color="green">{" (current)"}</Text>}
			</Text>
			{description && (
				<Box marginBottom={1}>
					<Text dimColor>{description}</Text>
				</Box>
			)}
			{version.entries.map((entry, i) => (
				<Box key={`${entry.type}-${i}`}>
					<Text bold color={TYPE_COLORS[entry.type] ?? "white"}>
						{entry.type}
					</Text>
					<Text>{`: ${entry.description}`}</Text>
				</Box>
			))}
		</Box>
	);
}
