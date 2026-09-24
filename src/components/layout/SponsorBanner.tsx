import { Box, Text } from "ink";
import React from "react";
import { useTranslation } from "../../i18n/context.tsx";
import { FLATT_SPONSOR_URL } from "../../providers.ts";
import { terminalLink } from "../../utils/terminal-link.ts";

export const SPONSOR_BANNER_URL = `${FLATT_SPONSOR_URL}&utm_content=footer`;

export const TAGLINE_KEYS = [
	"sponsorBanner.tagline1",
	"sponsorBanner.tagline2",
	"sponsorBanner.tagline3",
] as const;

// Picked at module scope: every screen mounts a fresh Footer, so a useState
// would reshuffle the tagline on each navigation instead of once per session.
const SESSION_TAGLINE =
	TAGLINE_KEYS[Math.floor(Math.random() * TAGLINE_KEYS.length)] ?? TAGLINE_KEYS[0];

export function SponsorBanner() {
	const { t } = useTranslation();
	// Always one row: list heights subtract a fixed footer overhead from the terminal rows.
	return (
		<Box height={1} overflow="hidden">
			<Box flexShrink={0}>
				<Text bold color="green">
					{"★ Flatt  "}
				</Text>
			</Box>
			{/* Kept out of the truncated Text so the OSC 8 escape is never cut in half */}
			<Box flexShrink={0}>
				<Text color="green" underline>
					{terminalLink("flatt.com.br ↗", SPONSOR_BANNER_URL)}
				</Text>
			</Box>
			<Text dimColor wrap="truncate-end">
				{`  — ${t(SESSION_TAGLINE)}`}
			</Text>
		</Box>
	);
}
