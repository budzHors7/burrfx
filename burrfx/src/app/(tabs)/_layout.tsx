import { Redirect } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";

import { useAppSession } from "@/hooks/use-app-session";
import { palette } from "@/lib/theme";

export default function TabsLayout() {
  const { isAuthenticated, trades, botStatus } = useAppSession();

  if (!isAuthenticated) {
    return <Redirect href="/" />;
  }

  return (
    <NativeTabs
      tintColor={palette.accent}
      minimizeBehavior="onScrollDown"
    >
      <NativeTabs.Trigger name="(dashboard)">
        <NativeTabs.Trigger.Icon
          sf={{ default: "gauge", selected: "gauge.open.with.lines.needle.33percent" }}
          md="space_dashboard"
        />
        <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
        {botStatus?.running ? (
          <NativeTabs.Trigger.Badge />
        ) : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(trades)">
        <NativeTabs.Trigger.Icon
          sf={{ default: "chart.bar.doc.horizontal", selected: "chart.bar.doc.horizontal.fill" }}
          md="candlestick_chart"
        />
        <NativeTabs.Trigger.Label>Trades</NativeTabs.Trigger.Label>
        {trades.length > 0 ? (
          <NativeTabs.Trigger.Badge>
            {String(trades.length)}
          </NativeTabs.Trigger.Badge>
        ) : null}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
