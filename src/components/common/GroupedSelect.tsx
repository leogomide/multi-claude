import { Box, Text, useInput } from "ink";
import React, { useEffect, useRef, useState } from "react";

export interface GroupedSelectItem {
	label: string;
	value: string;
	icon?: string;
}

export interface GroupedSelectGroup {
	label?: string;
	items: GroupedSelectItem[];
}

interface GroupedSelectProps {
	groups: GroupedSelectGroup[];
	onSelect: (item: GroupedSelectItem) => void;
	onHighlight?: (item: GroupedSelectItem) => void;
	onEscape?: () => void;
}

export function GroupedSelect({ groups, onSelect, onHighlight, onEscape }: GroupedSelectProps) {
	const allItems = groups.flatMap((g) => g.items);
	const [activeIndex, setActiveIndex] = useState(0);
	const prevItemsKey = useRef("");

	useEffect(() => {
		const item = allItems[activeIndex];
		if (item && onHighlight) {
			onHighlight(item);
		}
	}, [activeIndex]);

	// Re-emit highlight when the items list changes (e.g. async data loaded)
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
		if (key.escape && onEscape) {
			onEscape();
		} else if (key.upArrow) {
			setActiveIndex((prev) => (prev > 0 ? prev - 1 : allItems.length - 1));
		} else if (key.downArrow) {
			setActiveIndex((prev) => (prev < allItems.length - 1 ? prev + 1 : 0));
		} else if (key.return) {
			const item = allItems[activeIndex];
			if (item) {
				onSelect(item);
			}
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
						return (
							<Box key={item.value}>
								<Text bold color={isActive ? "cyan" : undefined}>
									{isActive ? "❯ " : "  "}
									{item.icon ? `${item.icon}  ` : ""}
									{item.label}
								</Text>
							</Box>
						);
					})}
				</Box>
			))}
		</Box>
	);
}
