import { Text, View } from "react-native";

import { StatusPill } from "@/components/status-pill";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  formatPrice,
  formatSignedCurrency,
  formatTimestamp,
} from "@/lib/format";
import type { OpenTradeItem } from "@/types/api";

type TradeCardProps = {
  trade: OpenTradeItem;
  currency: string;
};

export function TradeCard({
  trade,
  currency,
}: TradeCardProps) {
  const { colors } = useAppTheme();
  const pnl = trade.profit ?? 0;
  const tone =
    pnl > 0 ? "positive" : pnl < 0 ? "negative" : "neutral";

  return (
    <View
      className="gap-4 rounded-[26px] border p-[18px]"
      style={{
        borderCurve: "continuous",
        borderColor: colors.borderSoft,
        backgroundColor: colors.panel,
        boxShadow: colors.shadowMd,
      }}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1.5">
          <Text
            className="text-[22px] font-extrabold tracking-[0.3px]"
            selectable
            style={{
              color: colors.text,
            }}
          >
            {trade.symbol}
          </Text>
          <Text
            className="text-[14px] font-semibold"
            selectable
            style={{
              color: colors.textMuted,
            }}
          >
            Ticket #{trade.ticket} - {trade.volume.toFixed(2)} lot
          </Text>
        </View>
        <View className="items-end gap-2">
          <StatusPill
            label={trade.side}
            tone={trade.side === "BUY" ? "positive" : "warning"}
          />
          {trade.is_bot_trade ? (
            <StatusPill label="Bot Trade" tone="neutral" />
          ) : null}
        </View>
      </View>

      <View className="flex-row flex-wrap gap-3">
        <TradeMetric label="Open" value={formatPrice(trade.price_open)} />
        <TradeMetric
          label="Current"
          value={formatPrice(trade.price_current)}
        />
        <TradeMetric
          label="Stop Loss"
          value={formatPrice(trade.stop_loss)}
        />
        <TradeMetric
          label="Take Profit"
          value={formatPrice(trade.take_profit)}
        />
      </View>

      <View
        className="flex-row items-center justify-between gap-3 pt-[14px]"
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.borderSoft,
        }}
      >
        <View className="gap-1">
          <Text
            className="text-[12px] font-semibold uppercase tracking-[0.4px]"
            selectable
            style={{
              color: colors.textDim,
            }}
          >
            Opened
          </Text>
          <Text
            className="text-[15px] font-semibold"
            selectable
            style={{
              color: colors.text,
            }}
          >
            {formatTimestamp(trade.opened_at)}
          </Text>
        </View>
        <View className="items-end gap-1">
          <Text
            className="text-[12px] font-semibold uppercase tracking-[0.4px]"
            selectable
            style={{
              color: colors.textDim,
            }}
          >
            Floating PnL
          </Text>
          <Text
            className="text-[18px] font-extrabold tabular-nums"
            selectable
            style={{
              color:
                tone === "positive"
                  ? colors.success
                  : tone === "negative"
                    ? colors.danger
                    : colors.text,
            }}
          >
            {formatSignedCurrency(trade.profit, currency)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function TradeMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const { colors } = useAppTheme();

  return (
    <View className="min-w-[46%] flex-1 gap-1">
      <Text
        className="text-[12px] font-semibold uppercase tracking-[0.4px]"
        selectable
        style={{
          color: colors.textDim,
        }}
      >
        {label}
      </Text>
      <Text
        className="text-[16px] font-bold tabular-nums"
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
