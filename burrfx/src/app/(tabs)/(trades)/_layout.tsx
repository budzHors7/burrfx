import { Stack } from "expo-router";

export default function TradesStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="trades"
        options={{
          title: "Trades",
        }}
      />
    </Stack>
  );
}
