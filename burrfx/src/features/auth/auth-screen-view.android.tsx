import {
  Button,
  Column,
  Host,
  LazyColumn,
  OutlinedCard,
  OutlinedTextField,
  Surface,
  Text,
} from "@expo/ui/jetpack-compose";
import {
  background,
  fillMaxSize,
  fillMaxWidth,
  imePadding,
  paddingAll,
} from "@expo/ui/jetpack-compose/modifiers";

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
      ignoreSafeAreaKeyboardInsets
      style={{ flex: 1 }}
      useViewportSizeMeasurement
    >
      <LazyColumn
        contentPadding={{
          top: 24,
          bottom: 36,
          start: 20,
          end: 20,
        }}
        horizontalAlignment="center"
        modifiers={[
          fillMaxSize(),
          background(palette.background),
          imePadding(),
        ]}
        verticalArrangement={{ spacedBy: 16 }}
      >
        <OutlinedCard
          border={{ color: palette.borderSoft, width: 1 }}
          colors={{
            containerColor: palette.surface,
            contentColor: palette.text,
          }}
          modifiers={[fillMaxWidth()]}
        >
          <Column
            modifiers={[fillMaxWidth(), paddingAll(20)]}
            verticalArrangement={{ spacedBy: 12 }}
          >
            <Text
              color={palette.accentSoft}
              style={{
                fontSize: 12,
                fontWeight: "700",
                letterSpacing: 1.1,
                typography: "labelLarge",
              }}
            >
              BURRFX MOBILE
            </Text>
            <Text
              color={palette.text}
              style={{
                fontSize: 32,
                fontWeight: "800",
                lineHeight: 36,
                typography: "headlineMedium",
              }}
            >
              MT5 bot control in your pocket.
            </Text>
            <Text
              color={palette.textMuted}
              style={{
                fontSize: 15,
                lineHeight: 21,
                typography: "bodyMedium",
              }}
            >
              Sign in through your BurrFx API, let the Windows server open the
              MT5 session, then move into the dashboard and live trades.
            </Text>
          </Column>
        </OutlinedCard>

        <OutlinedCard
          border={{ color: palette.borderSoft, width: 1 }}
          colors={{
            containerColor: palette.surfaceRaised,
            contentColor: palette.text,
          }}
          modifiers={[fillMaxWidth()]}
        >
          <Column
            modifiers={[fillMaxWidth(), paddingAll(20)]}
            verticalArrangement={{ spacedBy: 14 }}
          >
            <Text
              color={palette.text}
              style={{
                fontWeight: "800",
                typography: "titleLarge",
              }}
            >
              Sign in to your server
            </Text>
            <Text
              color={palette.textMuted}
              style={{
                fontSize: 14,
                lineHeight: 20,
                typography: "bodyMedium",
              }}
            >
              The mobile app authenticates with your API first, then the server
              logs into MetaTrader 5.
            </Text>

            <OutlinedTextField
              defaultValue={apiUrl}
              enabled={!isSubmitting}
              keyboardOptions={{
                autoCorrectEnabled: false,
                capitalization: "none",
                imeAction: "next",
                keyboardType: "uri",
              }}
              modifiers={[fillMaxWidth()]}
              onValueChange={onApiUrlChange}
              singleLine
            >
              <OutlinedTextField.Label>
                <Text>API URL</Text>
              </OutlinedTextField.Label>
              <OutlinedTextField.Placeholder>
                <Text>http://192.168.1.20:8000</Text>
              </OutlinedTextField.Placeholder>
              <OutlinedTextField.SupportingText>
                <Text>Use your Windows server LAN IP instead of localhost.</Text>
              </OutlinedTextField.SupportingText>
            </OutlinedTextField>

            <OutlinedTextField
              defaultValue={accountNumber}
              enabled={!isSubmitting}
              keyboardOptions={{
                autoCorrectEnabled: false,
                imeAction: "next",
                keyboardType: "number",
              }}
              modifiers={[fillMaxWidth()]}
              onValueChange={onAccountNumberChange}
              singleLine
            >
              <OutlinedTextField.Label>
                <Text>Account Number</Text>
              </OutlinedTextField.Label>
              <OutlinedTextField.Placeholder>
                <Text>12345678</Text>
              </OutlinedTextField.Placeholder>
            </OutlinedTextField>

            <OutlinedTextField
              defaultValue={password}
              enabled={!isSubmitting}
              keyboardActions={{ onDone: onSubmit }}
              keyboardOptions={{
                autoCorrectEnabled: false,
                imeAction: "next",
                keyboardType: "password",
              }}
              modifiers={[fillMaxWidth()]}
              onValueChange={onPasswordChange}
              singleLine
            >
              <OutlinedTextField.Label>
                <Text>Password</Text>
              </OutlinedTextField.Label>
              <OutlinedTextField.Placeholder>
                <Text>MT5 account password</Text>
              </OutlinedTextField.Placeholder>
            </OutlinedTextField>

            <OutlinedTextField
              defaultValue={server}
              enabled={!isSubmitting}
              keyboardActions={{ onDone: onSubmit }}
              keyboardOptions={{
                autoCorrectEnabled: false,
                capitalization: "none",
                imeAction: "done",
              }}
              modifiers={[fillMaxWidth()]}
              onValueChange={onServerChange}
              singleLine
            >
              <OutlinedTextField.Label>
                <Text>Broker Server</Text>
              </OutlinedTextField.Label>
              <OutlinedTextField.Placeholder>
                <Text>Broker-Demo</Text>
              </OutlinedTextField.Placeholder>
            </OutlinedTextField>

            {errorMessage ? (
              <Surface
                border={{ color: palette.danger, width: 1 }}
                color="rgba(255, 95, 109, 0.14)"
                modifiers={[fillMaxWidth()]}
              >
                <Column
                  modifiers={[fillMaxWidth(), paddingAll(16)]}
                  verticalArrangement={{ spacedBy: 6 }}
                >
                  <Text
                    color={palette.dangerSoft}
                    style={{
                      fontWeight: "700",
                      letterSpacing: 0.4,
                      typography: "labelMedium",
                    }}
                  >
                    CONNECTION ISSUE
                  </Text>
                  <Text
                    color={palette.text}
                    style={{
                      fontSize: 14,
                      lineHeight: 20,
                      typography: "bodyMedium",
                    }}
                  >
                    {errorMessage}
                  </Text>
                </Column>
              </Surface>
            ) : null}

            <Button
              enabled={!isSubmitting}
              modifiers={[fillMaxWidth()]}
              onClick={onSubmit}
            >
              <Text>
                {isSubmitting ? "Connecting..." : "Connect and Sign In"}
              </Text>
            </Button>

            <Text
              color={palette.textDim}
              style={{
                fontSize: 12,
                lineHeight: 18,
                typography: "bodySmall",
              }}
            >
              {isHydrating
                ? "Checking the existing server session..."
                : "Expected backend: Windows Server + MT5 terminal + BurrFx API on port 8000."}
            </Text>
          </Column>
        </OutlinedCard>
      </LazyColumn>
    </Host>
  );
}
