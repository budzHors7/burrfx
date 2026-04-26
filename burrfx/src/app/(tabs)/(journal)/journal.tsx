import { LegendList } from "@legendapp/list";
import { useFocusEffect } from "expo-router";
import {
  startTransition,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  InteractionManager,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { ActionButton } from "@/components/action-button";
import {
  FilterPills,
  type FilterOption,
} from "@/components/filter-pills";
import { JournalEntryCard } from "@/components/journal-entry-card";
import { JournalEntrySkeleton } from "@/components/journal-entry-skeleton";
import { PageHeading } from "@/components/page-heading";
import { StatusPill } from "@/components/status-pill";
import { useAppSession } from "@/hooks/use-app-session";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  getAccountJournalPage,
  type AccountJournalEntry,
} from "@/lib/account-journal";

const JOURNAL_PAGE_SIZE = 30;
const JOURNAL_SKELETON_IDS = [
  "journal-skeleton-1",
  "journal-skeleton-2",
  "journal-skeleton-3",
];

type JournalFilter = "all" | "profit" | "loss" | "flat";

const JOURNAL_FILTER_OPTIONS: readonly FilterOption<JournalFilter>[] = [
  { label: "All", value: "all" },
  { label: "Profit", value: "profit" },
  { label: "Loss", value: "loss" },
  { label: "Flat", value: "flat" },
];

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to read the local BurrFx journal right now.";
}

