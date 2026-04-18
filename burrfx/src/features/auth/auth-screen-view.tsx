import { Image } from "expo-image";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { ActionButton } from "@/components/action-button";
import { FormField } from "@/components/form-field";
import { palette } from "@/lib/theme";
import type { AuthScreenViewProps } from "@/features/auth/auth-screen.types";

export function AuthScreenView({
  apiUrl,
  accountNumber,
  password,
  server,
  errorMessage,
  isHydrating,
  isSubmitting,
  onApiUrlChange,
  onAccountNumberChange,
  onPasswordChange,
  onServerChange,
  onDismissError,
  onSubmit,
}: AuthScreenViewProps) {
  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 26,
        paddingBottom: 28,
        backgroundColor: palette.background,
      }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={{
          flex: 1,
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <View
          style={{
            position: "absolute",
            right: -40,
            top: 20,
            height: 220,
            width: 220,
            borderRadius: 999,
            backgroundColor: "rgba(39, 167, 255, 0.12)",
          }}
        />
        <View
          style={{
            position: "absolute",
            left: -60,
            top: 240,
            height: 180,
            width: 180,
            borderRadius: 999,
            backgroundColor: "rgba(22, 199, 132, 0.08)",
          }}
        />

        <View style={{ gap: 18 }}>
          <View
            style={{
              gap: 18,
              borderRadius: 30,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: palette.borderSoft,
              backgroundColor: "rgba(11, 32, 50, 0.92)",
              padding: 22,
              boxShadow: "0 24px 54px rgba(2, 12, 22, 0.32)",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
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
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                  }}
                >
                  BurrFx Mobile
                </Text>
                <Text
                  selectable
                  style={{
                    color: palette.text,
                    fontSize: 34,
                    lineHeight: 38,
                    fontWeight: "900",
                  }}
                >
                  MT5 bot control in your pocket.
                </Text>
                <Text
                  selectable
                  style={{
                    color: palette.textMuted,
                    fontSize: 15,
                    lineHeight: 22,
                  }}
                >
                  Connect to your Windows-hosted BurrFx API, sign in to MT5,
                  and move straight into the dashboard and live trades.
                </Text>
              </View>
              <View
                style={{
                  height: 88,
                  width: 88,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 26,
                  backgroundColor: "rgba(39, 167, 255, 0.08)",
                }}
              >
                <Image
                  contentFit="contain"
                  source={require("../../../assets/images/logo-glow.png")}
                  style={{ height: 64, width: 64 }}
                />
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <FeaturePill label="Auth" />
              <FeaturePill label="Dashboard" />
              <FeaturePill label="Trades" />
              <FeaturePill label="Bot Start/Stop" />
            </View>
          </View>

          <View
            style={{
              gap: 18,
              borderRadius: 30,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: palette.borderSoft,
              backgroundColor: "rgba(6, 20, 32, 0.94)",
              padding: 22,
              boxShadow: "0 24px 54px rgba(2, 12, 22, 0.28)",
            }}
          >
            <View style={{ gap: 6 }}>
              <Text
                selectable
                style={{
                  color: palette.text,
                  fontSize: 24,
                  fontWeight: "800",
                }}
              >
                Sign in to your server
              </Text>
              <Text
                selectable
                style={{
                  color: palette.textMuted,
                  fontSize: 14,
                  lineHeight: 20,
                }}
              >
                The app signs in through your BurrFx API, then the server opens
                the MT5 session.
              </Text>
            </View>

            <FormField
              autoCapitalize="none"
              label="API URL"
              onChangeText={onApiUrlChange}
              placeholder="http://192.168.1.20:8000"
              value={apiUrl}
            />
            <FormField
              keyboardType="number-pad"
              label="Account Number"
              onChangeText={onAccountNumberChange}
              placeholder="12345678"
              value={accountNumber}
            />
            <FormField
              label="Password"
              onChangeText={onPasswordChange}
              placeholder="MT5 account password"
              secureTextEntry
              value={password}
            />
            <FormField
              autoCapitalize="none"
              label="Broker Server"
              onChangeText={onServerChange}
              placeholder="Broker-Demo"
              value={server}
            />

            {errorMessage ? (
              <View
                style={{
                  gap: 8,
                  borderRadius: 20,
                  borderCurve: "continuous",
                  backgroundColor: "rgba(255, 95, 109, 0.12)",
                  padding: 16,
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
                  Connection issue
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

            <ActionButton
              label={isSubmitting ? "Connecting..." : "Connect and Sign In"}
              loading={isSubmitting}
              onPress={onSubmit}
            />

            <View style={{ gap: 10 }}>
              <Text
                selectable
                style={{
                  color: palette.textDim,
                  fontSize: 12,
                  lineHeight: 18,
                }}
              >
                For a physical device, use your Windows server&apos;s LAN IP
                instead of `localhost`.
              </Text>
              {isHydrating ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <ActivityIndicator color={palette.accent} />
                  <Text
                    selectable
                    style={{
                      color: palette.textMuted,
                      fontSize: 13,
                    }}
                  >
                    Checking the existing server session...
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <Pressable
          onPress={onDismissError}
          style={{
            alignSelf: "flex-start",
            gap: 6,
          }}
        >
          <Text
            selectable
            style={{
              color: palette.textMuted,
              fontSize: 12,
              fontWeight: "700",
              letterSpacing: 0.6,
              textTransform: "uppercase",
            }}
          >
            Server expectation
          </Text>
          <Text
            selectable
            style={{
              color: palette.textDim,
              fontSize: 13,
              lineHeight: 18,
            }}
          >
            Windows Server + MT5 terminal + BurrFx API running on port 8000.
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function FeaturePill({
  label,
}: {
  label: string;
}) {
  return (
    <View
      style={{
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: "rgba(39, 167, 255, 0.08)",
      }}
    >
      <Text
        selectable
        style={{
          color: palette.accentSoft,
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 0.3,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
    </View>
  );
}
