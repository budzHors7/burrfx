import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { ActionButton } from "@/components/action-button";
import { FormField } from "@/components/form-field";
import type { AuthScreenViewProps } from "@/features/auth/auth-screen.types";
import { useAppTheme } from "@/hooks/use-app-theme";

export function AuthScreenView({
  apiUrl,
  accountNumber,
  password,
  server,
  tradingProfile,
  tradingProfileOptions,
  errorMessage,
  isHydrating,
  isSubmitting,
  onApiUrlChange,
  onAccountNumberChange,
  onPasswordChange,
  onServerChange,
  onTradingProfileChange,
  onDismissError,
  onSubmit,
}: AuthScreenViewProps) {
  const { colors } = useAppTheme();
  const { height } = useWindowDimensions();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const selectedProfile =
    tradingProfileOptions.find(
      (option) => option.id === tradingProfile
    ) ?? tradingProfileOptions[1];

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        minHeight: height,
        paddingHorizontal: 20,
        paddingTop: 26,
        paddingBottom: 28,
        backgroundColor: colors.background,
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
            backgroundColor: colors.heroOrbPrimary,
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
            backgroundColor: colors.heroOrbSecondary,
          }}
        />

        <View style={{ gap: 18 }}>
          <View
            style={{
              gap: 18,
              borderRadius: 30,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: colors.borderSoft,
              backgroundColor: colors.panelMuted,
              padding: 22,
              boxShadow: colors.shadowLg,
            }}
          >
            <View style={{ gap: 6 }}>
              <Text
                selectable
                style={{
                  color: colors.text,
                  fontSize: 24,
                  fontWeight: "800",
                }}
              >
                Sign in to your server
              </Text>
              <Text
                selectable
                style={{
                  color: colors.textMuted,
                  fontSize: 14,
                  lineHeight: 20,
                }}
              >
                The app signs in through your BurrFx API, then the server opens
                the MT5 session for this device.
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
            <View style={{ gap: 10 }}>
              <FormField
                label="Password"
                onChangeText={onPasswordChange}
                placeholder="MT5 account password"
                secureTextEntry={!isPasswordVisible}
                value={password}
              />
              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={() => {
                  setIsPasswordVisible((current) => !current);
                }}
                style={{
                  alignSelf: "flex-start",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  opacity: isSubmitting ? 0.5 : 1,
                }}
              >
                <Text
                  selectable
                  style={{
                    color: colors.accent,
                    fontSize: 13,
                    fontWeight: "700",
                  }}
                >
                  {isPasswordVisible ? "Hide password" : "Show password"}
                </Text>
                <Text
                  selectable
                  style={{
                    color: colors.textDim,
                    fontSize: 12,
                    lineHeight: 18,
                  }}
                >
                  Hidden by default.
                </Text>
              </Pressable>
            </View>
            <View style={{ gap: 12 }}>
              <Text
                selectable
                style={{
                  color: colors.text,
                  fontSize: 16,
                  fontWeight: "800",
                }}
              >
                Trading Settings
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  borderRadius: 20,
                  borderCurve: "continuous",
                  borderWidth: 1,
                  borderColor: colors.borderSoft,
                  backgroundColor: colors.surfaceRaised,
                  padding: 4,
                }}
              >
                {tradingProfileOptions.map((option) => {
                  const isSelected =
                    option.id === tradingProfile;

                  return (
                    <Pressable
                      key={option.id}
                      accessibilityRole="button"
                      disabled={isSubmitting}
                      onPress={() => {
                        onTradingProfileChange(option.id);
                      }}
                      style={({ pressed }) => ({
                        flex: 1,
                        minHeight: 42,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 16,
                        borderCurve: "continuous",
                        backgroundColor: isSelected
                          ? colors.accent
                          : "transparent",
                        opacity: pressed ? 0.92 : 1,
                      })}
                    >
                      <Text
                        selectable
                        style={{
                          color: isSelected
                            ? colors.textOnAccent
                            : colors.textMuted,
                          fontSize: 12,
                          fontWeight: isSelected
                            ? "800"
                            : "700",
                        }}
                      >
                        {getTradingProfileSegmentLabel(
                          option.id
                        )}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View
                style={{
                  gap: 8,
                  borderRadius: 18,
                  borderCurve: "continuous",
                  borderWidth: 1,
                  borderColor: colors.borderSoft,
                  backgroundColor: colors.surfaceRaised,
                  padding: 14,
                }}
              >
                <Text
                  selectable
                  style={{
                    color: colors.accent,
                    fontSize: 14,
                    fontWeight: "800",
                  }}
                >
                  {selectedProfile.label}
                </Text>
                <Text
                  selectable
                  style={{
                    color: colors.textMuted,
                    fontSize: 13,
                    lineHeight: 18,
                  }}
                >
                  {selectedProfile.description}
                </Text>
              </View>
            </View>
            <FormField
              autoCapitalize="none"
              label="Broker Server"
              onChangeText={onServerChange}
              placeholder="Broker-Demo"
              value={server}
            />
            <Text
              selectable
              style={{
                color: colors.textDim,
                fontSize: 12,
                lineHeight: 18,
              }}
            >
              MT5 still requires the broker server value for login.
            </Text>

            {errorMessage ? (
              <View
                style={{
                  gap: 8,
                  borderRadius: 20,
                  borderCurve: "continuous",
                  backgroundColor: colors.errorBackground,
                  padding: 16,
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
                  Connection issue
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

            <ActionButton
              label={isSubmitting ? "Connecting..." : "Connect and Sign In"}
              loading={isSubmitting}
              onPress={onSubmit}
            />

            <View style={{ gap: 10 }}>
              <Text
                selectable
                style={{
                  color: colors.textDim,
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
                  <ActivityIndicator color={colors.accent} />
                  <Text
                    selectable
                    style={{
                      color: colors.textMuted,
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
              color: colors.textMuted,
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
              color: colors.textDim,
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

function getTradingProfileSegmentLabel(
  tradingProfileId: string
) {
  if (tradingProfileId === "smart_risk") {
    return "Smart";
  }

  if (tradingProfileId === "highly_risky") {
    return "Risky";
  }

  return "Regular";
}
