import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import React, { useEffect, useRef, useState } from "react";

export interface ChecklistItem {
	label: string;
	value: string;
	description: string;
	checked: boolean;
	acceptsValue?: boolean;
	valuePlaceholder?: string;
}

export interface ChecklistGroup {
	label: string;
	items: ChecklistItem[];
}

export interface ChecklistResult {
	flag: string;
	value?: string;
}

interface ChecklistSelectProps {
	groups: ChecklistGroup[];
	onConfirm: (selected: ChecklistResult[]) => void;
	onHighlight?: (item: ChecklistItem) => void;
	onEscape?: () => void;
}

export function ChecklistSelect({ groups, onConfirm, onHighlight, onEscape }: ChecklistSelectProps) {
	const allItems = groups.flatMap((g) => g.items);
	const [activeIndex, setActiveIndex] = useState(0);
	const [checkedValues, setCheckedValues] = useState<Set<string>>(() => {
		const initial = new Set<string>();
		for (const item of allItems) {
			if (item.checked) initial.add(item.value);
		}
		return initial;
	});
	const [itemValues, setItemValues] = useState<Map<string, string>>(() => new Map());
	const [editingValue, setEditingValue] = useState<string | null>(null);
	const prevItemsKey = useRef("");

	useEffect(() => {
		const item = allItems[activeIndex];
		if (item && onHighlight) {
			onHighlight(item);
		}
	}, [activeIndex]);

	useEffect(() => {
		const key = allItems.map((i) => i.value).join(",");
		if (key !== prevItemsKey.current) {
			prevItemsKey.current = key;
			const item = allItems[activeIndex];
			if (item && onHighlight) {
				onHighlight(item);
			}
		}
	});

	useInput((input, key) => {
		if (editingValue) {
			if (key.return) {
				setEditingValue(null);
			} else if (key.escape) {
				setEditingValue(null);
			}
			return;
		}

		if (key.escape && onEscape) {
			onEscape();
		} else if (key.upArrow) {
			setActiveIndex((prev) => (prev > 0 ? prev - 1 : allItems.length - 1));
		} else if (key.downArrow) {
			setActiveIndex((prev) => (prev < allItems.length - 1 ? prev + 1 : 0));
		} else if (input === " ") {
			const item = allItems[activeIndex];
			if (item) {
				setCheckedValues((prev) => {
					const next = new Set(prev);
					if (next.has(item.value)) {
						next.delete(item.value);
						setEditingValue(null);
					} else {
						next.add(item.value);
						if (item.acceptsValue) {
							setEditingValue(item.value);
						}
					}
					return next;
				});
			}
		} else if (key.return) {
			const selected: ChecklistResult[] = [];
			for (const item of allItems) {
				if (checkedValues.has(item.value)) {
					const val = itemValues.get(item.value);
					selected.push({ flag: item.value, value: val || undefined });
				}
			}
			onConfirm(selected);
		}
	});

	let flatIndex = 0;

	return (
		<Box flexDirection="column">
			{groups.map((group, gi) => (
				<Box key={group.label ?? `group-${gi}`} flexDirection="column">
					{group.label && (
						<Box marginTop={gi > 0 ? 1 : 0}>
							<Text bold dimColor>
								{"── "}
								{group.label}
								{" ──"}
							</Text>
						</Box>
					)}
					{group.items.map((item) => {
						const idx = flatIndex++;
						const isActive = idx === activeIndex;
						const isChecked = checkedValues.has(item.value);
						const isEditing = editingValue === item.value;
						return (
							<Box key={item.value} flexDirection="column">
								<Box>
									<Text bold={isActive} color={isActive ? "cyan" : undefined}>
										{isActive ? "❯ " : "  "}
										{isChecked ? "[x] " : "[ ] "}
										{item.label}
									</Text>
									<Text dimColor>{"  "}{item.description}</Text>
								</Box>
								{isChecked && item.acceptsValue && (
									<Box marginLeft={6}>
										{isEditing ? (
											<Box>
												<Text color="green">{"> "}</Text>
												<TextInput
													value={itemValues.get(item.value) ?? ""}
													onChange={(val) => setItemValues((prev) => new Map(prev).set(item.value, val))}
													placeholder={item.valuePlaceholder ?? ""}
												/>
											</Box>
										) : (
											<Text dimColor>
												{"  "}
												{itemValues.get(item.value)
													? `= ${itemValues.get(item.value)}`
													: item.valuePlaceholder ? `(${item.valuePlaceholder})` : ""}
											</Text>
										)}
									</Box>
								)}
							</Box>
						);
					})}
				</Box>
			))}
		</Box>
	);
}
