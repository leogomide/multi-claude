import { Box, Text } from "ink";
import type React from "react";
import { useTerminalSize } from "../../hooks/useTerminalSize.ts";
import type { FooterShortcut } from "./Footer.tsx";
import { Footer } from "./Footer.tsx";
import { Header } from "./Header.tsx";

interface AppShellProps {
	children: React.ReactNode;
	sidebar?: React.ReactNode;
	footerItems?: FooterShortcut[];
}

const MIN_SIDEBAR_WIDTH = 60;

export function AppShell({ children, sidebar, footerItems = [] }: AppShellProps) {
	const { columns, rows } = useTerminalSize();
	const showSidebar = sidebar && columns >= MIN_SIDEBAR_WIDTH;
	const halfWidth = Math.floor((columns - 1) / 2);

	return (
		<Box flexDirection="column" height={rows} width={columns} overflow="hidden">
			<Header />

			<Box
				flexGrow={1}
				flexDirection="row"
				overflow="hidden"
			>
				<Box flexDirection="column" width={showSidebar ? halfWidth : undefined} flexGrow={showSidebar ? 0 : 1} paddingX={2} overflow="hidden">
					{children}
				</Box>
				{showSidebar && (
					<>
						<Box flexDirection="column">
							<Text color="gray">{"│"}</Text>
						</Box>
						<Box flexDirection="column" width={halfWidth} overflow="hidden" paddingX={1}>
							{sidebar}
						</Box>
					</>
				)}
			</Box>

			<Footer items={footerItems} />
		</Box>
	);
}
