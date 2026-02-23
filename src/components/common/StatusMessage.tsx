import { Text } from "ink";
import type React from "react";

type Variant = "success" | "warning" | "info" | "error";

const ICONS: Record<Variant, string> = {
	success: "\u2714",
	warning: "\u26A0",
	info: "\u2139",
	error: "\u2718",
};

const COLORS: Record<Variant, string> = {
	success: "green",
	warning: "yellow",
	info: "blue",
	error: "red",
};

interface StatusMessageProps {
	variant: Variant;
	children: React.ReactNode;
}

export function StatusMessage({ variant, children }: StatusMessageProps) {
	return (
		<Text>
			<Text color={COLORS[variant]}>{ICONS[variant]} </Text>
			<Text>{children}</Text>
		</Text>
	);
}
