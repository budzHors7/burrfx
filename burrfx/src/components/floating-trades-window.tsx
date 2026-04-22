import type { BubbleRendererProps } from "expo-draw-over-apps";
import {
  Pressable,
  Text,
  View,
  type ColorValue,
} from "react-native";

import {
  formatCurrency,
  formatSignedCurrency,
} from "@/lib/format";
import { getThemePalette } from "@/lib/theme";
import { useTradeOverlaySnapshot } from "@/lib/trade-overlay-store";

export function FloatingTradesWindow({
  bubbleId: _bubbleId,
}: BubbleRendererProps) {
  const {
    account,
    accentStyle,
    trades,
    resolvedThemeMode,
  } = useTradeOverlaySnapshot();
  const colors = getThemePalette(
    resolvedThemeMode,
    accentStyle
  );

  const currency = account?.currency ?? "USD";
  const floatingProfit =
    account?.profit ??
    trades.reduce((total, trade) => {
      return total + (trade.profit ?? 0);
    }, 0);
  const isProfitable = floatingProfit >= 0;
  const indicatorColor = isProfitable
    ? colors.accent
    : colors.danger;

  return (
    <View
      style={{
        width: 344,
        aspectRatio: 16 / 9,
        borderRadius: 24,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.panelMuted,
        padding: 12,
        gap: 12,
        boxShadow: colors.shadowLg,
      }}
    >
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          gap: 12,
        }}
      >
        <View
          style={{
            width: 74,
            borderRadius: 18,
            borderCurve: "continuous",
            backgroundColor: indicatorColor,
            paddingHorizontal: 10,
            paddingVertical: 12,
            justifyContent: "center",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Text
            selectable
            style={{
              color: colors.textOnAccent,
              fontSize: 26,
              fontWeight: "900",
              lineHeight: 28,
            }}
          >
            {isProfitable ? "\u2191" : "\u2193"}
          </Text>
          <Text
            selectable
            style={{
              color: colors.textOnAccent,
              fontSize: 10,
              fontWeight: "800",
              letterSpacing: 0.8,
              textTransform: "uppercase",
            }}
          >
            {isProfitable ? "Profit" : "Loss"}
          </Text>
          <Text
            selectable
            style={{
              color: colors.textOnAccent,
              fontSize: 11,
              fontWeight: "700",
            }}
          >
            {trades.length} open
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            gap: 10,
            borderRadius: 18,
            borderCurve: "continuous",
            backgroundColor: colors.panel,
            padding: 12,
            justifyContent: "space-between",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Text
              selectable
              style={{
                color: colors.text,
                fontSize: 14,
                fontWeight: "800",
              }}
            >
              Floating Account
            </Text>
            <Text
              selectable
              style={{
                color: colors.textDim,
                fontSize: 10,
                fontWeight: "700",
                letterSpacing: 0.7,
                textTransform: "uppercase",
              }}
            >
              Live
            </Text>
          </View>

          <View style={{ gap: 8 }}>
            <MetricRow
              colors={colors}
              items={[
                {
                  label: "Balance",
                  value: formatCurrency(account?.balance, currency),
                },
                {
                  label: "Equity",
                  value: formatCurrency(account?.equity, currency),
                },
              ]}
              textColor={colors.text}
            />
            <MetricRow
              colors={colors}
              items={[
                {
                  label: "Floating",
                  value: formatSignedCurrency(
                    floatingProfit,
                    currency
                  ),
                  valueColor: indicatorColor,
                },
                {
                  label: "Trades",
                  value: String(trades.length),
                },
              ]}
              textColor={colors.text}
            />
          </View>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: 8,
        }}
      >
        <OverlayButton
          label="Close Profit"
          tint={colors.accent}
          colors={colors}
        />
        <OverlayButton
          label="Close Losses"
          tint={colors.danger}
          colors={colors}
        />
        <OverlayButton
          label="Close All"
          tint={colors.warning}
          colors={colors}
        />
      </View>
    </View>
  );
}

function MetricRow({
  colors,
  items,
  textColor,
}: {
  colors: ReturnType<typeof getThemePalette>;
  items: Array<{
    label: string;
    value: string;
    valueColor?: ColorValue;
  }>;
  textColor: ColorValue;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 8,
      }}
    >
      {items.map((item) => (
        <View
          key={item.label}
          style={{
            flex: 1,
            gap: 4,
            borderRadius: 14,
            borderCurve: "continuous",
            backgroundColor: colors.surfaceRaised,
            paddingHorizontal: 10,
            paddingVertical: 8,
          }}
        >
          <Text
            selectable
            style={{
              color: colors.textDim,
              fontSize: 10,
              fontWeight: "700",
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            {item.label}
          </Text>
          <Text
            selectable
            numberOfLines={1}
            style={{
              color: item.valueColor ?? textColor,
              fontSize: 12,
              fontWeight: "800",
            }}
          >
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function OverlayButton({
  label,
  tint,
  colors,
}: {
  label: string;
  tint: ColorValue;
  colors: ReturnType<typeof getThemePalette>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        return;
      }}
      style={{
        flex: 1,
        minHeight: 38,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 14,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: tint,
        backgroundColor: colors.surfaceRaised,
        paddingHorizontal: 8,
      }}
    >
      <Text
        selectable
        style={{
          color: tint,
          fontSize: 11,
          fontWeight: "800",
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
