import { ScrollView, Text, View } from "react-native";

import { ActionButton } from "@/components/action-button";
import { MetricCard } from "@/components/metric-card";
import { TradeCard } from "@/components/trade-card";
import { useAppSession } from "@/hooks/use-app-session";
import { formatCurrency } from "@/lib/format";
import { palette } from "@/lib/theme";

export default function TradesScreen() {
  const {
    account,
    trades,
    isRefreshing,
    refreshAll,
  } = useAppSession();

  const currency = account?.currency ?? "USD";

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 18,
        paddingTop: 20,
        paddingBottom: 36,
        gap: 18,
        backgroundColor: palette.background,
      }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={{ gap: 18 }}>
        <View
          style={{
            gap: 16,
            borderRadius: 30,
            borderCurve: "continuous",
            backgroundColor: palette.surface,
            padding: 20,
            boxShadow: "0 24px 52px rgba(2, 12, 22, 0.28)",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <View style={{ flex: 1, gap: 10 }}>
              <Text
                selectable
                style={{
                  color: palette.textDim,
                  fontSize: 13,
                  fontWeight: "700",
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                }}
              >
                Open trades
              </Text>
              <Text
                selectable
                style={{
                  color: palette.text,
                  fontSize: 28,
                  lineHeight: 32,
                  fontWeight: "900",
                }}
              >
                Live positions and account exposure.
              </Text>
              <Text
                selectable
                style={{
                  color: palette.textMuted,
                  fontSize: 15,
                  lineHeight: 22,
                }}
              >
                Everything here is driven by the server MT5 session, so this
                screen mirrors what the API currently sees on the trading box.
              </Text>
            </View>
            <View style={{ minWidth: 116 }}>
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
              accent={palette.success}
            />
            <MetricCard
              label="Margin"
              value={formatCurrency(account?.margin, currency)}
              accent={palette.warning}
            />
            <MetricCard
              label="Free Margin"
              value={formatCurrency(account?.free_margin, currency)}
              accent={palette.accent}
            />
          </View>
        </View>

        {trades.length === 0 ? (
          <View
            style={{
              gap: 10,
              borderRadius: 28,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: palette.borderSoft,
              backgroundColor: "rgba(11, 32, 50, 0.92)",
              padding: 22,
              boxShadow: "0 18px 42px rgba(2, 12, 22, 0.2)",
            }}
          >
            <Text
              selectable
              style={{
                color: palette.text,
                fontSize: 20,
                fontWeight: "800",
              }}
            >
              No open trades right now
            </Text>
            <Text
              selectable
              style={{
                color: palette.textMuted,
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              When the MT5 session opens positions, they will appear here with
              pricing, stop loss, take profit, and floating PnL.
            </Text>
          </View>
        ) : (
          trades.map((trade) => (
            <TradeCard
              key={trade.ticket}
              trade={trade}
              currency={currency}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}
