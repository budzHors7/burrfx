import { Redirect } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";

import { useAppSession } from "@/hooks/use-app-session";
import { useAppTheme } from "@/hooks/use-app-theme";

export default function TabsLayout() {
  const { isAuthenticated } = useAppSession();
  const { colors } = useAppTheme();

  if (!isAuthenticated) {
    return <Redirect href="/" />;
  }

  return (
    <NativeTabs
      backgroundColor={colors.tabBarBackground}
      disableIndicator={Platform.OS === "android"}
      disableTransparentOnScrollEdge
      iconColor={{
        default: colors.textMuted,
        selected: colors.accent,
      }}
      indicatorColor={colors.accent}
      labelVisibilityMode="labeled"
      labelStyle={{
        default: {
          color: colors.textMuted,
          fontSize: 11,
          fontWeight: "600",
        },
        selected: {
          color: colors.text,
          fontSize: 11,
          fontWeight: "700",
        },
      }}
      minimizeBehavior={
        Platform.OS === "ios"
          ? "onScrollDown"
          : undefined
      }
      rippleColor={colors.accentSoft}
      shadowColor={colors.tabBarShadow}
      tintColor={
        Platform.OS === "ios"
          ? colors.accent
          : undefined
      }
    >
      <NativeTabs.Trigger name="(dashboard)">
        <NativeTabs.Trigger.Icon
          sf={{ default: "gauge", selected: "gauge.open.with.lines.needle.33percent" }}
          md="space_dashboard"
        />
        <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(trades)">
        <NativeTabs.Trigger.Icon
          sf={{ default: "chart.bar.doc.horizontal", selected: "chart.bar.doc.horizontal.fill" }}
          md="candlestick_chart"
        />
        <NativeTabs.Trigger.Label>Trades</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(logs)">
        <NativeTabs.Trigger.Icon
          sf={{ default: "list.bullet.rectangle", selected: "list.bullet.rectangle.fill" }}
          md="receipt_long"
        />
        <NativeTabs.Trigger.Label>Logs</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(journal)">
        <NativeTabs.Trigger.Icon
          sf={{ default: "book.closed", selected: "book.closed.fill" }}
          md="menu_book"
        />
        <NativeTabs.Trigger.Label>Journal</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
