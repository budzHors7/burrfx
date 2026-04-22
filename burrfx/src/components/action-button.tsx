import { ActivityIndicator, Pressable, Text } from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";

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
  const { colors } = useAppTheme();
  const isDisabled = disabled || loading;

  const backgroundColor =
    variant === "secondary"
      ? colors.surfaceRaised
      : variant === "danger"
        ? colors.danger
        : colors.accent;

  const textColor =
    variant === "secondary" ? colors.text : colors.textOnAccent;

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
          ? colors.borderSoft
          : backgroundColor,
        opacity: pressed ? 0.92 : 1,
        boxShadow: isDisabled ? "none" : colors.shadowMd,
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
