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
    <View style={{ gap: 8 }}>
      <Text
        selectable
        style={{
          color: colors.textMuted,
          fontSize: 13,
          fontWeight: "600",
          letterSpacing: 0.4,
          textTransform: "uppercase",
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
        style={{
          minHeight: 56,
          borderRadius: 18,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.inputBackground,
          color: colors.text,
          paddingHorizontal: 16,
          fontSize: 16,
          boxShadow: colors.shadowSm,
        }}
        value={value}
      />
    </View>
  );
}
