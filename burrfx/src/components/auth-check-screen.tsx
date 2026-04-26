import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";

export function AuthCheckScreen() {
  const { colors } = useAppTheme();
  const { height } = useWindowDimensions();

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        minHeight: height,
        paddingHorizontal: 24,
        paddingTop: 28,
        paddingBottom: 32,
        backgroundColor: colors.background,
      }}
      contentInsetAdjustmentBehavior="automatic"
      scrollEnabled={false}
    >
      <View className="flex-1 justify-center gap-6">
        <View
          className="absolute right-[-48px] top-3 h-[220px] w-[220px] rounded-full"
          style={{
            backgroundColor: colors.heroOrbPrimary,
          }}
        />
        <View
          className="absolute bottom-8 left-[-72px] h-[180px] w-[180px] rounded-full"
          style={{
            backgroundColor: colors.heroOrbSecondary,
          }}
        />

        <View
          className="gap-[18px] rounded-[32px] border p-6"
          style={{
            borderCurve: "continuous",
            borderColor: colors.borderSoft,
            backgroundColor: colors.panelMuted,
            boxShadow: colors.shadowLg,
          }}
        >
          <View className="gap-2">
            <Text
              className="text-[12px] font-bold uppercase tracking-[0.9px]"
              selectable
              style={{
                color: colors.textDim,
              }}
            >
              Session Check
            </Text>
            <Text
              className="text-[30px] font-black leading-[34px]"
              selectable
              style={{
                color: colors.text,
              }}
            >
              Restoring your BurrFx session.
            </Text>
            <Text
              className="text-[15px] leading-[22px]"
              selectable
              style={{
                color: colors.textMuted,
              }}
            >
              Checking the saved server connection so the app can reopen the
              last authenticated state without flashing back to sign in.
            </Text>
          </View>

          <View
            className="flex-row items-center gap-3 rounded-[20px] px-4 py-[14px]"
            style={{
              borderCurve: "continuous",
              backgroundColor: colors.surfaceRaised,
            }}
          >
            <ActivityIndicator color={colors.accent} />
            <Text
              className="text-[14px] font-bold"
              selectable
              style={{
                color: colors.text,
              }}
            >
              Connecting to the saved BurrFx session...
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
