import { Text, View } from "react-native";

import { formatPrice, formatSignedCurrency, formatTimestamp } from "@/lib/format";
import { palette } from "@/lib/theme";
import type { OpenTradeItem } from "@/types/api";
import { StatusPill } from "@/components/status-pill";

type TradeCardProps = {
  trade: OpenTradeItem;
  currency: string;
};

export function TradeCard({
  trade,
  currency,
}: TradeCardProps) {
  const pnl = trade.profit ?? 0;
  const tone =
    pnl > 0 ? "positive" : pnl < 0 ? "negative" : "neutral";

  return (
    <View
      style={{
        gap: 16,
        borderRadius: 26,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: "rgba(11, 32, 50, 0.92)",
        padding: 18,
        boxShadow: "0 16px 36px rgba(2, 12, 22, 0.22)",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <View style={{ gap: 6, flex: 1 }}>
          <Text
            selectable
            style={{
              color: palette.text,
              fontSize: 22,
              fontWeight: "800",
              letterSpacing: 0.3,
            }}
          >
            {trade.symbol}
          </Text>
          <Text
            selectable
            style={{
              color: palette.textMuted,
              fontSize: 14,
              fontWeight: "600",
            }}
          >
            Ticket #{trade.ticket} · {trade.volume.toFixed(2)} lot
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 8 }}>
          <StatusPill
            label={trade.side}
            tone={trade.side === "BUY" ? "positive" : "warning"}
          />
          {trade.is_bot_trade ? (
            <StatusPill label="Bot Trade" tone="neutral" />
          ) : null}
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
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
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          borderTopWidth: 1,
          borderTopColor: palette.borderSoft,
          paddingTop: 14,
        }}
      >
        <View style={{ gap: 4 }}>
          <Text
            selectable
            style={{
              color: palette.textDim,
              fontSize: 12,
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            Opened
          </Text>
          <Text
            selectable
            style={{
              color: palette.text,
              fontSize: 15,
              fontWeight: "600",
            }}
          >
            {formatTimestamp(trade.opened_at)}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Text
            selectable
            style={{
              color: palette.textDim,
              fontSize: 12,
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            Floating PnL
          </Text>
          <Text
            selectable
            style={{
              color:
                tone === "positive"
                  ? palette.success
                  : tone === "negative"
                    ? palette.danger
                    : palette.text,
              fontSize: 18,
              fontWeight: "800",
              fontVariant: ["tabular-nums"],
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
  return (
    <View
      style={{
        minWidth: "46%",
        flexGrow: 1,
        gap: 4,
      }}
    >
      <Text
        selectable
        style={{
          color: palette.textDim,
          fontSize: 12,
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
          fontSize: 16,
          fontWeight: "700",
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
      </Text>
    </View>
  );
}
