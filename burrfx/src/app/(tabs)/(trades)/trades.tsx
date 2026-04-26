import {
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { ActionButton } from "@/components/action-button";
import { DrawOverlayPermissionModal } from "@/components/draw-overlay-permission-modal";
import { MetricCard } from "@/components/metric-card";
import { PageHeading } from "@/components/page-heading";
import { StatusPill } from "@/components/status-pill";
import { TradeCard } from "@/components/trade-card";
import { useAppSession } from "@/hooks/use-app-session";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useTradeOverlay } from "@/hooks/use-trade-overlay";
import {
  formatCurrency,
  formatSignedCurrency,
} from "@/lib/format";

export default function TradesScreen() {
  const { colors } = useAppTheme();
  const { height } = useWindowDimensions();
  const {
    account,
    trades,
    isRefreshing,
    refreshAll,
  } = useAppSession();
  const {
    hasTradeOverlayPermission,
    isTradeOverlayVisible,
    isTradeOverlayPermissionModalVisible,
    toggleTradeOverlay,
    openTradeOverlayPermissionSettings,
    dismissTradeOverlayPermissionModal,
  } = useTradeOverlay();

  const currency = account?.currency ?? "USD";
  const showOverlayControls =
    process.env.EXPO_OS === "android";
  const floatingProfit =
    account?.profit ??
    trades.reduce((total, trade) => {
      return total + (trade.profit ?? 0);
    }, 0);

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        minHeight: height,
        paddingHorizontal: 18,
        paddingTop: 24,
        paddingBottom: 36,
        gap: 18,
        backgroundColor: colors.background,
      }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View className="gap-[18px]">
        <PageHeading
          accessory={
            <View className="min-w-[112px]">
              <ActionButton
                label="Refresh"
                variant="secondary"
                loading={isRefreshing}
                onPress={() => {
                  void refreshAll().catch(() => {
                    return;
                  });
                }}
              />
            </View>
          }
          description="Review every open position, watch live exposure, and keep the floating trade bubble available on Android."
          eyebrow="Authenticated"
          title="Trades"
        />

        <View
          className="gap-4 rounded-[30px] p-5"
          style={{
            borderCurve: "continuous",
            backgroundColor: colors.surface,
            boxShadow: colors.shadowLg,
          }}
        >
          <View className="flex-row flex-wrap items-center justify-between gap-3">
            <View className="flex-1 gap-1.5">
              <Text
                className="text-[22px] font-extrabold"
                selectable
                style={{ color: colors.text }}
              >
                Exposure overview
              </Text>
              <Text
                className="text-[14px] leading-5"
                selectable
                style={{ color: colors.textMuted }}
              >
                This screen mirrors the current MT5 positions that the BurrFx
                API sees on the connected Windows host.
              </Text>
            </View>
            <StatusPill
              label={
                trades.length === 0
                  ? "Flat"
                  : `${trades.length} Open`
              }
              tone={
                trades.length === 0
                  ? "neutral"
                  : floatingProfit >= 0
                    ? "positive"
                    : "negative"
              }
            />
          </View>

          <View className="flex-row flex-wrap gap-3">
            <MetricCard
              label="Balance"
              value={formatCurrency(account?.balance, currency)}
            />
            <MetricCard
              label="Equity"
              value={formatCurrency(account?.equity, currency)}
              accent={colors.success}
            />
            <MetricCard
              label="Floating PnL"
              value={formatSignedCurrency(floatingProfit, currency)}
              accent={
                floatingProfit >= 0
                  ? colors.success
                  : colors.danger
              }
            />
            <MetricCard
              label="Free Margin"
              value={formatCurrency(account?.free_margin, currency)}
              accent={colors.accent}
            />
          </View>

          {showOverlayControls ? (
            <View
              className="gap-2.5 pt-[14px]"
              style={{
                borderTopWidth: 1,
                borderTopColor: colors.borderSoft,
              }}
            >
              <Text
                className="text-[18px] font-extrabold"
                selectable
                style={{ color: colors.text }}
              >
                Floating window
              </Text>
              <Text
                className="text-[13px] leading-[18px]"
                selectable
                style={{ color: colors.textMuted }}
              >
                Show the shorter trade bubble over other apps so balance,
                equity, and quick close actions stay visible while you multitask
                on Android.
              </Text>
              <ActionButton
                label={
                  isTradeOverlayVisible
                    ? "Hide Floating Window"
                    : hasTradeOverlayPermission
                      ? "Show Floating Window"
                      : "Allow Floating Window"
                }
                variant="secondary"
                onPress={() => {
                  void toggleTradeOverlay().catch(() => {
                    return;
                  });
                }}
              />
            </View>
          ) : null}
        </View>

        {trades.length === 0 ? (
          <View
            className="gap-2.5 rounded-[28px] border p-[22px]"
            style={{
              borderCurve: "continuous",
              borderColor: colors.borderSoft,
              backgroundColor: colors.panel,
              boxShadow: colors.shadowMd,
            }}
          >
            <Text
              className="text-[20px] font-extrabold"
              selectable
              style={{ color: colors.text }}
            >
              No open trades right now
            </Text>
            <Text
              className="text-[15px] leading-[22px]"
              selectable
              style={{ color: colors.textMuted }}
            >
              When the MT5 session opens positions, they will appear here with
              current pricing, stop loss, take profit, and floating PnL.
            </Text>
          </View>
        ) : (
          <View className="gap-[14px]">
            <Text
              className="text-[20px] font-extrabold"
              selectable
              style={{ color: colors.text }}
            >
              Open positions
            </Text>
            {trades.map((trade) => (
              <TradeCard
                key={trade.ticket}
                trade={trade}
                currency={currency}
              />
            ))}
          </View>
        )}
      </View>
      <DrawOverlayPermissionModal
        visible={isTradeOverlayPermissionModalVisible}
        onAllow={() => {
          void openTradeOverlayPermissionSettings().catch(() => {
            return;
          });
        }}
        onCancel={dismissTradeOverlayPermissionModal}
      />
    </ScrollView>
  );
}
