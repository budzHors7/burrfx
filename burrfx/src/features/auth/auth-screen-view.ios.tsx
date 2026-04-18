import {
  Button,
  Form,
  Host,
  Section,
  SecureField,
  Text,
  TextField,
  VStack,
} from "@expo/ui/swift-ui";
import {
  autocorrectionDisabled,
  buttonStyle,
  controlSize,
  disabled,
  font,
  foregroundStyle,
  keyboardType,
  scrollDismissesKeyboard,
  submitLabel,
  textContentType,
  textFieldStyle,
  textInputAutocapitalization,
  tint,
} from "@expo/ui/swift-ui/modifiers";

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
  onSubmit,
}: AuthScreenViewProps) {
  return (
    <Host
      colorScheme="dark"
      ignoreSafeArea="keyboard"
      style={{ flex: 1 }}
      useViewportSizeMeasurement
    >
      <Form modifiers={[scrollDismissesKeyboard("interactively")]}>
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
              Connect to your Windows-hosted BurrFx API, then let the server
              log into MT5 and stream the account state back to the app.
            </Text>
          }
          header={
            <VStack alignment="leading" spacing={6}>
              <Text
                modifiers={[
                  font({
                    design: "rounded",
                    size: 12,
                    weight: "bold",
                  }),
                  foregroundStyle({
                    type: "hierarchical",
                    style: "tertiary",
                  }),
                ]}
              >
                BURRFX MOBILE
              </Text>
              <Text
                modifiers={[
                  font({
                    design: "rounded",
                    size: 30,
                    weight: "bold",
                  }),
                ]}
              >
                MT5 bot control in your pocket.
              </Text>
            </VStack>
          }
        >
          <Text
            modifiers={[
              foregroundStyle({
                type: "hierarchical",
                style: "secondary",
              }),
            ]}
          >
            Sign in with your API address, account number, password, and broker
            server to open the session on your Windows host.
          </Text>
        </Section>

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
          <SecureField
            defaultValue={password}
            modifiers={[
              textFieldStyle("roundedBorder"),
              textContentType("password"),
              submitLabel("next"),
              disabled(isSubmitting),
            ]}
            onValueChange={onPasswordChange}
            placeholder="MT5 account password"
          />
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
        </Section>

        {errorMessage ? (
          <Section title="Connection Issue">
            <Text modifiers={[foregroundStyle(palette.danger)]}>
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
              tint(palette.accent),
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
