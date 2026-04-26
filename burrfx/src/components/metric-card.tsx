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
      className="min-w-[47%] flex-1 gap-2.5 rounded-[24px] border p-[18px]"
      style={{
        borderCurve: "continuous",
        borderColor: colors.borderSoft,
        backgroundColor: colors.panel,
        boxShadow: colors.shadowMd,
      }}
    >
      <View
        className="h-1 w-[42px] rounded-full"
        style={{
          backgroundColor: metricAccent,
        }}
      />
      <Text
        className="text-[13px] font-semibold uppercase tracking-[0.4px]"
        selectable
        style={{
          color: colors.textDim,
        }}
      >
        {label}
      </Text>
      <Text
        className="text-[22px] font-black tabular-nums"
        selectable
        style={{
          color: colors.text,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
