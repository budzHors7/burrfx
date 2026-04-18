import { ActivityIndicator, Pressable, Text } from "react-native";

import { palette } from "@/lib/theme";

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
};

export function ActionButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
}: ActionButtonProps) {
  const isDisabled = disabled || loading;

  const backgroundColor =
    variant === "secondary"
      ? palette.surfaceRaised
      : variant === "danger"
        ? palette.danger
        : palette.accent;

  const textColor =
    variant === "secondary"
      ? palette.text
      : palette.textOnAccent;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 54,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        borderRadius: 18,
        borderCurve: "continuous",
        paddingHorizontal: 18,
        backgroundColor: isDisabled
          ? palette.borderSoft
          : backgroundColor,
        opacity: pressed ? 0.92 : 1,
        boxShadow: isDisabled
          ? "none"
          : "0 18px 40px rgba(2, 12, 22, 0.24)",
      })}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : null}
      <Text
        selectable
        style={{
          color: textColor,
          fontSize: 15,
          fontWeight: "700",
          letterSpacing: 0.2,
        }}
      >
        {loading ? `${label}...` : label}
      </Text>
    </Pressable>
  );
}
