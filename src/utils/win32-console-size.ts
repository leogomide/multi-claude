import { dlopen, ptr } from "bun:ffi";

const STD_OUTPUT_HANDLE = -11;
const STD_ERROR_HANDLE = -12;
const CSBI_SIZE = 22; // sizeof(CONSOLE_SCREEN_BUFFER_INFO)

type SymbolFn = (...args: unknown[]) => unknown;
let getConsoleScreenBufferInfoFn: SymbolFn | null = null;
let consoleHandle: unknown = null;
let initFailed = false;
const buffer = new Uint8Array(CSBI_SIZE);
const view = new DataView(buffer.buffer);

function tryHandle(getStdHandle: SymbolFn, getCSBI: SymbolFn, handleId: number): boolean {
	const h = getStdHandle(handleId);
	// INVALID_HANDLE_VALUE check (0 or negative-ish pointer)
	if (h === 0 || h === -1) return false;
	const ok = getCSBI(h, ptr(buffer));
	if (!ok) return false;
	consoleHandle = h;
	return true;
}

function init(): boolean {
	if (getConsoleScreenBufferInfoFn) return true;
	if (initFailed) return false;
	try {
		const lib = dlopen("kernel32.dll", {
			GetStdHandle: { args: ["i32"], returns: "ptr" },
			GetConsoleScreenBufferInfo: { args: ["ptr", "ptr"], returns: "i32" },
		});
		const getStdHandle = lib.symbols.GetStdHandle as unknown as SymbolFn;
		const getCSBI = lib.symbols.GetConsoleScreenBufferInfo as unknown as SymbolFn;

		// Try stdout first, then stderr as fallback
		if (tryHandle(getStdHandle, getCSBI, STD_OUTPUT_HANDLE) || tryHandle(getStdHandle, getCSBI, STD_ERROR_HANDLE)) {
			getConsoleScreenBufferInfoFn = getCSBI;
			return true;
		}
		initFailed = true;
		return false;
	} catch {
		initFailed = true;
		return false;
	}
}

export function getConsoleSizeWin32(): { columns: number; rows: number } | null {
	if (!init()) return null;
	try {
		const ok = getConsoleScreenBufferInfoFn!(consoleHandle, ptr(buffer));
		if (!ok) return null;

		// srWindow gives the VISIBLE window rectangle (not the scroll buffer)
		const left = view.getInt16(10, true);
		const top = view.getInt16(12, true);
		const right = view.getInt16(14, true);
		const bottom = view.getInt16(16, true);

		const columns = right - left + 1;
		const rows = bottom - top + 1;
		if (columns > 0 && rows > 0) return { columns, rows };
		return null;
	} catch {
		return null;
	}
}
