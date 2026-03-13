import { execSync } from "node:child_process";
import { Box, Text } from "ink";
import React, { useState } from "react";
import pkg from "../../../package.json";
import { useBreadcrumb } from "../../hooks/useBreadcrumb.tsx";
import { useTerminalSize } from "../../hooks/useTerminalSize.ts";

function detectClaudeVersion(): string | null {
	try {
		const raw = execSync("claude -v", {
			encoding: "utf-8",
			timeout: 3000,
			stdio: ["pipe", "pipe", "pipe"],
		}).trim();
		// Extract just the version number (e.g. "2.1.50" from "2.1.50 (Claude Code)")
		return raw.split(" ")[0] ?? raw;
	} catch {
		return null;
	}
}

export function Header() {
	const { crumbs } = useBreadcrumb();
	const { columns } = useTerminalSize();
	const [claudeVersion] = useState(detectClaudeVersion);
	const hasCrumbs = crumbs.length > 0;
	return (
		<Box flexDirection="column" paddingX={1}>
			<Box justifyContent="space-between">
				<Text bold color="magenta">
					{`🐙 multi-claude v${pkg.version}`}
				</Text>
				<Text color="cyan">
					{claudeVersion ? `claude code v${claudeVersion}` : "claude not found"}
				</Text>
			</Box>
			{hasCrumbs && (
				<Box>
					{crumbs.map((crumb, i) => (
						<Text key={i}>
							{i > 0 && <Text color="gray">{" › "}</Text>}
							<Text color="white">{crumb}</Text>
						</Text>
					))}
				</Box>
			)}
			<Text color="gray">{"─".repeat(Math.max(0, columns - 2))}</Text>
		</Box>
	);
}
