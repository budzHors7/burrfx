import { Text, View } from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";

type StatusTone = "positive" | "warning" | "negative" | "neutral";

type StatusPillProps = {
  label: string;
  tone?: StatusTone;
};

export function StatusPill({
  label,
  tone = "neutral",
}: StatusPillProps) {
  const { colors } = useAppTheme();

  const backgroundColor =
    tone === "positive"
      ? colors.successSoft
      : tone === "warning"
        ? colors.warningSoft
        : tone === "negative"
          ? colors.dangerSoft
          : colors.surfaceRaised;

  const textColor =
    tone === "positive"
      ? colors.success
      : tone === "warning"
        ? colors.warning
        : tone === "negative"
          ? colors.danger
          : colors.textMuted;

  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: 999,
        borderCurve: "continuous",
        paddingHorizontal: 12,
        paddingVertical: 7,
        backgroundColor,
      }}
    >
      <Text
        selectable
        style={{
          color: textColor,
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 0.3,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
    </View>
  );
}
