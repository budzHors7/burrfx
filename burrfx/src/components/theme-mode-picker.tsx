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
    <View className="gap-3">
      <View className="gap-1">
        <Text
          className="text-[18px] font-extrabold"
          selectable
          style={{
            color: colors.text,
          }}
        >
          Theme mode
        </Text>
        <Text
          className="text-[13px] leading-[18px]"
          selectable
          style={{
            color: colors.textMuted,
          }}
        >
          Choose a fixed light or dark look, or let BurrFx match the device.
        </Text>
      </View>

      <View
        className="flex-row gap-2 rounded-[20px] border p-1"
        style={{
          borderCurve: "continuous",
          borderColor: colors.borderSoft,
          backgroundColor: colors.surfaceRaised,
        }}
      >
        {THEME_OPTIONS.map((option) => {
          const isSelected = option.mode === mode;

          return (
            <Pressable
              key={option.mode}
              accessibilityRole="button"
              className="min-h-[42px] flex-1 items-center justify-center rounded-[16px]"
              onPress={() => {
                setMode(option.mode);
              }}
              style={({ pressed }) => ({
                borderCurve: "continuous",
                borderWidth: 1,
                borderColor: isSelected
                  ? colors.accentDeep
                  : "transparent",
                backgroundColor: isSelected
                  ? colors.accent
                  : "transparent",
                opacity: pressed ? 0.92 : 1,
              })}
            >
                <Text
                  className="text-[13px] font-bold"
                  selectable
                  style={{
                    color: isSelected
                      ? colors.textOnAccent
                      : colors.text,
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
        className="text-[12px] leading-[18px]"
        selectable
        style={{
          color: colors.textDim,
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
        <View className="gap-3">
          <View className="gap-1">
            <Text
              className="text-[18px] font-extrabold"
              selectable
              style={{
                color: colors.text,
              }}
            >
              Android colors
            </Text>
            <Text
              className="text-[13px] leading-[18px]"
              selectable
              style={{
                color: colors.textMuted,
              }}
            >
              Keep BurrFx blue or let Android supply system accent colors.
            </Text>
          </View>

          <View className="gap-2">
            {ACCENT_OPTIONS.map((option) => {
              const isSelected =
                option.mode === accentStyle;

              return (
                <Pressable
                  key={option.mode}
                  accessibilityRole="button"
                  className="min-h-[46px] items-center justify-center rounded-[16px] border"
                  onPress={() => {
                    setAccentStyle(option.mode);
                  }}
                  style={({ pressed }) => ({
                    borderCurve: "continuous",
                    borderColor: isSelected
                      ? colors.accentDeep
                      : colors.borderSoft,
                    backgroundColor: isSelected
                      ? colors.accent
                      : colors.surfaceRaised,
                    opacity: pressed ? 0.92 : 1,
                  })}
                >
                  <Text
                    className="text-[13px] font-extrabold"
                    selectable
                    style={{
                      color: isSelected
                        ? colors.textOnAccent
                        : colors.text,
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
