import "expo-sqlite/localStorage/install";
import { Platform } from "react-native";

import type {
  ThemeAccentStyle,
  ThemeMode,
} from "@/lib/theme";

const THEME_MODE_STORAGE_KEY = "burrfx.theme-mode";
const THEME_ACCENT_STORAGE_KEY =
  "burrfx.theme-accent-style";

const VALID_THEME_MODES = new Set<ThemeMode>([
  "system",
  "light",
  "dark",
]);
const VALID_THEME_ACCENT_STYLES =
  new Set<ThemeAccentStyle>(["blue", "system"]);

function canUseStorage() {
  return typeof localStorage !== "undefined";
}

function getDefaultThemeAccentStyle(): ThemeAccentStyle {
  return Platform.OS === "android"
    ? "system"
    : "blue";
}

export function readPersistedThemeMode(): ThemeMode {
  if (!canUseStorage()) {
    return "system";
  }

  try {
    const value = localStorage.getItem(
      THEME_MODE_STORAGE_KEY
    );

    if (
      value === null ||
      !VALID_THEME_MODES.has(value as ThemeMode)
    ) {
      return "system";
    }

    return value as ThemeMode;
  } catch {
    return "system";
  }
}

export function updatePersistedThemeMode(
  mode: ThemeMode
) {
  if (!canUseStorage()) {
    return;
  }

  try {
    localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
  } catch {
    return;
  }
}

export function readPersistedThemeAccentStyle(): ThemeAccentStyle {
  if (!canUseStorage()) {
    return getDefaultThemeAccentStyle();
  }

  try {
    const value = localStorage.getItem(
      THEME_ACCENT_STORAGE_KEY
    );

    if (
      value === null ||
      !VALID_THEME_ACCENT_STYLES.has(
        value as ThemeAccentStyle
      )
    ) {
      return getDefaultThemeAccentStyle();
    }

    return value as ThemeAccentStyle;
  } catch {
    return getDefaultThemeAccentStyle();
  }
}

export function updatePersistedThemeAccentStyle(
  accentStyle: ThemeAccentStyle
) {
  if (!canUseStorage()) {
    return;
  }

  try {
    localStorage.setItem(
      THEME_ACCENT_STORAGE_KEY,
      accentStyle
    );
  } catch {
    return;
  }
}
