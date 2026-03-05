import { execSync } from "child_process";
import { useEffect, useRef, useState } from "react";
import { getConsoleSizeWin32 } from "../utils/win32-console-size.ts";

interface TerminalSize {
	columns: number;
	rows: number;
}

// Track whether FFI is available (set to false on first failure to avoid retries)
let ffiAvailable = process.platform === "win32";

function readTerminalSize(): TerminalSize {
	// 1. [Windows] Direct kernel32.dll FFI — bypasses all caching
	if (ffiAvailable) {
		try {
			const result = getConsoleSizeWin32();
			if (result) return result;
		} catch {
			ffiAvailable = false;
		}
	}

	// 2. Try getWindowSize() — works on macOS/Linux
	if (process.stdout.isTTY && typeof process.stdout.getWindowSize === "function") {
		try {
			const [cols, rows] = process.stdout.getWindowSize();
			if (cols > 0 && rows > 0) return { columns: cols, rows };
		} catch {}
	}

	// 3. Try .columns/.rows properties
	if (process.stdout.columns && process.stdout.rows) {
		return { columns: process.stdout.columns, rows: process.stdout.rows };
	}

	// 4. [Windows] Expensive fallback: 'mode con' (only if FFI failed to init)
	if (process.platform === "win32") {
		try {
			const output = execSync("mode con", {
				encoding: "utf-8",
				timeout: 1000,
				stdio: ["pipe", "pipe", "pipe"],
			});
			const numbers = [...output.matchAll(/:\s+(\d+)/g)].map((m) => parseInt(m[1]!, 10));
			if (numbers.length >= 2 && numbers[0]! > 0 && numbers[1]! > 0) {
				return { columns: numbers[1]!, rows: numbers[0]! };
			}
		} catch {}
	}

	return { columns: 80, rows: 24 };
}

export function useTerminalSize(): TerminalSize {
	const [size, setSize] = useState<TerminalSize>(readTerminalSize);
	const sizeRef = useRef(size);

	useEffect(() => {
		const check = () => {
			const next = readTerminalSize();
			if (next.columns !== sizeRef.current.columns || next.rows !== sizeRef.current.rows) {
				process.stdout.write("\x1b[2J\x1b[H");
				sizeRef.current = next;
				setSize(next);
			}
		};

		process.stdout.on("resize", check);
		const timer = setInterval(check, 2000);

		return () => {
			process.stdout.off("resize", check);
			clearInterval(timer);
		};
	}, []);

	return size;
}
