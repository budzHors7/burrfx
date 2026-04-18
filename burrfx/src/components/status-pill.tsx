import { Text, View } from "react-native";

import { palette } from "@/lib/theme";

type StatusTone = "positive" | "warning" | "negative" | "neutral";

type StatusPillProps = {
  label: string;
  tone?: StatusTone;
};

export function StatusPill({
  label,
  tone = "neutral",
}: StatusPillProps) {
  const backgroundColor =
    tone === "positive"
      ? palette.successSoft
      : tone === "warning"
        ? palette.warningSoft
        : tone === "negative"
          ? palette.dangerSoft
          : palette.surfaceRaised;

  const textColor =
    tone === "positive"
      ? "#0f8052"
      : tone === "warning"
        ? "#8c6112"
        : tone === "negative"
          ? "#b73c4d"
          : palette.textMuted;

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
