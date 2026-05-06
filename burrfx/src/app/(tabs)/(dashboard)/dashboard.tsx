import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { ActionButton } from "@/components/action-button";
import { MetricCard } from "@/components/metric-card";
import { PageHeading } from "@/components/page-heading";
import { StatusPill } from "@/components/status-pill";
import { ThemeModePicker } from "@/components/theme-mode-picker";
import { useAppSession } from "@/hooks/use-app-session";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  formatCountdown,
  formatCurrency,
  formatNumber,
  formatSignedCurrency,
  formatTimestamp,
} from "@/lib/format";
import type {
  BrokerDailyLimitsUpdatePayload,
  BrokerSettingsSummary,
} from "@/types/api";

export default function DashboardScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { height } = useWindowDimensions();
  const {
    account,
    botStatus,
    brokerSettings,
    apiBaseUrl,
    errorMessage,
    isRefreshing,
    isSubmitting,
    logout,
    refreshAll,
    session,
    saveBrokerDailyLimits,
    startBot,
    stopBot,
  } = useAppSession();

  const currency = account?.currency ?? "USD";
  const statusTone = botStatus?.running
    ? "positive"
    : botStatus?.state === "error"
      ? "negative"
      : botStatus?.state === "stopping"
        ? "warning"
        : "neutral";
  const activeTradingProfile =
    botStatus?.session.trading_profile ??
    session?.trading_profile;

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
      <View className="gap-[18px]">
        <PageHeading
          accessory={
            <StatusPill
              label={botStatus?.state ?? "Stopped"}
              tone={statusTone}
            />
          }
          description="Monitor your connected MT5 account, control the bot runtime, and switch between system, light, and dark appearance."
          eyebrow="Authenticated"
          title="Dashboard"
        />

        <View
          className="gap-4 rounded-[30px] p-5"
          style={{
            borderCurve: "continuous",
            backgroundColor: colors.surface,
            boxShadow: colors.shadowLg,
          }}
        >
          <View className="gap-1.5">
            <Text
              className="text-[22px] font-extrabold"
              selectable
              style={{ color: colors.text }}
            >
              Account overview
            </Text>
            <Text
              className="text-[14px] leading-5"
              selectable
              style={{ color: colors.textMuted }}
            >
              These live values come directly from the BurrFx API session that
              is holding the MT5 connection for this account.
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-3">
            <MetricCard
              label="Balance"
              value={formatCurrency(account?.balance, currency)}
            />
            <MetricCard
              label="Equity"
              value={formatCurrency(account?.equity, currency)}
              accent={colors.success}
            />
            <MetricCard
              label="Floating PnL"
              value={formatSignedCurrency(account?.profit, currency)}
              accent={
                (account?.profit ?? 0) >= 0
                  ? colors.success
                  : colors.danger
              }
            />
            <MetricCard
              label="Free Margin"
              value={formatCurrency(account?.free_margin, currency)}
              accent={colors.warning}
            />
          </View>
        </View>

        <View
          className="gap-4 rounded-[30px] border p-5"
          style={{
            borderCurve: "continuous",
            borderColor: colors.borderSoft,
            backgroundColor: colors.panel,
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
                Bot runtime
              </Text>
              <Text
                className="text-[14px] leading-5"
                selectable
                style={{ color: colors.textMuted }}
              >
                Start, stop, refresh, and inspect the live runtime information
                coming from the server-side controller.
              </Text>
            </View>
            <StatusPill
              label={botStatus?.phase ?? "Idle"}
              tone={statusTone}
            />
          </View>

          <View className="gap-3">
            <DetailRow
              label="Runtime detail"
              value={botStatus?.detail ?? "Waiting for the next action."}
            />
            <DetailRow
              label="Current symbol"
              value={botStatus?.current_symbol ?? "--"}
            />
            <DetailRow
              label="Session label"
              value={botStatus?.session_label ?? "--"}
            />
            <DetailRow
              label="Trading profile"
              value={
                activeTradingProfile?.label ?? "--"
              }
            />
            <DetailRow
              label="Countdown"
              value={formatCountdown(botStatus?.countdown_seconds)}
            />
            <DetailRow
              label="Started at"
              value={formatTimestamp(botStatus?.started_at)}
            />
            <DetailRow
              label="Last update"
              value={formatTimestamp(botStatus?.last_update_at)}
            />
          </View>

          <View className="flex-row flex-wrap gap-3">
            <View className="min-w-[47%] flex-1">
              <ActionButton
                label="Start Bot"
                disabled={Boolean(botStatus?.running)}
                loading={isSubmitting && !botStatus?.stop_requested}
                onPress={() => {
                  void startBot().catch(() => {
                    return;
                  });
                }}
              />
            </View>
            <View className="min-w-[47%] flex-1">
              <ActionButton
                label="Stop Bot"
                variant="danger"
                disabled={!botStatus?.running}
                loading={Boolean(
                  isSubmitting && botStatus?.stop_requested
                )}
                onPress={() => {
                  void stopBot().catch(() => {
                    return;
                  });
                }}
              />
            </View>
            <View className="min-w-[47%] flex-1">
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
            <View className="min-w-[47%] flex-1">
              <ActionButton
                label="Sign Out"
                variant="secondary"
                loading={isSubmitting && !botStatus?.running}
                onPress={() => {
                  void logout()
                    .then(() => {
                      router.replace("/");
                    })
                    .catch(() => {
                      return;
                    });
                }}
              />
            </View>
          </View>
        </View>

        <BrokerDailyLimitsSection
          brokers={brokerSettings?.brokers ?? []}
          currency={currency}
          disabled={isSubmitting || Boolean(botStatus?.running)}
          onSave={saveBrokerDailyLimits}
        />

        <View
          className="gap-[18px] rounded-[30px] border p-5"
          style={{
            borderCurve: "continuous",
            borderColor: colors.borderSoft,
            backgroundColor: colors.panelMuted,
            boxShadow: colors.shadowMd,
          }}
        >
          <View className="gap-1.5">
            <Text
              className="text-[22px] font-extrabold"
              selectable
              style={{ color: colors.text }}
            >
              Appearance and connection
            </Text>
            <Text
              className="text-[14px] leading-5"
              selectable
              style={{ color: colors.textMuted }}
            >
              Pick the app theme you want, then review the account and server
              details for the active session.
            </Text>
          </View>

          <ThemeModePicker />

          <View
            className="h-px"
            style={{
              backgroundColor: colors.borderSoft,
            }}
          />

          <View className="gap-3">
            <DetailRow
              label="Account number"
              value={account ? String(account.login) : "--"}
            />
            <DetailRow
              label="Broker server"
              value={account?.server ?? "--"}
            />
            <DetailRow
              label="Trading settings"
              value={
                activeTradingProfile?.label ?? "--"
              }
            />
            <DetailRow
              label="Currency"
              value={account?.currency ?? "--"}
            />
            <DetailRow
              label="Leverage"
              value={
                account?.leverage
                  ? `1:${formatNumber(account.leverage, 0)}`
                  : "--"
              }
            />
            <DetailRow
              label="Margin level"
              value={
                account?.margin_level !== null &&
                account?.margin_level !== undefined
                  ? `${formatNumber(account.margin_level)}%`
                  : "--"
              }
            />
            <DetailRow
              label="Company"
              value={account?.company ?? "--"}
            />
            <DetailRow
              label="API URL"
              value={apiBaseUrl || "--"}
            />
          </View>
        </View>

        {errorMessage ? (
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
              Server message
            </Text>
            <Text
              className="text-[14px] leading-5"
              selectable
              style={{ color: colors.text }}
            >
              {errorMessage}
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

type DailyLimitDraft = {
  enabled: boolean;
  target: string;
  maxLoss: string;
};

function BrokerDailyLimitsSection({
  brokers,
  currency,
  disabled,
  onSave,
}: {
  brokers: BrokerSettingsSummary[];
  currency: string;
  disabled: boolean;
  onSave: (
    brokerId: string,
    payload: BrokerDailyLimitsUpdatePayload
  ) => Promise<unknown>;
}) {
  const { colors } = useAppTheme();
  const [drafts, setDrafts] = useState<Record<string, DailyLimitDraft>>({});
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        brokers.map((broker) => [
          broker.id,
          {
            enabled: broker.daily_limits.enabled,
            target: String(broker.daily_limits.target),
            maxLoss: String(Math.abs(broker.daily_limits.max_loss)),
          },
        ])
      )
    );
  }, [brokers]);

  function updateDraft(
    brokerId: string,
    updates: Partial<DailyLimitDraft>
  ) {
    setDrafts((current) => ({
      ...current,
      [brokerId]: {
        ...current[brokerId],
        ...updates,
      },
    }));
  }

  async function saveBrokerLimit(broker: BrokerSettingsSummary) {
    const draft = drafts[broker.id];

    if (!draft) {
      return;
    }

    const target = Number(draft.target);
    const maxLoss = Number(draft.maxLoss);

    if (!Number.isFinite(target) || target <= 0) {
      setLocalMessage("Daily target must be greater than zero.");
      return;
    }

    if (!Number.isFinite(maxLoss) || maxLoss <= 0) {
      setLocalMessage("Daily loss must be greater than zero.");
      return;
    }

    setLocalMessage(null);

    await onSave(broker.id, {
      enabled: draft.enabled,
      target,
      max_loss: -Math.abs(maxLoss),
    });

    setLocalMessage(`${broker.label} daily limits saved.`);
  }

  return (
    <View
      className="gap-4 rounded-[30px] border p-5"
      style={{
        borderCurve: "continuous",
        borderColor: colors.borderSoft,
        backgroundColor: colors.panel,
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
            Broker daily limits
          </Text>
          <Text
            className="text-[14px] leading-5"
            selectable
            style={{ color: colors.textMuted }}
          >
            Each broker can use its own realized daily profit target and loss
            lock.
          </Text>
        </View>
      </View>

      {localMessage ? (
        <Text
          className="text-[14px] font-semibold"
          selectable
          style={{ color: colors.warning }}
        >
          {localMessage}
        </Text>
      ) : null}

      {!brokers.length ? (
        <Text
          className="text-[14px]"
          selectable
          style={{ color: colors.textMuted }}
        >
          Broker settings are unavailable from the server.
        </Text>
      ) : null}

      {brokers.map((broker) => {
        const draft = drafts[broker.id] ?? {
          enabled: broker.daily_limits.enabled,
          target: String(broker.daily_limits.target),
          maxLoss: String(Math.abs(broker.daily_limits.max_loss)),
        };

        return (
          <View
            className="gap-3 rounded-[22px] border p-4"
            key={broker.id}
            style={{
              borderCurve: "continuous",
              borderColor: colors.borderSoft,
              backgroundColor: colors.panelMuted,
            }}
          >
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1">
                <Text
                  className="text-[17px] font-extrabold"
                  selectable
                  style={{ color: colors.text }}
                >
                  {broker.label}
                </Text>
                <Text
                  className="text-[13px]"
                  selectable
                  style={{ color: colors.textMuted }}
                >
                  {broker.enabled ? "Active" : "Off"} | Target{" "}
                  {formatCurrency(broker.daily_limits.target, currency)} |
                  Loss{" "}
                  {formatCurrency(
                    Math.abs(broker.daily_limits.max_loss),
                    currency
                  )}
                </Text>
              </View>
              <Switch
                disabled={disabled}
                onValueChange={(enabled) =>
                  updateDraft(broker.id, { enabled })
                }
                value={draft.enabled}
              />
            </View>

            <View className="flex-row flex-wrap gap-3">
              <LimitInput
                disabled={disabled}
                label="Daily target"
                onChangeText={(target) =>
                  updateDraft(broker.id, { target })
                }
                value={draft.target}
              />
              <LimitInput
                disabled={disabled}
                label="Daily loss"
                onChangeText={(maxLoss) =>
                  updateDraft(broker.id, { maxLoss })
                }
                value={draft.maxLoss}
              />
            </View>

            <ActionButton
              disabled={disabled}
              label="Save Limits"
              onPress={() => {
                void saveBrokerLimit(broker).catch(() => {
                  return;
                });
              }}
              variant="secondary"
            />
          </View>
        );
      })}
    </View>
  );
}

function LimitInput({
  label,
  value,
  disabled,
  onChangeText,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChangeText: (value: string) => void;
}) {
  const { colors } = useAppTheme();

  return (
    <View className="min-w-[47%] flex-1 gap-1.5">
      <Text
        className="text-[12px] font-bold uppercase tracking-[0.4px]"
        selectable
        style={{ color: colors.textDim }}
      >
        {label}
      </Text>
      <TextInput
        className="rounded-[16px] px-4 py-3 text-[16px] font-semibold"
        editable={!disabled}
        keyboardType="decimal-pad"
        onChangeText={onChangeText}
        style={{
          borderColor: colors.borderSoft,
          borderWidth: 1,
          backgroundColor: colors.surface,
          color: colors.text,
        }}
        value={value}
      />
    </View>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const { colors } = useAppTheme();

  return (
    <View
      className="flex-row items-start justify-between gap-3 pb-2.5"
      style={{
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSoft,
      }}
    >
      <Text
        className="text-[13px] font-semibold uppercase tracking-[0.4px]"
        selectable
        style={{ color: colors.textDim }}
      >
        {label}
      </Text>
      <Text
        className="flex-1 text-right text-[15px] font-semibold"
        selectable
        style={{ color: colors.text }}
      >
        {value}
      </Text>
    </View>
  );
}
