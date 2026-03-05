import { Box, Text, useInput } from "ink";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTerminalSize } from "../../hooks/useTerminalSize.ts";

export interface GroupedSelectItem {
	label: string;
	value: string;
	icon?: string;
	color?: string;
}

export interface GroupedSelectGroup {
	label?: string;
	labelColor?: string;
	items: GroupedSelectItem[];
}

interface GroupedSelectProps {
	groups: GroupedSelectGroup[];
	onSelect: (item: GroupedSelectItem) => void;
	onHighlight?: (item: GroupedSelectItem) => void;
	onEscape?: () => void;
}

interface FlatEntry {
	type: "label" | "item";
	groupIndex: number;
	itemIndex?: number;
	item?: GroupedSelectItem;
	label?: string;
	labelColor?: string;
	hasMarginTop?: boolean;
}

export function GroupedSelect({ groups, onSelect, onHighlight, onEscape }: GroupedSelectProps) {
	const allItems = groups.flatMap((g) => g.items);
	const [activeIndex, setActiveIndex] = useState(0);
	const prevItemsKey = useRef("");
	const { rows } = useTerminalSize();

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

	// Build flat list of all renderable rows (labels + items)
	const flatEntries = useMemo((): FlatEntry[] => {
		const entries: FlatEntry[] = [];
		groups.forEach((group, gi) => {
			if (group.label) {
				entries.push({
					type: "label",
					groupIndex: gi,
					label: group.label,
					labelColor: group.labelColor,
					hasMarginTop: gi > 0,
				});
			}
			group.items.forEach((item, ii) => {
				entries.push({ type: "item", groupIndex: gi, itemIndex: ii, item });
			});
		});
		return entries;
	}, [groups]);

	// Calculate visible window
	// header(~5) + footer(~3) + status message(~1) + scroll indicators(~2) = ~11
	const maxVisibleRows = Math.max(5, rows - 11);
	const needsScrolling = flatEntries.length > maxVisibleRows;

	const visibleEntries = useMemo(() => {
		if (!needsScrolling) return flatEntries;

		// Find the flat entry index for the active item
		let activeEntryIndex = 0;
		let itemCount = 0;
		for (let i = 0; i < flatEntries.length; i++) {
			if (flatEntries[i]!.type === "item") {
				if (itemCount === activeIndex) {
					activeEntryIndex = i;
					break;
				}
				itemCount++;
			}
		}

		const half = Math.floor(maxVisibleRows / 2);
		let start: number;
		if (activeEntryIndex <= half) {
			start = 0;
		} else if (activeEntryIndex >= flatEntries.length - half) {
			start = Math.max(0, flatEntries.length - maxVisibleRows);
		} else {
			start = activeEntryIndex - half;
		}

		return flatEntries.slice(start, start + maxVisibleRows);
	}, [flatEntries, activeIndex, maxVisibleRows, needsScrolling]);

	const showUpIndicator = needsScrolling && visibleEntries[0] !== flatEntries[0];
	const showDownIndicator =
		needsScrolling &&
		visibleEntries[visibleEntries.length - 1] !== flatEntries[flatEntries.length - 1];

	// Track which items are visible to map to global flatIndex
	let itemCounter = 0;
	// Count items before the visible window
	if (needsScrolling) {
		const firstVisible = flatEntries.indexOf(visibleEntries[0]!);
		for (let i = 0; i < firstVisible; i++) {
			if (flatEntries[i]!.type === "item") itemCounter++;
		}
	}

	return (
		<Box flexDirection="column">
			{showUpIndicator && <Text dimColor> {"↑ ..."}</Text>}
			{visibleEntries.map((entry, vi) => {
				if (entry.type === "label") {
					return (
						<Box
							key={`label-${entry.groupIndex}`}
							marginTop={entry.hasMarginTop && !showUpIndicator ? 1 : 0}
						>
							<Text bold dimColor={!entry.labelColor} color={entry.labelColor}>
								{"── "}
								{entry.label}
								{" ──"}
							</Text>
						</Box>
					);
				}
				const idx = itemCounter++;
				const isActive = idx === activeIndex;
				return (
					<Box key={entry.item!.value}>
						<Text bold color={isActive ? "cyan" : entry.item!.color}>
							{isActive ? "❯ " : "  "}
							{entry.item!.icon ? `${entry.item!.icon}  ` : ""}
							{entry.item!.label}
						</Text>
					</Box>
				);
			})}
			{showDownIndicator && <Text dimColor> {"↓ ..."}</Text>}
		</Box>
	);
}
