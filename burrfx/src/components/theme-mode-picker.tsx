import {
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import type {
  ThemeAccentStyle,
  ThemeMode,
} from "@/lib/theme";

const THEME_OPTIONS: Array<{
  mode: ThemeMode;
  label: string;
}> = [
  { mode: "system", label: "System" },
  { mode: "light", label: "Light" },
  { mode: "dark", label: "Dark" },
];

const ACCENT_OPTIONS: Array<{
  mode: ThemeAccentStyle;
  label: string;
}> = [
  { mode: "blue", label: "BurrFx Blue" },
  { mode: "system", label: "System Colors" },
];

export function ThemeModePicker() {
  const {
    accentStyle,
    colors,
    isDark,
    mode,
    resolvedMode,
    setAccentStyle,
    setMode,
  } = useAppTheme();

  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 4 }}>
        <Text
          selectable
          style={{
            color: colors.text,
            fontSize: 18,
            fontWeight: "800",
          }}
        >
          Theme mode
        </Text>
        <Text
          selectable
          style={{
            color: colors.textMuted,
            fontSize: 13,
            lineHeight: 18,
          }}
        >
          Choose a fixed light or dark look, or let BurrFx match the device.
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: 8,
          borderRadius: 20,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: colors.borderSoft,
          backgroundColor: colors.surfaceRaised,
          padding: 4,
        }}
      >
        {THEME_OPTIONS.map((option) => {
          const isSelected = option.mode === mode;

          return (
            <Pressable
              key={option.mode}
              accessibilityRole="button"
              onPress={() => {
                setMode(option.mode);
              }}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 42,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 16,
                borderCurve: "continuous",
                backgroundColor: isSelected
                  ? colors.accent
                  : "transparent",
                opacity: pressed ? 0.92 : 1,
              })}
            >
              <Text
                selectable
                style={{
                  color: isSelected
                    ? colors.textOnAccent
                    : colors.textMuted,
                  fontSize: 13,
                  fontWeight: isSelected ? "800" : "700",
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text
        selectable
        style={{
          color: colors.textDim,
          fontSize: 12,
          lineHeight: 18,
        }}
      >
        Active appearance:{" "}
        <Text
          selectable
          style={{
            color: isDark ? colors.accent : colors.accentDeep,
            fontWeight: "800",
          }}
        >
          {resolvedMode === "dark" ? "Dark" : "Light"}
        </Text>
      </Text>

      {Platform.OS === "android" ? (
        <View style={{ gap: 12 }}>
          <View style={{ gap: 4 }}>
            <Text
              selectable
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: "800",
              }}
            >
              Android colors
            </Text>
            <Text
              selectable
              style={{
                color: colors.textMuted,
                fontSize: 13,
                lineHeight: 18,
              }}
            >
              Keep BurrFx blue or let Android supply system accent colors.
            </Text>
          </View>

          <View
            style={{
              gap: 8,
            }}
          >
            {ACCENT_OPTIONS.map((option) => {
              const isSelected =
                option.mode === accentStyle;

              return (
                <Pressable
                  key={option.mode}
                  accessibilityRole="button"
                  onPress={() => {
                    setAccentStyle(option.mode);
                  }}
                  style={({ pressed }) => ({
                    minHeight: 46,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 16,
                    borderCurve: "continuous",
                    borderWidth: 1,
                    borderColor: isSelected
                      ? colors.accent
                      : colors.borderSoft,
                    backgroundColor: isSelected
                      ? colors.accentSoft
                      : colors.surfaceRaised,
                    opacity: pressed ? 0.92 : 1,
                  })}
                >
                  <Text
                    selectable
                    style={{
                      color: isSelected
                        ? colors.accentDeep
                        : colors.text,
                      fontSize: 13,
                      fontWeight: "800",
                    }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}
