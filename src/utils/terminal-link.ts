/**
 * Wraps text in an OSC 8 hyperlink. Terminals that support it (Windows Terminal,
 * VS Code, iTerm2, WezTerm, GNOME) make the text clickable; the rest ignore the
 * escape and print the text as is.
 */
export function terminalLink(text: string, url: string): string {
	return `\x1b]8;;${url}\x07${text}\x1b]8;;\x07`;
}
