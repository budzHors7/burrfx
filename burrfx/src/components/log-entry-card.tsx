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
      style={{
        gap: 12,
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
        <View style={{ flex: 1, gap: 6 }}>
          <Text
            selectable
            style={{
              color: colors.text,
              fontSize: 18,
              fontWeight: "800",
            }}
          >
            {entry.event}
          </Text>
          <Text
            selectable
            style={{
              color: colors.textDim,
              fontSize: 12,
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            {formatTimestamp(entry.timestamp)}{entry.source ? `  •  ${entry.source.split("\\").pop()}` : ""}
          </Text>
        </View>
        <StatusPill
          label={entry.level}
          tone={getTone(entry.level)}
        />
      </View>

      <Text
        selectable
        style={{
          color: colors.textMuted,
          fontSize: 14,
          lineHeight: 20,
        }}
      >
        {entry.message}
      </Text>

      {contextText ? (
        <View
          style={{
            borderRadius: 18,
            borderCurve: "continuous",
            backgroundColor: colors.surfaceRaised,
            padding: 12,
          }}
        >
          <Text
            selectable
            style={{
              color: colors.text,
              fontSize: 12,
              lineHeight: 18,
              fontFamily: "monospace",
            }}
          >
            {contextText}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
