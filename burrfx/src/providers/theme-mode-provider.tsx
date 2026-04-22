import { setBackgroundColorAsync } from "expo-system-ui";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import {
  Appearance,
  Platform,
  useColorScheme,
} from "react-native";

import {
  getThemePalette,
  type ResolvedThemeMode,
  type ThemeAccentStyle,
  type ThemeMode,
} from "@/lib/theme";
import {
  readPersistedThemeAccentStyle,
  readPersistedThemeMode,
  updatePersistedThemeAccentStyle,
  updatePersistedThemeMode,
} from "@/lib/theme-storage";
import { updateTradeOverlaySnapshot } from "@/lib/trade-overlay-store";

type ThemeModeContextValue = {
  mode: ThemeMode;
  accentStyle: ThemeAccentStyle;
  resolvedMode: ResolvedThemeMode;
  isDark: boolean;
  colors: ReturnType<typeof getThemePalette>;
  setMode: (mode: ThemeMode) => void;
  setAccentStyle: (accentStyle: ThemeAccentStyle) => void;
};

const ThemeModeContext =
  createContext<ThemeModeContextValue | null>(null);

export function ThemeModeProvider({
  children,
}: PropsWithChildren) {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(() =>
    readPersistedThemeMode()
  );
  const [accentStyle, setAccentStyle] =
    useState<ThemeAccentStyle>(() =>
      readPersistedThemeAccentStyle()
    );

  const resolvedMode: ResolvedThemeMode =
    mode === "system"
      ? systemColorScheme === "dark"
        ? "dark"
        : "light"
      : mode;

  const colors = useMemo(
    () =>
      getThemePalette(
        resolvedMode,
        Platform.OS === "android"
          ? accentStyle
          : "blue"
      ),
    [accentStyle, resolvedMode]
  );

  useEffect(() => {
    updatePersistedThemeMode(mode);

    Appearance.setColorScheme(
      mode === "system" ? "unspecified" : mode
    );
  }, [mode]);

  useEffect(() => {
    updatePersistedThemeAccentStyle(accentStyle);
  }, [accentStyle]);

  useEffect(() => {
    void setBackgroundColorAsync(colors.background).catch(() => {
      return;
    });
  }, [colors.background]);

  useEffect(() => {
    updateTradeOverlaySnapshot({
      accentStyle,
      resolvedThemeMode: resolvedMode,
    });
  }, [accentStyle, resolvedMode]);

  const value = useMemo<ThemeModeContextValue>(
    () => ({
      mode,
      accentStyle,
      resolvedMode,
      isDark: resolvedMode === "dark",
      colors,
      setMode,
      setAccentStyle,
    }),
    [accentStyle, colors, mode, resolvedMode]
  );

  return (
    <ThemeModeContext.Provider value={value}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeModeContext() {
  const context = useContext(ThemeModeContext);

  if (context === null) {
    throw new Error(
      "useThemeModeContext must be used within ThemeModeProvider."
    );
  }

  return context;
}
