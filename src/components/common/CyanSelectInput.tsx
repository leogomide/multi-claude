import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import type React from "react";
import type { FC } from "react";

type IndicatorProps = { readonly isSelected?: boolean };
type ItemProps = { readonly isSelected?: boolean; readonly label: string };

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

const CyanItem: FC<ItemProps> = ({ isSelected, label }) => (
	<Text bold={isSelected} color={isSelected ? "cyan" : undefined}>
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
