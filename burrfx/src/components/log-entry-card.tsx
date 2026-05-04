import { Text, View } from "react-native";

import { StatusPill } from "@/components/status-pill";
import { useAppTheme } from "@/hooks/use-app-theme";
import { formatTimestamp } from "@/lib/format";
import type { AccountLogEntry } from "@/types/api";

type LogEntryCardProps = {
  entry: AccountLogEntry;
};

function getTone(level: string) {
  if (level === "ERROR" || level === "CRITICAL") {
    return "negative" as const;
  }

  if (level === "WARNING" || level === "WARN") {
    return "warning" as const;
  }

  if (level === "DEBUG") {
    return "neutral" as const;
  }

  return "positive" as const;
}

export function LogEntryCard({
  entry,
}: LogEntryCardProps) {
  const { colors } = useAppTheme();
  const contextText =
    entry.context && Object.keys(entry.context).length > 0
      ? JSON.stringify(entry.context)
      : null;

  return (
    <View
      className="gap-3 rounded-[24px] border p-[18px]"
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
            {entry.event}
          </Text>
          <Text
            className="text-[12px] font-semibold uppercase tracking-[0.4px]"
            selectable
            style={{
              color: colors.textDim,
            }}
          >
            {formatTimestamp(entry.timestamp)}
            {entry.source
              ? ` | ${entry.source.split("\\").pop()}`
              : ""}
          </Text>
        </View>
        <StatusPill
          label={entry.level}
          tone={getTone(entry.level)}
        />
      </View>

      <Text
        className="text-[14px] leading-5"
        selectable
        style={{
          color: colors.textMuted,
        }}
      >
        {entry.message}
      </Text>

      {contextText ? (
        <View
          className="rounded-[18px] p-3"
          style={{
            borderCurve: "continuous",
            backgroundColor: colors.surfaceRaised,
          }}
        >
          <Text
            className="font-mono text-[12px] leading-[18px]"
            selectable
            style={{
              color: colors.text,
            }}
          >
            {contextText}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
