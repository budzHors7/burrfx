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

export function AuthScreenViewNative({
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
      <View className="flex-1 justify-between gap-6">
        <View
          className="absolute right-[-40px] top-5 h-[220px] w-[220px] rounded-full"
          style={{
            backgroundColor: colors.heroOrbPrimary,
          }}
        />
        <View
          className="absolute left-[-60px] top-[240px] h-[180px] w-[180px] rounded-full"
          style={{
            backgroundColor: colors.heroOrbSecondary,
          }}
        />

        <View className="gap-[18px]">
          <View
            className="gap-[18px] rounded-[30px] border p-[22px]"
            style={{
              borderCurve: "continuous",
              borderColor: colors.borderSoft,
              backgroundColor: colors.panelMuted,
              boxShadow: colors.shadowLg,
            }}
          >
            <View className="gap-1.5">
              <Text
                className="text-[24px] font-extrabold"
                selectable
                style={{
                  color: colors.text,
                }}
              >
                Sign in to your server
              </Text>
              <Text
                className="text-[14px] leading-5"
                selectable
                style={{
                  color: colors.textMuted,
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

            <View className="gap-2.5">
              <FormField
                label="Password"
                onChangeText={onPasswordChange}
                placeholder="MT5 account password"
                secureTextEntry={!isPasswordVisible}
                value={password}
              />
              <Pressable
                accessibilityRole="button"
                className="self-start flex-row items-center gap-2.5"
                disabled={isSubmitting}
                onPress={() => {
                  setIsPasswordVisible((current) => !current);
                }}
                style={{
                  opacity: isSubmitting ? 0.5 : 1,
                }}
              >
                <Text
                  className="text-[13px] font-bold"
                  selectable
                  style={{
                    color: colors.accent,
                  }}
                >
                  {isPasswordVisible ? "Hide password" : "Show password"}
                </Text>
                <Text
                  className="text-[12px] leading-[18px]"
                  selectable
                  style={{
                    color: colors.textDim,
                  }}
                >
                  Hidden by default.
                </Text>
              </Pressable>
            </View>

            <View className="gap-3">
              <Text
                className="text-[16px] font-extrabold"
                selectable
                style={{
                  color: colors.text,
                }}
              >
                Trading Settings
              </Text>
              <View
                className="flex-row gap-2 rounded-[20px] border p-1"
                style={{
                  borderCurve: "continuous",
                  borderColor: colors.borderSoft,
                  backgroundColor: colors.surfaceRaised,
                }}
              >
                {tradingProfileOptions.map((option) => {
                  const isSelected =
                    option.id === tradingProfile;

                  return (
                    <Pressable
                      key={option.id}
                      accessibilityRole="button"
                      className="min-h-[42px] flex-1 items-center justify-center rounded-[16px]"
                      disabled={isSubmitting}
                      onPress={() => {
                        onTradingProfileChange(option.id);
                      }}
                      style={({ pressed }) => ({
                        borderCurve: "continuous",
                        borderWidth: 1,
                        borderColor: isSelected
                          ? colors.accentDeep
                          : "transparent",
                        backgroundColor: isSelected
                          ? colors.accent
                          : "transparent",
                        opacity: pressed ? 0.92 : 1,
                      })}
                    >
                      <Text
                        className="text-[12px] font-bold"
                        selectable
                        style={{
                          color: isSelected
                            ? colors.textOnAccent
                            : colors.text,
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
                className="gap-2 rounded-[18px] border p-[14px]"
                style={{
                  borderCurve: "continuous",
                  borderColor: colors.borderSoft,
                  backgroundColor: colors.surfaceRaised,
                }}
              >
                <Text
                  className="text-[14px] font-extrabold"
                  selectable
                  style={{
                    color: colors.text,
                  }}
                >
                  {selectedProfile.label}
                </Text>
                <Text
                  className="text-[13px] leading-[18px]"
                  selectable
                  style={{
                    color: colors.textMuted,
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
              className="text-[12px] leading-[18px]"
              selectable
              style={{
                color: colors.textDim,
              }}
            >
              MT5 still requires the broker server value for login.
            </Text>

            {errorMessage ? (
              <View
                className="gap-2 rounded-[20px] p-4"
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
                  Connection issue
                </Text>
                <Text
                  className="text-[14px] leading-5"
                  selectable
                  style={{
                    color: colors.text,
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

            <View className="gap-2.5">
              <Text
                className="text-[12px] leading-[18px]"
                selectable
                style={{
                  color: colors.textDim,
                }}
              >
                For a physical device, use your Windows server&apos;s LAN IP
                instead of `localhost`.
              </Text>
              {isHydrating ? (
                <View className="flex-row items-center gap-2.5">
                  <ActivityIndicator color={colors.accent} />
                  <Text
                    className="text-[13px]"
                    selectable
                    style={{
                      color: colors.textMuted,
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
          className="self-start gap-1.5"
          onPress={onDismissError}
        >
          <Text
            className="text-[12px] font-bold uppercase tracking-[0.6px]"
            selectable
            style={{
              color: colors.textMuted,
            }}
          >
            Server expectation
          </Text>
          <Text
            className="text-[13px] leading-[18px]"
            selectable
            style={{
              color: colors.textDim,
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
