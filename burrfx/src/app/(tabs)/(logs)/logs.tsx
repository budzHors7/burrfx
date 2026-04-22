import {
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { ActionButton } from "@/components/action-button";
import { LogEntryCard } from "@/components/log-entry-card";
import { PageHeading } from "@/components/page-heading";
import { StatusPill } from "@/components/status-pill";
import { useAppSession } from "@/hooks/use-app-session";
import { useAppTheme } from "@/hooks/use-app-theme";

export default function LogsScreen() {
  const { colors } = useAppTheme();
  const { height } = useWindowDimensions();
  const {
    account,
    logs,
    logSourceFile,
    isRefreshing,
    refreshAll,
  } = useAppSession();

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
          description="Read the latest server-side account and bot events coming from the BurrFx backend session."
          eyebrow="Server Feed"
          title="Logs"
        />

        <View
          style={{
            gap: 14,
            borderRadius: 28,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: colors.borderSoft,
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
            <View style={{ gap: 6, flex: 1 }}>
              <Text
                selectable
                style={{
                  color: colors.text,
                  fontSize: 22,
                  fontWeight: "800",
                }}
              >
                Active server stream
              </Text>
              <Text
                selectable
                style={{
                  color: colors.textMuted,
                  fontSize: 14,
                  lineHeight: 20,
                }}
              >
                {account
                  ? `Showing log events for account #${account.login} on ${account.server}.`
                  : "Showing the latest BurrFx server log stream."}
              </Text>
            </View>
            <StatusPill
              label={`${logs.length} Entries`}
              tone={logs.length > 0 ? "positive" : "neutral"}
            />
          </View>

          <View
            style={{
              borderRadius: 18,
              borderCurve: "continuous",
              backgroundColor: colors.surfaceRaised,
              padding: 14,
              gap: 6,
            }}
          >
            <Text
              selectable
              style={{
                color: colors.textDim,
                fontSize: 12,
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              Source file
            </Text>
            <Text
              selectable
              style={{
                color: colors.text,
                fontSize: 13,
                lineHeight: 19,
              }}
            >
              {logSourceFile ?? "Current session log unavailable"}
            </Text>
          </View>
        </View>

        {logs.length === 0 ? (
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
              No server logs yet
            </Text>
            <Text
              selectable
              style={{
                color: colors.textMuted,
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              Once the server emits account or bot activity for this session,
              the latest lines will appear here.
            </Text>
          </View>
        ) : (
          logs.map((entry, index) => (
            <LogEntryCard
              key={`${entry.timestamp ?? "log"}-${entry.event}-${index}`}
              entry={entry}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}
