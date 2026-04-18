import { Stack } from "expo-router";

export default function DashboardStackLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
        }}
      />
    </Stack>
  );
}
