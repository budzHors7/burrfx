import { Redirect } from "expo-router";

import { AuthCheckScreen } from "@/components/auth-check-screen";
import { AuthScreenView } from "@/features/auth/auth-screen-view";
import { useAuthScreenViewModel } from "@/features/auth/use-auth-screen-view-model";

export default function AuthScreen() {
  const { isAuthenticated, viewProps } = useAuthScreenViewModel();

  if (viewProps.isHydrating) {
    return <AuthCheckScreen />;
  }

  if (isAuthenticated) {
    return <Redirect href="/dashboard" />;
  }

  return <AuthScreenView {...viewProps} />;
}
