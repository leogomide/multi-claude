import { useEffect, useRef, useState } from "react";

interface TerminalSize {
	columns: number;
	rows: number;
}

export function useTerminalSize(): TerminalSize {
	const [size, setSize] = useState<TerminalSize>({
		columns: process.stdout.columns ?? 80,
		rows: process.stdout.rows ?? 24,
	});
	const sizeRef = useRef(size);

	useEffect(() => {
		const check = () => {
			const cols = process.stdout.columns ?? 80;
			const r = process.stdout.rows ?? 24;
			if (cols !== sizeRef.current.columns || r !== sizeRef.current.rows) {
				process.stdout.write("\x1b[2J\x1b[H");
				const next = { columns: cols, rows: r };
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
