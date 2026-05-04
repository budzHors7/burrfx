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
import { LogEntryCard } from "@/components/log-entry-card";
import { LogEntrySkeleton } from "@/components/log-entry-skeleton";
import { PageHeading } from "@/components/page-heading";
import { SkeletonBlock } from "@/components/skeleton-block";
import { StatusPill } from "@/components/status-pill";
import { useAppSession } from "@/hooks/use-app-session";
import { useAppTheme } from "@/hooks/use-app-theme";
import { ApiError, api } from "@/lib/api";
import type { AccountLogEntry } from "@/types/api";

const LOGS_PAGE_SIZE = 30;
const LOG_SKELETON_IDS = [
  "log-skeleton-1",
  "log-skeleton-2",
  "log-skeleton-3",
];

type LogFilter = "all" | "activity" | "warnings" | "errors";

const LOG_FILTER_OPTIONS: readonly FilterOption<LogFilter>[] = [
  { label: "All", value: "all" },
  { label: "Activity", value: "activity" },
  { label: "Warnings", value: "warnings" },
  { label: "Errors", value: "errors" },
];

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to read the BurrFx server logs right now.";
}

function matchesLogFilter(
  entry: AccountLogEntry,
  filter: LogFilter
) {
  const level = entry.level.toUpperCase();

  if (filter === "errors") {
    return level === "ERROR" || level === "CRITICAL";
  }

  if (filter === "warnings") {
    return level === "WARNING" || level === "WARN";
  }

  if (filter === "activity") {
    return !(
      level === "ERROR" ||
      level === "CRITICAL" ||
      level === "WARNING" ||
      level === "WARN" ||
      level === "DEBUG"
    );
  }

  return true;
}

