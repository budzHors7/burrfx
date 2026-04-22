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
      <View style={{ gap: 18 }}>
        <PageHeading
          accessory={
            <View style={{ minWidth: 112 }}>
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
          style={{
            gap: 16,
            borderRadius: 30,
            borderCurve: "continuous",
            backgroundColor: colors.surface,
            padding: 20,
            boxShadow: colors.shadowLg,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <View style={{ flex: 1, gap: 6 }}>
              <Text
                selectable
                style={{
                  color: colors.text,
                  fontSize: 22,
                  fontWeight: "800",
                }}
              >
                Exposure overview
              </Text>
              <Text
                selectable
                style={{
                  color: colors.textMuted,
                  fontSize: 14,
                  lineHeight: 20,
                }}
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

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
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
              style={{
                gap: 10,
                borderTopWidth: 1,
                borderTopColor: colors.borderSoft,
                paddingTop: 14,
              }}
            >
              <Text
                selectable
                style={{
                  color: colors.text,
                  fontSize: 18,
                  fontWeight: "800",
                }}
              >
                Floating window
              </Text>
              <Text
                selectable
                style={{
                  color: colors.textMuted,
                  fontSize: 13,
                  lineHeight: 18,
                }}
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
            style={{
              gap: 10,
              borderRadius: 28,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: colors.borderSoft,
              backgroundColor: colors.panel,
              padding: 22,
              boxShadow: colors.shadowMd,
            }}
          >
            <Text
              selectable
              style={{
                color: colors.text,
                fontSize: 20,
                fontWeight: "800",
              }}
            >
              No open trades right now
            </Text>
            <Text
              selectable
              style={{
                color: colors.textMuted,
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              When the MT5 session opens positions, they will appear here with
              current pricing, stop loss, take profit, and floating PnL.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            <Text
              selectable
              style={{
                color: colors.text,
                fontSize: 20,
                fontWeight: "800",
              }}
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
