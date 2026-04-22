import {
  Button,
  Form,
  HStack,
  Host,
  Picker,
  Section,
  SecureField,
  Text,
  TextField,
  VStack,
} from "@expo/ui/swift-ui";
import { useState } from "react";
import {
  autocorrectionDisabled,
  buttonStyle,
  controlSize,
  disabled,
  font,
  foregroundStyle,
  keyboardType,
  pickerStyle,
  scrollDismissesKeyboard,
  submitLabel,
  tag,
  textContentType,
  textFieldStyle,
  textInputAutocapitalization,
  tint,
} from "@expo/ui/swift-ui/modifiers";

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
  onSubmit,
}: AuthScreenViewProps) {
  const { colors, resolvedMode } = useAppTheme();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const selectedProfile =
    tradingProfileOptions.find(
      (option) => option.id === tradingProfile
    ) ?? tradingProfileOptions[1];

  return (
    <Host
      colorScheme={resolvedMode}
      ignoreSafeArea="keyboard"
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
      useViewportSizeMeasurement
    >
      <Form modifiers={[scrollDismissesKeyboard("interactively")]}>
        <Section title="Connection">
          <TextField
            defaultValue={apiUrl}
            modifiers={[
              textFieldStyle("roundedBorder"),
              textInputAutocapitalization("never"),
              autocorrectionDisabled(),
              keyboardType("url"),
              submitLabel("next"),
              textContentType("URL"),
              disabled(isSubmitting),
            ]}
            onValueChange={onApiUrlChange}
            placeholder="http://192.168.1.20:8000"
          />
          <TextField
            defaultValue={accountNumber}
            modifiers={[
              textFieldStyle("roundedBorder"),
              keyboardType("numeric"),
              submitLabel("next"),
              disabled(isSubmitting),
            ]}
            onValueChange={onAccountNumberChange}
            placeholder="12345678"
          />
          {isPasswordVisible ? (
            <TextField
              key="password-visible"
              defaultValue={password}
              modifiers={[
                textFieldStyle("roundedBorder"),
                textInputAutocapitalization("never"),
                autocorrectionDisabled(),
                textContentType("password"),
                submitLabel("next"),
                disabled(isSubmitting),
              ]}
              onValueChange={onPasswordChange}
              placeholder="MT5 account password"
            />
          ) : (
            <SecureField
              key="password-hidden"
              defaultValue={password}
              modifiers={[
                textFieldStyle("roundedBorder"),
                textInputAutocapitalization("never"),
                autocorrectionDisabled(),
                textContentType("password"),
                submitLabel("next"),
                disabled(isSubmitting),
              ]}
              onValueChange={onPasswordChange}
              placeholder="MT5 account password"
            />
          )}
          <Picker
            label="Trading Settings"
            modifiers={[
              pickerStyle("segmented"),
              disabled(isSubmitting),
            ]}
            onSelectionChange={(value) => {
              if (!value) {
                return;
              }

              onTradingProfileChange(value);
            }}
            selection={tradingProfile}
          >
            {tradingProfileOptions.map((option) => (
              <Text
                key={option.id}
                modifiers={[tag(option.id)]}
              >
                {getTradingProfileSegmentLabel(option.id)}
              </Text>
            ))}
          </Picker>
          <Text
            modifiers={[
              foregroundStyle({
                type: "hierarchical",
                style: "secondary",
              }),
            ]}
          >
            {selectedProfile.label}: {selectedProfile.description}
          </Text>
          <HStack alignment="center" spacing={12}>
            <Text
              modifiers={[
                foregroundStyle({
                  type: "hierarchical",
                  style: "secondary",
                }),
              ]}
            >
              Hidden by default.
            </Text>
            <Button
              label={isPasswordVisible ? "Hide" : "Show"}
              modifiers={[
                buttonStyle("plain"),
                disabled(isSubmitting),
              ]}
              onPress={() => {
                setIsPasswordVisible((current) => !current);
              }}
            />
          </HStack>
          <TextField
            defaultValue={server}
            modifiers={[
              textFieldStyle("roundedBorder"),
              textInputAutocapitalization("never"),
              autocorrectionDisabled(),
              submitLabel("done"),
              disabled(isSubmitting),
            ]}
            onValueChange={onServerChange}
            placeholder="Broker-Demo"
          />
          <Text
            modifiers={[
              foregroundStyle({
                type: "hierarchical",
                style: "secondary",
              }),
            ]}
          >
            MT5 still requires the broker server value for login.
          </Text>
        </Section>

        {errorMessage ? (
          <Section title="Connection Issue">
            <Text modifiers={[foregroundStyle(colors.danger)]}>
              {errorMessage}
            </Text>
          </Section>
        ) : null}

        <Section
          footer={
            <Text
              modifiers={[
                foregroundStyle({
                  type: "hierarchical",
                  style: "secondary",
                }),
              ]}
            >
              {isHydrating
                ? "Checking the existing server session..."
                : "Use the Windows server LAN IP instead of localhost when you test on a phone or emulator."}
            </Text>
          }
        >
          <Button
            label={isSubmitting ? "Connecting..." : "Connect and Sign In"}
            modifiers={[
              buttonStyle("borderedProminent"),
              controlSize("large"),
              tint(colors.accent),
              disabled(isSubmitting),
            ]}
            onPress={onSubmit}
          />
        </Section>

        <Section title="Server Expectation">
          <Text
            modifiers={[
              foregroundStyle({
                type: "hierarchical",
                style: "secondary",
              }),
            ]}
          >
            Windows Server, MetaTrader 5 terminal, and the BurrFx API should be
            available before signing in.
          </Text>
        </Section>
      </Form>
    </Host>
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
