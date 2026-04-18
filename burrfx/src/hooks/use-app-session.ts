import { useAppSessionContext } from "@/providers/app-session-provider";

export function useAppSession() {
  return useAppSessionContext();
}
