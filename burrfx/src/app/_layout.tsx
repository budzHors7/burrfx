import { Stack } from "expo-router";

import { AppSessionProvider } from "@/providers/app-session-provider";

export default function RootLayout() {
  return (
    <AppSessionProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </AppSessionProvider>
  );
}
