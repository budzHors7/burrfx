import "../../global.css";

import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { VariableContextProvider } from "nativewind";

import { useAppTheme } from "@/hooks/use-app-theme";
import { getNativeWindThemeVariables } from "@/lib/theme";
import { AppSessionProvider } from "@/providers/app-session-provider";
import { ThemeModeProvider } from "@/providers/theme-mode-provider";

SplashScreen.setOptions({
  duration: 240,
  fade: true,
});

export default function RootLayout() {
  return (
    <ThemeModeProvider>
      <ThemedAppLayout />
    </ThemeModeProvider>
  );
}

function ThemedAppLayout() {
  const { colors, resolvedMode } = useAppTheme();

  return (
    <VariableContextProvider
      value={getNativeWindThemeVariables(colors)}
    >
      <AppSessionProvider>
        <AppStartupChrome resolvedMode={resolvedMode} />
      </AppSessionProvider>
    </VariableContextProvider>
  );
}

function AppStartupChrome({
  resolvedMode,
}: {
  resolvedMode: "light" | "dark";
}) {
  const { colors } = useAppTheme();

  return (
    <>
      <StatusBar
        animated
        style={resolvedMode === "dark" ? "light" : "dark"}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      />
    </>
  );
}
