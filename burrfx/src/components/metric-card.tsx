import {
  Text,
  View,
  type ColorValue,
} from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";

type MetricCardProps = {
  label: string;
  value: string;
  accent?: ColorValue;
};

export function MetricCard({
  label,
  value,
  accent,
}: MetricCardProps) {
  const { colors } = useAppTheme();
  const metricAccent = accent ?? colors.accent;

  return (
    <View
      style={{
        minWidth: "47%",
        flexGrow: 1,
        gap: 10,
        borderRadius: 24,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.borderSoft,
        backgroundColor: colors.panel,
        padding: 18,
        boxShadow: colors.shadowMd,
      }}
    >
      <View
        style={{
          height: 4,
          width: 42,
          borderRadius: 999,
          backgroundColor: metricAccent,
        }}
      />
      <Text
        selectable
        style={{
          color: colors.textDim,
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
          color: colors.text,
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
