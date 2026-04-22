import { useRouter } from "expo-router";
import {
  ScrollView,
  Text,
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

export default function DashboardScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { height } = useWindowDimensions();
  const {
    account,
    botStatus,
    apiBaseUrl,
    errorMessage,
    isRefreshing,
    isSubmitting,
    logout,
    refreshAll,
    session,
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
      <View style={{ gap: 18 }}>
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
          style={{
            gap: 16,
            borderRadius: 30,
            borderCurve: "continuous",
            backgroundColor: colors.surface,
            padding: 20,
            boxShadow: colors.shadowLg,
          }}
        >
          <View style={{ gap: 6 }}>
            <Text
              selectable
              style={{
                color: colors.text,
                fontSize: 22,
                fontWeight: "800",
              }}
            >
              Account overview
            </Text>
            <Text
              selectable
              style={{
                color: colors.textMuted,
                fontSize: 14,
                lineHeight: 20,
              }}
            >
              These live values come directly from the BurrFx API session that
              is holding the MT5 connection for this account.
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
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
          style={{
            gap: 16,
            borderRadius: 30,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: colors.borderSoft,
            backgroundColor: colors.panel,
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
                Bot runtime
              </Text>
              <Text
                selectable
                style={{
                  color: colors.textMuted,
                  fontSize: 14,
                  lineHeight: 20,
                }}
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

          <View style={{ gap: 12 }}>
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

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <View style={{ minWidth: "47%", flexGrow: 1 }}>
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
            <View style={{ minWidth: "47%", flexGrow: 1 }}>
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
            <View style={{ minWidth: "47%", flexGrow: 1 }}>
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
            <View style={{ minWidth: "47%", flexGrow: 1 }}>
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

        <View
          style={{
            gap: 18,
            borderRadius: 30,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: colors.borderSoft,
            backgroundColor: colors.panelMuted,
            padding: 20,
            boxShadow: colors.shadowMd,
          }}
        >
          <View style={{ gap: 6 }}>
            <Text
              selectable
              style={{
                color: colors.text,
                fontSize: 22,
                fontWeight: "800",
              }}
            >
              Appearance and connection
            </Text>
            <Text
              selectable
              style={{
                color: colors.textMuted,
                fontSize: 14,
                lineHeight: 20,
              }}
            >
              Pick the app theme you want, then review the account and server
              details for the active session.
            </Text>
          </View>

          <ThemeModePicker />

          <View
            style={{
              height: 1,
              backgroundColor: colors.borderSoft,
            }}
          />

          <View style={{ gap: 12 }}>
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
              Server message
            </Text>
            <Text
              selectable
              style={{
                color: colors.text,
                fontSize: 14,
                lineHeight: 20,
              }}
            >
              {errorMessage}
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
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
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSoft,
        paddingBottom: 10,
      }}
    >
      <Text
        selectable
        style={{
          color: colors.textDim,
          fontSize: 13,
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {label}
      </Text>
      <Text
        selectable
        style={{
          flex: 1,
          textAlign: "right",
          color: colors.text,
          fontSize: 15,
          fontWeight: "600",
        }}
      >
        {value}
      </Text>
    </View>
  );
}
