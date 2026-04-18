import { Text, TextInput, View, type KeyboardTypeOptions } from "react-native";

import { palette } from "@/lib/theme";

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
  return (
    <View style={{ gap: 8 }}>
      <Text
        selectable
        style={{
          color: palette.textMuted,
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
        placeholderTextColor={palette.textDim}
        secureTextEntry={secureTextEntry}
        style={{
          minHeight: 56,
          borderRadius: 18,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: "rgba(9, 24, 36, 0.86)",
          color: palette.text,
          paddingHorizontal: 16,
          fontSize: 16,
          boxShadow: "0 14px 34px rgba(2, 12, 22, 0.22)",
        }}
        value={value}
      />
    </View>
  );
}
