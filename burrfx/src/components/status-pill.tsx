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
      className="self-start rounded-full px-3 py-[7px]"
      style={{
        borderCurve: "continuous",
        backgroundColor,
      }}
    >
      <Text
        className="text-[12px] font-bold uppercase tracking-[0.3px]"
        selectable
        style={{
          color: textColor,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
