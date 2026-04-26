import type { AuthScreenViewProps } from "@/features/auth/auth-screen.types";
import { AuthScreenViewNative } from "@/features/auth/auth-screen-view-native";

export function AuthScreenView(
  props: AuthScreenViewProps
) {
  return <AuthScreenViewNative {...props} />;
}
