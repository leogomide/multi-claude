import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import React, { useMemo, useState } from "react";
import { useTranslation } from "../../i18n/context.tsx";
import { i18n } from "../../i18n/index.ts";

interface SearchableSelectItem {
	label: string;
	value: string;
}

interface SearchableSelectProps {
	items: SearchableSelectItem[];
	onSelect: (item: SearchableSelectItem) => void;
	onEscape?: () => void;
	placeholder?: string;
	emptyMessage?: string;
}

export function SearchableSelect({
	items,
	onSelect,
	onEscape,
	placeholder,
	emptyMessage,
}: SearchableSelectProps) {
	const { t } = useTranslation();
	const [query, setQuery] = useState("");

	useInput((_input, key) => {
		if (key.escape && onEscape) {
			onEscape();
		}
	});

	const filteredItems = useMemo(() => {
		if (!query.trim()) return items;
		const lower = query.toLowerCase();
		return items.filter((item) => item.label.toLowerCase().includes(lower));
	}, [items, query]);

	const table = i18n.table(i18n.locale());
	const resultCountText =
		table?.searchSelect.resultCount({ filtered: filteredItems.length, total: items.length }) ??
		`${filteredItems.length}/${items.length}`;

	return (
		<Box flexDirection="column">
			<Box>
				<Text color="green">{"> "}</Text>
				<TextInput
					value={query}
					onChange={setQuery}
					placeholder={placeholder ?? t("searchSelect.placeholder")}
				/>
				<Text color="gray" dimColor>
					{" "}
					({resultCountText})
				</Text>
			</Box>
			{filteredItems.length === 0 ? (
				<Text color="yellow">{emptyMessage ?? t("searchSelect.noResults")}</Text>
			) : (
				<SelectInput items={filteredItems} onSelect={onSelect} limit={10} />
			)}
		</Box>
	);
}
