import { Color } from "expo-router";
import {
  Platform,
  type ColorValue,
} from "react-native";

export type ThemeMode = "system" | "light" | "dark";

export type ThemeAccentStyle = "blue" | "system";

export type ResolvedThemeMode = "light" | "dark";

export type ThemePalette = {
  background: string;
  backgroundSoft: string;
  surface: string;
  surfaceRaised: string;
  surfaceAlt: string;
  panel: string;
  panelMuted: string;
  border: ColorValue;
  borderSoft: ColorValue;
  accent: ColorValue;
  accentDeep: ColorValue;
  accentSoft: ColorValue;
  success: ColorValue;
  successSoft: ColorValue;
  warning: ColorValue;
  warningSoft: ColorValue;
  danger: ColorValue;
  dangerSoft: ColorValue;
  text: string;
  textMuted: string;
  textDim: string;
  textOnAccent: ColorValue;
  inputBackground: string;
  errorBackground: string;
  heroOrbPrimary: ColorValue;
  heroOrbSecondary: string;
  tabBarBackground: string;
  tabBarShadow: ColorValue;
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
};

export type NativeWindThemeVariables = Record<
  `--${string}`,
  string | number
>;

export const darkPalette: ThemePalette = {
  background: "#04111d",
  backgroundSoft: "#091d2e",
  surface: "#0b2032",
  surfaceRaised: "#132b3f",
  surfaceAlt: "#17354d",
  panel: "rgba(11, 32, 50, 0.92)",
  panelMuted: "rgba(7, 24, 38, 0.94)",
  border: "#204866",
  borderSoft: "#18354c",
  accent: "#27a7ff",
  accentDeep: "#166db0",
  accentSoft: "#d9f1ff",
  success: "#16c784",
  successSoft: "#d6fff0",
  warning: "#f5b545",
  warningSoft: "#fff1cf",
  danger: "#ff5f6d",
  dangerSoft: "#ffe0e4",
  text: "#f3fbff",
  textMuted: "#a6c0d6",
  textDim: "#7993a7",
  textOnAccent: "#02121e",
  inputBackground: "rgba(9, 24, 36, 0.86)",
  errorBackground: "rgba(255, 95, 109, 0.12)",
  heroOrbPrimary: "rgba(39, 167, 255, 0.12)",
  heroOrbSecondary: "rgba(22, 199, 132, 0.08)",
  tabBarBackground: "#0a1c2b",
  tabBarShadow: "#102739",
  shadowSm: "0 12px 28px rgba(2, 12, 22, 0.18)",
  shadowMd: "0 18px 40px rgba(2, 12, 22, 0.24)",
  shadowLg: "0 24px 52px rgba(2, 12, 22, 0.28)",
};

export const lightPalette: ThemePalette = {
  background: "#f4f8fb",
  backgroundSoft: "#eaf1f6",
  surface: "#ffffff",
  surfaceRaised: "#eef4f9",
  surfaceAlt: "#dde9f3",
  panel: "rgba(255, 255, 255, 0.96)",
  panelMuted: "rgba(246, 250, 253, 0.96)",
  border: "#c5d5e3",
  borderSoft: "#d8e4ee",
  accent: "#1f7aec",
  accentDeep: "#155bb2",
  accentSoft: "#dbe9ff",
  success: "#149765",
  successSoft: "#d7f8ea",
  warning: "#b47b11",
  warningSoft: "#fff2d2",
  danger: "#d94b5a",
  dangerSoft: "#ffe1e5",
  text: "#122536",
  textMuted: "#4e687d",
  textDim: "#70879b",
  textOnAccent: "#ffffff",
  inputBackground: "#f6fafd",
  errorBackground: "rgba(217, 75, 90, 0.10)",
  heroOrbPrimary: "rgba(31, 122, 236, 0.12)",
  heroOrbSecondary: "rgba(20, 151, 101, 0.08)",
  tabBarBackground: "#fbfdff",
  tabBarShadow: "#d6e0e9",
  shadowSm: "0 12px 24px rgba(15, 23, 42, 0.08)",
  shadowMd: "0 16px 32px rgba(15, 23, 42, 0.10)",
  shadowLg: "0 20px 40px rgba(15, 23, 42, 0.12)",
};

export function getThemePalette(
  resolvedMode: ResolvedThemeMode,
  accentStyle: ThemeAccentStyle = "blue"
) {
  const palette =
    resolvedMode === "dark" ? darkPalette : lightPalette;

  if (
    accentStyle !== "system" ||
    Platform.OS !== "android"
  ) {
    return palette;
  }

  const dynamic = Color.android.dynamic;

  return {
    ...palette,
    border: dynamic.outline,
    borderSoft: dynamic.outlineVariant,
    accent: dynamic.primary,
    accentDeep: dynamic.onPrimaryContainer,
    accentSoft: dynamic.primaryContainer,
    success: dynamic.tertiary,
    successSoft: dynamic.tertiaryContainer,
    warning: dynamic.secondary,
    warningSoft: dynamic.secondaryContainer,
    danger: dynamic.error,
    dangerSoft: dynamic.errorContainer,
    textOnAccent: dynamic.onPrimary,
    heroOrbPrimary: dynamic.primaryContainer,
    tabBarShadow: dynamic.outlineVariant,
  };
}

export function getNativeWindThemeVariables(
  palette: ThemePalette
): NativeWindThemeVariables {
  return {
    "--app-background": palette.background,
    "--app-background-soft": palette.backgroundSoft,
    "--app-surface": palette.surface,
    "--app-surface-raised": palette.surfaceRaised,
    "--app-surface-alt": palette.surfaceAlt,
    "--app-panel": palette.panel,
    "--app-panel-muted": palette.panelMuted,
    "--app-text": palette.text,
    "--app-text-muted": palette.textMuted,
    "--app-text-dim": palette.textDim,
    "--app-input": palette.inputBackground,
    "--app-error-bg": palette.errorBackground,
    "--app-hero-secondary": palette.heroOrbSecondary,
    "--app-tabbar": palette.tabBarBackground,
  };
}