export default function LogsScreen() {
  const { colors } = useAppTheme();
  const { height } = useWindowDimensions();
  const {
    account,
    apiBaseUrl,
    isRefreshing,
    refreshAll,
  } = useAppSession();
  const [logs, setLogs] = useState<AccountLogEntry[]>([]);
  const [logSourceFile, setLogSourceFile] =
    useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] =
    useState<LogFilter>("all");
  const [logTotal, setLogTotal] = useState(0);
  const [hasMoreLogs, setHasMoreLogs] =
    useState(false);
  const [isLogsLoading, setIsLogsLoading] =
    useState(false);
  const [isLoadingMoreLogs, setIsLoadingMoreLogs] =
    useState(false);
  const [hasLoadedLogs, setHasLoadedLogs] =
    useState(false);
  const [logsError, setLogsError] = useState<string | null>(
    null
  );

  const accountKey = account
    ? `${account.login}:${account.server}`
    : "no-account";

  const filteredLogs = logs.filter((entry) =>
    matchesLogFilter(entry, selectedFilter)
  );

  useEffect(() => {
    startTransition(() => {
      setLogs([]);
      setLogSourceFile(null);
      setSelectedFilter("all");
      setLogTotal(0);
      setHasMoreLogs(false);
      setHasLoadedLogs(false);
      setLogsError(null);
    });
  }, [accountKey]);

  const loadLogs = useCallback(
    async (options?: { reset?: boolean }) => {
      const reset = options?.reset ?? false;

      if (!apiBaseUrl) {
        startTransition(() => {
          setLogs([]);
          setLogSourceFile(null);
          setLogTotal(0);
          setHasMoreLogs(false);
          setHasLoadedLogs(false);
        });
        return;
      }

      if (
        !reset &&
        (isLogsLoading ||
          isLoadingMoreLogs ||
          (!hasMoreLogs && hasLoadedLogs))
      ) {
        return;
      }

      const nextOffset = reset ? 0 : logs.length;

      if (reset || !hasLoadedLogs) {
        setIsLogsLoading(true);
      } else {
        setIsLoadingMoreLogs(true);
      }

      setLogsError(null);

      try {
        const nextLogs = await api.getAccountLogs(apiBaseUrl, {
          limit: LOGS_PAGE_SIZE,
          offset: nextOffset,
        });

        startTransition(() => {
          setLogs((currentLogs) =>
            reset
              ? nextLogs.entries
              : [...currentLogs, ...nextLogs.entries]
          );
          setLogSourceFile(nextLogs.source_file ?? null);
          setLogTotal(nextLogs.total);
          setHasMoreLogs(nextLogs.has_more);
          setHasLoadedLogs(true);
        });
      } catch (error) {
        setLogsError(getErrorMessage(error));

        startTransition(() => {
          if (!hasLoadedLogs || reset) {
            setLogs([]);
            setLogSourceFile(null);
            setLogTotal(0);
            setHasMoreLogs(false);
          }
        });
      } finally {
        setIsLogsLoading(false);
        setIsLoadingMoreLogs(false);
      }
    },
    [
      apiBaseUrl,
      hasLoadedLogs,
      hasMoreLogs,
      isLoadingMoreLogs,
      isLogsLoading,
      logs.length,
    ]
  );

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(
        () => {
          void loadLogs({ reset: true });
        }
      );

      return () => {
        task.cancel();
      };
    }, [loadLogs])
  );

  const showSkeletons =
    !hasLoadedLogs && isLogsLoading;
  const data: Array<AccountLogEntry | string> =
    showSkeletons ? LOG_SKELETON_IDS : filteredLogs;

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
      estimatedItemSize={188}
      ItemSeparatorComponent={() => <View className="h-[14px]" />}
      keyExtractor={(item, index) => {
        if (typeof item === "string") {
          return item;
        }

        return `${item.timestamp ?? "log"}-${item.event}-${index}`;
      }}
      ListEmptyComponent={
        !showSkeletons ? (
          <View
            className="gap-2.5 rounded-[28px] border p-[22px]"
            style={{
              borderCurve: "continuous",
              borderColor: colors.borderSoft,
              backgroundColor:
                logs.length > 0
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
              {logs.length > 0
                ? "No matching logs in this loaded range"
                : "No server logs yet"}
            </Text>
            <Text
              className="text-[15px] leading-[22px]"
              selectable
              style={{ color: colors.textMuted }}
            >
              {logs.length > 0
                ? "Try another filter or load older log entries to widen the range."
                : "Once the server emits account or bot activity for this session, the latest lines will appear here."}
            </Text>
          </View>
        ) : null
      }
      ListFooterComponent={
        !showSkeletons ? (
          <View className="gap-3 pt-[18px]">
            {hasMoreLogs ? (
              <ActionButton
                label="Load Older Logs"
                loading={isLoadingMoreLogs}
                variant="secondary"
                onPress={() => {
                  void loadLogs();
                }}
              />
            ) : logs.length > 0 ? (
              <Text
                className="text-center text-[12px] leading-[18px]"
                selectable
                style={{ color: colors.textDim }}
              >
                Showing {logs.length} of {logTotal} available log entries.
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
                  label="Refresh"
                  variant="secondary"
                  loading={
                    isRefreshing || isLogsLoading
                  }
                  onPress={() => {
                    void refreshAll()
                      .catch(() => {
                        return;
                      })
                      .finally(() => {
                        void loadLogs({ reset: true });
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
                  Active server stream
                </Text>
                <Text
                  className="text-[14px] leading-5"
                  selectable
                  style={{ color: colors.textMuted }}
                >
                  {account
                    ? `Showing log events for account #${account.login} on ${account.server}.`
                    : "Showing the latest BurrFx server log stream."}
                </Text>
              </View>
              <StatusPill
                label={
                  showSkeletons
                    ? "Loading"
                    : `${filteredLogs.length} Visible`
                }
                tone={
                  filteredLogs.length > 0
                    ? "positive"
                    : "neutral"
                }
              />
            </View>

            <FilterPills
              disabled={showSkeletons}
              onChange={setSelectedFilter}
              options={LOG_FILTER_OPTIONS}
              value={selectedFilter}
            />

            <Text
              className="text-[12px] leading-[18px]"
              selectable
              style={{ color: colors.textDim }}
            >
              Loaded {logs.length} of {logTotal} log entries.
            </Text>

            <View
              className="gap-1.5 rounded-[18px] p-[14px]"
              style={{
                borderCurve: "continuous",
                backgroundColor: colors.surfaceRaised,
              }}
            >
              <Text
                className="text-[12px] font-bold uppercase tracking-[0.4px]"
                selectable
                style={{ color: colors.textDim }}
              >
                Source file
              </Text>
              {showSkeletons ? (
                <View className="gap-2">
                  <SkeletonBlock
                    height={12}
                    width="82%"
                    borderRadius={8}
                  />
                  <SkeletonBlock
                    height={12}
                    width="58%"
                    borderRadius={8}
                  />
                </View>
              ) : (
                <Text
                  className="text-[13px] leading-[19px]"
                  selectable
                  style={{ color: colors.text }}
                >
                  {logSourceFile ??
                    "Current session log unavailable"}
                </Text>
              )}
            </View>
          </View>

          {logsError ? (
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
                Log fetch issue
              </Text>
              <Text
                className="text-[14px] leading-5"
                selectable
                style={{ color: colors.text }}
              >
                {logsError}
              </Text>
            </View>
          ) : null}
        </View>
      }
      recycleItems
      renderItem={({ item }) => {
        if (typeof item === "string") {
          return <LogEntrySkeleton />;
        }

        return <LogEntryCard entry={item} />;
      }}
      showsVerticalScrollIndicator={false}
    />
  );
}
