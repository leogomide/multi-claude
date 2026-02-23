import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import React, { useState } from "react";

interface TextPromptProps {
	label: string;
	placeholder?: string;
	initialValue?: string;
	mask?: string;
	focus?: boolean;
	validate?: (value: string) => string | undefined;
	onSubmit: (value: string) => void;
	onCancel?: () => void;
}

export function TextPrompt({
	label,
	placeholder,
	initialValue = "",
	mask,
	focus = true,
	validate,
	onSubmit,
	onCancel,
}: TextPromptProps) {
	const [value, setValue] = useState(initialValue);
	const [error, setError] = useState<string>();

	useInput(
		(_input, key) => {
			if (key.escape && onCancel) {
				onCancel();
				return;
			}
			if (key.return) {
				const validationError = validate?.(value);
				if (validationError) {
					setError(validationError);
					return;
				}
				onSubmit(value);
			}
		},
		{ isActive: focus },
	);

	const handleChange = (newValue: string) => {
		setValue(newValue);
		if (error) setError(undefined);
	};

	if (!focus) {
		return (
			<Box flexDirection="column">
				<Text dimColor>{label}</Text>
				{value ? (
					<Box>
						<Text color="green">{"✓ "}</Text>
						<Text>{mask ? mask.repeat(value.length) : value}</Text>
					</Box>
				) : (
					<Box>
						<Text dimColor>{"  "}</Text>
					</Box>
				)}
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Text bold color="cyan">
				{label}
			</Text>
			<Box>
				<Text color="green">{"> "}</Text>
				<TextInput value={value} onChange={handleChange} placeholder={placeholder} mask={mask} focus={focus} />
			</Box>
			{error && <Text color="red">{error}</Text>}
		</Box>
	);
}
