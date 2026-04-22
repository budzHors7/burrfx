import { Stack } from "expo-router";

export default function JournalStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="journal"
        options={{
          title: "Journal",
        }}
      />
    </Stack>
  );
}
