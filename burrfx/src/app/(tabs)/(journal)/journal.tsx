import { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { ActionButton } from "@/components/action-button";
import { JournalEntryCard } from "@/components/journal-entry-card";
import { PageHeading } from "@/components/page-heading";
import { StatusPill } from "@/components/status-pill";
import { useAppSession } from "@/hooks/use-app-session";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  getAccountJournalEntries,
  type AccountJournalEntry,
} from "@/lib/account-journal";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to read the local BurrFx journal right now.";
}

export default function JournalScreen() {
  const { colors } = useAppTheme();
  const { height } = useWindowDimensions();
  const {
    account,
    journalRevision,
    isRefreshing,
    refreshAll,
  } = useAppSession();
  const [entries, setEntries] = useState<AccountJournalEntry[]>([]);
  const [isJournalLoading, setIsJournalLoading] =
    useState(true);
  const [journalError, setJournalError] = useState<string | null>(
    null
  );

  const loadJournal = useCallback(async () => {
    setIsJournalLoading(true);
    setJournalError(null);

    try {
      const nextEntries =
        await getAccountJournalEntries({
          accountLogin: account?.login ?? null,
          server: account?.server ?? null,
          limit: 120,
        });

      setEntries(nextEntries);
    } catch (error) {
      setJournalError(getErrorMessage(error));
    } finally {
      setIsJournalLoading(false);
    }
  }, [account?.login, account?.server]);

  useEffect(() => {
    void loadJournal();
  }, [journalRevision, loadJournal]);

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
                label="Sync"
                variant="secondary"
                loading={isRefreshing || isJournalLoading}
                onPress={() => {
                  void refreshAll()
                    .catch(() => {
                      return;
                    })
                    .finally(() => {
                      void loadJournal();
                    });
                }}
              />
            </View>
          }
          description="Track local SQLite snapshots of the account while BurrFx is trading so you can review progress over time."
          eyebrow="Local History"
          title="Journal"
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
                Snapshot history
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
                  ? `Showing local account history for #${account.login} on ${account.server}.`
                  : "Showing the locally stored BurrFx trading history."}
              </Text>
            </View>
            <StatusPill
              label={`${entries.length} Records`}
              tone={entries.length > 0 ? "positive" : "neutral"}
            />
          </View>
        </View>

        {journalError ? (
          <View
            style={{
              gap: 8,
              borderRadius: 22,
              borderCurve: "continuous",
              backgroundColor: colors.errorBackground,
              padding: 18,
            }}
          >
            <Text
              selectable
              style={{
                color: colors.danger,
                fontSize: 13,
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              Journal error
            </Text>
            <Text
              selectable
              style={{
                color: colors.text,
                fontSize: 14,
                lineHeight: 20,
              }}
            >
              {journalError}
            </Text>
          </View>
        ) : null}

        {!isJournalLoading && entries.length === 0 ? (
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
              No journal entries yet
            </Text>
            <Text
              selectable
              style={{
                color: colors.textMuted,
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              The local journal starts recording snapshots while the bot is
              running or there are open trades to track.
            </Text>
          </View>
        ) : null}

        {entries.map((entry) => (
          <JournalEntryCard
            key={entry.id}
            entry={entry}
          />
        ))}
      </View>
    </ScrollView>
  );
}
