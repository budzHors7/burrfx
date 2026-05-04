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
    isDisabled
      ? colors.textDim
      : variant === "secondary"
        ? colors.text
        : colors.textOnAccent;

  return (
    <Pressable
      accessibilityRole="button"
      className="min-h-14 flex-row items-center justify-center gap-2.5 rounded-[18px] px-[18px]"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => ({
        borderCurve: "continuous",
        borderWidth: variant === "secondary" ? 1 : 0,
        borderColor:
          variant === "secondary"
            ? isDisabled
              ? colors.border
              : colors.borderSoft
            : variant === "danger"
              ? colors.danger
              : colors.accentDeep,
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
        className="text-[15px] font-bold tracking-[0.2px]"
        selectable
        style={{
          color: textColor,
        }}
      >
        {loading ? `${label}...` : label}
      </Text>
    </Pressable>
  );
}
