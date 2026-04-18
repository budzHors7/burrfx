import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";

import { ActionButton } from "@/components/action-button";
import { MetricCard } from "@/components/metric-card";
import { StatusPill } from "@/components/status-pill";
import { useAppSession } from "@/hooks/use-app-session";
import {
  formatCountdown,
  formatCurrency,
  formatNumber,
  formatSignedCurrency,
  formatTimestamp,
} from "@/lib/format";
import { palette } from "@/lib/theme";

export default function DashboardScreen() {
  const router = useRouter();
  const {
    account,
    botStatus,
    apiBaseUrl,
    errorMessage,
    isRefreshing,
    isSubmitting,
    logout,
    refreshAll,
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

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 18,
        paddingTop: 20,
        paddingBottom: 36,
        gap: 18,
        backgroundColor: palette.background,
      }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View
        style={{
          gap: 18,
        }}
      >
        <View
          style={{
            gap: 16,
            borderRadius: 30,
            borderCurve: "continuous",
            backgroundColor: palette.surface,
            padding: 20,
            boxShadow: "0 24px 52px rgba(2, 12, 22, 0.28)",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <View style={{ flex: 1, gap: 10 }}>
              <Text
                selectable
                style={{
                  color: palette.textDim,
                  fontSize: 13,
                  fontWeight: "700",
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                }}
              >
                Live account control
              </Text>
              <Text
                selectable
                style={{
                  color: palette.text,
                  fontSize: 28,
                  lineHeight: 32,
                  fontWeight: "900",
                }}
              >
                BurrFx server heartbeat and bot controls.
              </Text>
              <Text
                selectable
                style={{
                  color: palette.textMuted,
                  fontSize: 15,
                  lineHeight: 22,
                }}
              >
                Keep an eye on the connected account, refresh the session, and
                start or stop the trading engine from one place.
              </Text>
            </View>
            <StatusPill
              label={botStatus?.state ?? "Stopped"}
              tone={statusTone}
            />
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
              accent={palette.success}
            />
            <MetricCard
              label="Floating PnL"
              value={formatSignedCurrency(account?.profit, currency)}
              accent={
                (account?.profit ?? 0) >= 0
                  ? palette.success
                  : palette.danger
              }
            />
            <MetricCard
              label="Free Margin"
              value={formatCurrency(account?.free_margin, currency)}
              accent={palette.warning}
            />
          </View>
        </View>

        <View
          style={{
            gap: 16,
            borderRadius: 30,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: palette.borderSoft,
            backgroundColor: "rgba(11, 32, 50, 0.92)",
            padding: 20,
            boxShadow: "0 22px 48px rgba(2, 12, 22, 0.26)",
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
                  color: palette.text,
                  fontSize: 22,
                  fontWeight: "800",
                }}
              >
                Bot runtime
              </Text>
              <Text
                selectable
                style={{
                  color: palette.textMuted,
                  fontSize: 14,
                  lineHeight: 20,
                }}
              >
                Status comes directly from the API bot controller you built on
                the server.
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
            <DetailRow
              label="API URL"
              value={apiBaseUrl || "--"}
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
                label="Disconnect"
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
            gap: 16,
            borderRadius: 30,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: palette.borderSoft,
            backgroundColor: "rgba(7, 24, 38, 0.95)",
            padding: 20,
            boxShadow: "0 20px 44px rgba(2, 12, 22, 0.24)",
          }}
        >
          <Text
            selectable
            style={{
              color: palette.text,
              fontSize: 22,
              fontWeight: "800",
            }}
          >
            Account snapshot
          </Text>

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
          </View>
        </View>

        {errorMessage ? (
          <View
            style={{
              gap: 8,
              borderRadius: 22,
              borderCurve: "continuous",
              backgroundColor: "rgba(255, 95, 109, 0.12)",
              padding: 18,
            }}
          >
            <Text
              selectable
              style={{
                color: palette.danger,
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
                color: palette.text,
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
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: palette.borderSoft,
        paddingBottom: 10,
      }}
    >
      <Text
        selectable
        style={{
          color: palette.textDim,
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
          color: palette.text,
          fontSize: 15,
          fontWeight: "600",
        }}
      >
        {value}
      </Text>
    </View>
  );
}
