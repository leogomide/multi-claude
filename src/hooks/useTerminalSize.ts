import { execSync } from "child_process";
import { useEffect, useRef, useState } from "react";

interface TerminalSize {
	columns: number;
	rows: number;
}

function readTerminalSize(): TerminalSize {
	// 1. Try getWindowSize() — re-queries OS each call
	if (process.stdout.isTTY && typeof process.stdout.getWindowSize === "function") {
		try {
			const [cols, rows] = process.stdout.getWindowSize();
			if (cols > 0 && rows > 0) return { columns: cols, rows };
		} catch {}
	}

	// 2. Try .columns/.rows properties
	if (process.stdout.columns && process.stdout.rows) {
		return { columns: process.stdout.columns, rows: process.stdout.rows };
	}

	// 3. Windows fallback: 'mode con' (language-independent — parse numbers after colons)
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
