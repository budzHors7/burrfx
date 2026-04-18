import { Stack } from "expo-router";

export default function TradesStackLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="trades"
        options={{
          title: "Trades",
        }}
      />
    </Stack>
  );
}
