import { Stack } from "expo-router";

export default function LogsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="logs"
        options={{
          title: "Logs",
        }}
      />
    </Stack>
  );
}
