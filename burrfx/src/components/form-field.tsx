import { Text, TextInput, View, type KeyboardTypeOptions } from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";

type FormFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
};

export function FormField({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
}: FormFieldProps) {
  const { colors } = useAppTheme();

  return (
    <View className="gap-2">
      <Text
        className="text-[13px] font-semibold uppercase tracking-[0.4px]"
        selectable
        style={{
          color: colors.textMuted,
        }}
      >
        {label}
      </Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        secureTextEntry={secureTextEntry}
        className="min-h-14 rounded-[18px] border px-4 text-base"
        style={{
          borderCurve: "continuous",
          borderColor: colors.border,
          backgroundColor: colors.inputBackground,
          color: colors.text,
          boxShadow: colors.shadowSm,
        }}
        value={value}
      />
    </View>
  );
}
