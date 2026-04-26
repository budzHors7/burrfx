import {
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";

export type FilterOption<T extends string> = {
  label: string;
  value: T;
};

type FilterPillsProps<T extends string> = {
  options: readonly FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
};

export function FilterPills<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
}: FilterPillsProps<T>) {
  const { colors } = useAppTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        gap: 8,
      }}
    >
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => {
              onChange(option.value);
            }}
            style={({ pressed }) => ({
              minHeight: 38,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: isSelected
                ? colors.accentDeep
                : colors.borderSoft,
              backgroundColor: isSelected
                ? colors.accent
                : colors.surfaceRaised,
              opacity: disabled ? 0.5 : pressed ? 0.92 : 1,
              paddingHorizontal: 14,
            })}
          >
            <Text
              selectable
              style={{
                color: isSelected
                  ? colors.textOnAccent
                  : colors.text,
                fontSize: 13,
                fontWeight: "700",
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
      <View />
    </ScrollView>
  );
}
