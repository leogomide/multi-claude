import { Box, Text } from "ink";
import type React from "react";
import { useTerminalSize } from "../../hooks/useTerminalSize.ts";
import { useTranslation } from "../../i18n/context.tsx";
import type { FooterShortcut } from "./Footer.tsx";
import { Footer } from "./Footer.tsx";
import { Header } from "./Header.tsx";

interface AppShellProps {
	children: React.ReactNode;
	sidebar?: React.ReactNode;
	footerItems?: FooterShortcut[];
}

const MIN_SIDEBAR_WIDTH = 60;
const MIN_COLS = 40;
const MIN_ROWS = 12;

export function AppShell({ children, sidebar, footerItems = [] }: AppShellProps) {
	const { columns, rows } = useTerminalSize();
	const { t } = useTranslation();

	if (columns < MIN_COLS || rows < MIN_ROWS) {
		return (
			<Box height={rows} width={columns} alignItems="center" justifyContent="center">
				<Text color="yellow">
					{t("terminal.tooSmall", {
						current: `${columns}x${rows}`,
						min: `${MIN_COLS}x${MIN_ROWS}`,
					})}
				</Text>
			</Box>
		);
	}

	const showSidebar = sidebar && columns >= MIN_SIDEBAR_WIDTH;
	const halfWidth = Math.floor((columns - 1) / 2);

	return (
		<Box flexDirection="column" height={rows} width={columns} overflow="hidden">
			<Header />

			<Box flexGrow={1} flexDirection="row" overflow="hidden">
				<Box
					flexDirection="column"
					width={showSidebar ? halfWidth : undefined}
					flexGrow={showSidebar ? 0 : 1}
					paddingX={2}
					overflow="hidden"
				>
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
