import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import type React from "react";
import type { FC } from "react";

type IndicatorProps = { readonly isSelected?: boolean };
// ink-select-input spreads the whole item into the item component, so extra fields arrive here.
type ItemProps = { readonly isSelected?: boolean; readonly label: string; readonly color?: string };

const CyanIndicator: FC<IndicatorProps> = ({ isSelected }) => (
	<Box marginRight={1}>
		{isSelected ? (
			<Text bold color="cyan">
				{"❯"}
			</Text>
		) : (
			<Text> </Text>
		)}
	</Box>
);

// Same rule as GroupedSelect: the highlight wins, the item color shows otherwise.
const CyanItem: FC<ItemProps> = ({ isSelected, label, color }) => (
	<Text bold={isSelected} color={isSelected ? "cyan" : color}>
		{label}
	</Text>
);

function CyanSelectInput<V>(props: React.ComponentProps<typeof SelectInput<V>>) {
	return (
		<SelectInput
			{...props}
			indicatorComponent={props.indicatorComponent ?? CyanIndicator}
			itemComponent={props.itemComponent ?? CyanItem}
		/>
	);
}

export default CyanSelectInput;
