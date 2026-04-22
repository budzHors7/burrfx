import { useThemeModeContext } from "@/providers/theme-mode-provider";

export function useAppTheme() {
  return useThemeModeContext();
}

