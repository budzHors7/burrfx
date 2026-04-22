import {
  Text,
  View,
  type ColorValue,
} from "react-native";

import { StatusPill } from "@/components/status-pill";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  formatCurrency,
  formatSignedCurrency,
  formatTimestamp,
} from "@/lib/format";
import type { AccountJournalEntry } from "@/lib/account-journal";

type JournalEntryCardProps = {
  entry: AccountJournalEntry;
};

export function JournalEntryCard({
  entry,
}: JournalEntryCardProps) {
  const { colors } = useAppTheme();
  const pnlTone =
    entry.profit > 0
      ? "positive"
      : entry.profit < 0
        ? "negative"
        : "neutral";

  return (
    <View
      style={{
        gap: 14,
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
              color: colors.text,
              fontSize: 18,
              fontWeight: "800",
            }}
          >
            {formatTimestamp(entry.recorded_at)}
          </Text>
          <Text
            selectable
            style={{
              color: colors.textMuted,
              fontSize: 13,
            }}
          >
            Account #{entry.account_login} • {entry.server}
          </Text>
        </View>
        <StatusPill
          label={entry.bot_state ?? "Tracking"}
          tone={pnlTone}
        />
      </View>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <JournalMetric
          label="Balance"
          value={formatCurrency(entry.balance, entry.currency ?? "USD")}
        />
        <JournalMetric
          label="Equity"
          value={formatCurrency(entry.equity, entry.currency ?? "USD")}
        />
        <JournalMetric
          label="Floating"
          value={formatSignedCurrency(entry.profit, entry.currency ?? "USD")}
          valueColor={
            entry.profit >= 0
              ? colors.success
              : colors.danger
          }
        />
        <JournalMetric
          label="Open Trades"
          value={String(entry.open_trades_count)}
        />
      </View>
    </View>
  );
}

function JournalMetric({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: ColorValue;
}) {
  const { colors } = useAppTheme();

  return (
    <View
      style={{
        minWidth: "47%",
        flexGrow: 1,
        gap: 4,
        borderRadius: 16,
        borderCurve: "continuous",
        backgroundColor: colors.surfaceRaised,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <Text
        selectable
        style={{
          color: colors.textDim,
          fontSize: 11,
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
      <Text
        selectable
        style={{
          color: valueColor ?? colors.text,
          fontSize: 14,
          fontWeight: "800",
        }}
      >
        {value}
      </Text>
    </View>
  );
}