function matchesJournalFilter(
  entry: AccountJournalEntry,
  filter: JournalFilter
) {
  if (filter === "profit") {
    return entry.profit > 0;
  }

  if (filter === "loss") {
    return entry.profit < 0;
  }

  if (filter === "flat") {
    return entry.profit === 0;
  }

  return true;
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
  const [selectedFilter, setSelectedFilter] =
    useState<JournalFilter>("all");
  const [journalTotal, setJournalTotal] =
    useState(0);
  const [hasMoreJournal, setHasMoreJournal] =
    useState(false);
  const [isJournalLoading, setIsJournalLoading] =
    useState(false);
  const [isLoadingMoreJournal, setIsLoadingMoreJournal] =
    useState(false);
  const [hasLoadedJournal, setHasLoadedJournal] =
    useState(false);
  const [journalError, setJournalError] = useState<string | null>(
    null
  );

  const accountKey = account
    ? `${account.login}:${account.server}`
    : "no-account";

  const filteredEntries = entries.filter((entry) =>
    matchesJournalFilter(entry, selectedFilter)
  );

  useEffect(() => {
    startTransition(() => {
      setEntries([]);
      setSelectedFilter("all");
      setJournalTotal(0);
      setHasMoreJournal(false);
      setHasLoadedJournal(false);
      setJournalError(null);
    });
  }, [accountKey]);

  const loadJournal = useCallback(
    async (options?: { reset?: boolean }) => {
      const reset = options?.reset ?? false;

      if (
        !reset &&
        (isJournalLoading ||
          isLoadingMoreJournal ||
          (!hasMoreJournal && hasLoadedJournal))
      ) {
        return;
      }

      const nextOffset = reset ? 0 : entries.length;

      if (reset || !hasLoadedJournal) {
        setIsJournalLoading(true);
      } else {
        setIsLoadingMoreJournal(true);
      }

      setJournalError(null);

      try {
        const nextPage = await getAccountJournalPage({
          accountLogin: account?.login ?? null,
          server: account?.server ?? null,
          limit: JOURNAL_PAGE_SIZE,
          offset: nextOffset,
        });

        startTransition(() => {
          setEntries((currentEntries) =>
            reset
              ? nextPage.entries
              : [...currentEntries, ...nextPage.entries]
          );
          setJournalTotal(nextPage.total);
          setHasMoreJournal(nextPage.hasMore);
          setHasLoadedJournal(true);
        });
      } catch (error) {
        setJournalError(getErrorMessage(error));

        startTransition(() => {
          if (!hasLoadedJournal || reset) {
            setEntries([]);
            setJournalTotal(0);
            setHasMoreJournal(false);
          }
        });
      } finally {
        setIsJournalLoading(false);
        setIsLoadingMoreJournal(false);
      }
    },
    [
      account?.login,
      account?.server,
      entries.length,
      hasLoadedJournal,
      hasMoreJournal,
      isJournalLoading,
      isLoadingMoreJournal,
    ]
  );

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(
        () => {
          void loadJournal({ reset: true });
        }
      );

      return () => {
        task.cancel();
      };
    }, [journalRevision, loadJournal])
  );

  const showSkeletons =
    !hasLoadedJournal && isJournalLoading;
  const data: Array<AccountJournalEntry | string> =
    showSkeletons ? JOURNAL_SKELETON_IDS : filteredEntries;

  return (
    <LegendList
      contentContainerStyle={{
        minHeight: height,
        paddingHorizontal: 18,
        paddingTop: 24,
        paddingBottom: 36,
        backgroundColor: colors.background,
      }}
      contentInsetAdjustmentBehavior="automatic"
      data={data}
      estimatedItemSize={196}
      ItemSeparatorComponent={() => <View className="h-[14px]" />}
      keyExtractor={(item) => {
        if (typeof item === "string") {
          return item;
        }

        return String(item.id);
      }}
      ListEmptyComponent={
        !showSkeletons ? (
          <View
            className="gap-2.5 rounded-[28px] border p-[22px]"
            style={{
              borderCurve: "continuous",
              borderColor: colors.borderSoft,
              backgroundColor:
                entries.length > 0
                  ? colors.surface
                  : colors.panel,
              boxShadow: colors.shadowMd,
            }}
          >
            <Text
              className="text-[20px] font-extrabold"
              selectable
              style={{ color: colors.text }}
            >
              {entries.length > 0
                ? "No matching journal entries in this loaded range"
                : "No journal entries yet"}
            </Text>
            <Text
              className="text-[15px] leading-[22px]"
              selectable
              style={{ color: colors.textMuted }}
            >
              {entries.length > 0
                ? "Try another filter or load older journal entries to widen the range."
                : "The local journal starts recording snapshots while the bot is running or there are open trades to track."}
            </Text>
          </View>
        ) : null
      }
      ListFooterComponent={
        !showSkeletons ? (
          <View className="gap-3 pt-[18px]">
            {hasMoreJournal ? (
              <ActionButton
                label="Load Older Entries"
                loading={isLoadingMoreJournal}
                variant="secondary"
                onPress={() => {
                  void loadJournal();
                }}
              />
            ) : entries.length > 0 ? (
              <Text
                className="text-center text-[12px] leading-[18px]"
                selectable
                style={{ color: colors.textDim }}
              >
                Showing {entries.length} of {journalTotal} journal entries.
              </Text>
            ) : null}
          </View>
        ) : null
      }
      ListHeaderComponent={
        <View className="mb-[18px] gap-[18px]">
          <PageHeading
            accessory={
              <View className="min-w-[112px]">
                <ActionButton
                  label="Sync"
                  variant="secondary"
                  loading={
                    isRefreshing || isJournalLoading
                  }
                  onPress={() => {
                    void refreshAll()
                      .catch(() => {
                        return;
                      })
                      .finally(() => {
                        void loadJournal({ reset: true });
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
            className="gap-[14px] rounded-[28px] border p-5"
            style={{
              borderCurve: "continuous",
              borderColor: colors.borderSoft,
              backgroundColor: colors.surface,
              boxShadow: colors.shadowLg,
            }}
          >
            <View className="flex-row flex-wrap items-center justify-between gap-3">
              <View className="flex-1 gap-1.5">
                <Text
                  className="text-[22px] font-extrabold"
                  selectable
                  style={{ color: colors.text }}
                >
                  Snapshot history
                </Text>
                <Text
                  className="text-[14px] leading-5"
                  selectable
                  style={{ color: colors.textMuted }}
                >
                  {account
                    ? `Showing local account history for #${account.login} on ${account.server}.`
                    : "Showing the locally stored BurrFx trading history."}
                </Text>
              </View>
              <StatusPill
                label={
                  showSkeletons
                    ? "Loading"
                    : `${filteredEntries.length} Visible`
                }
                tone={
                  filteredEntries.length > 0
                    ? "positive"
                    : "neutral"
                }
              />
            </View>

            <FilterPills
              disabled={showSkeletons}
              onChange={setSelectedFilter}
              options={JOURNAL_FILTER_OPTIONS}
              value={selectedFilter}
            />

            <Text
              className="text-[12px] leading-[18px]"
              selectable
              style={{ color: colors.textDim }}
            >
              Loaded {entries.length} of {journalTotal} journal entries.
            </Text>
          </View>

          {journalError ? (
            <View
              className="gap-2 rounded-[22px] p-[18px]"
              style={{
                borderCurve: "continuous",
                backgroundColor: colors.errorBackground,
              }}
            >
              <Text
                className="text-[13px] font-bold uppercase tracking-[0.4px]"
                selectable
                style={{
                  color: colors.danger,
                }}
              >
                Journal error
              </Text>
              <Text
                className="text-[14px] leading-5"
                selectable
                style={{ color: colors.text }}
              >
                {journalError}
              </Text>
            </View>
          ) : null}
        </View>
      }
      recycleItems
      renderItem={({ item }) => {
        if (typeof item === "string") {
          return <JournalEntrySkeleton />;
        }

        return <JournalEntryCard entry={item} />;
      }}
      showsVerticalScrollIndicator={false}
    />
  );
}
