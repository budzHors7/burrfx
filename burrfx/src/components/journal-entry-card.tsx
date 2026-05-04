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
      className="gap-[14px] rounded-[24px] border p-[18px]"
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
            className="text-[18px] font-extrabold"
            selectable
            style={{
              color: colors.text,
            }}
          >
            {formatTimestamp(entry.recorded_at)}
          </Text>
          <Text
            className="text-[13px]"
            selectable
            style={{
              color: colors.textMuted,
            }}
          >
            Account #{entry.account_login} | {entry.server}
          </Text>
        </View>
        <StatusPill
          label={entry.bot_state ?? "Tracking"}
          tone={pnlTone}
        />
      </View>

      <View className="flex-row flex-wrap gap-2.5">
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
      className="min-w-[47%] flex-1 gap-1 rounded-[16px] px-3 py-2.5"
      style={{
        borderCurve: "continuous",
        backgroundColor: colors.surfaceRaised,
      }}
    >
      <Text
        className="text-[11px] font-bold uppercase tracking-[0.5px]"
        selectable
        style={{
          color: colors.textDim,
        }}
      >
        {label}
      </Text>
      <Text
        className="text-[14px] font-extrabold"
        selectable
        style={{
          color: valueColor ?? colors.text,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
