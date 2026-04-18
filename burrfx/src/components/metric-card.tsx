import { Text, View } from "react-native";

import { palette } from "@/lib/theme";

type MetricCardProps = {
  label: string;
  value: string;
  accent?: string;
};

export function MetricCard({
  label,
  value,
  accent = palette.accent,
}: MetricCardProps) {
  return (
    <View
      style={{
        minWidth: "47%",
        flexGrow: 1,
        gap: 10,
        borderRadius: 24,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: "rgba(11, 32, 50, 0.9)",
        padding: 18,
        boxShadow: "0 16px 38px rgba(2, 12, 22, 0.22)",
      }}
    >
      <View
        style={{
          height: 4,
          width: 42,
          borderRadius: 999,
          backgroundColor: accent,
        }}
      />
      <Text
        selectable
        style={{
          color: palette.textDim,
          fontSize: 13,
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {label}
      </Text>
      <Text
        selectable
        style={{
          color: palette.text,
          fontSize: 22,
          fontWeight: "800",
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
      </Text>
    </View>
  );
}
