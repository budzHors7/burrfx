import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";

import { useAppTheme } from "@/hooks/use-app-theme";
import { AppSessionProvider } from "@/providers/app-session-provider";
import { ThemeModeProvider } from "@/providers/theme-mode-provider";

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
    <AppSessionProvider>
      <>
        <StatusBar
          animated
          style={
            resolvedMode === "dark" ? "light" : "dark"
          }
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
    </AppSessionProvider>
  );
}
