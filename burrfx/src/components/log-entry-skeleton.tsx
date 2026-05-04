import { View } from "react-native";

import { SkeletonBlock } from "@/components/skeleton-block";
import { useAppTheme } from "@/hooks/use-app-theme";

export function LogEntrySkeleton() {
  const { colors } = useAppTheme();

  return (
    <View
      className="gap-3 rounded-[24px] border p-[18px]"
      style={{
        borderCurve: "continuous",
        borderColor: colors.borderSoft,
        backgroundColor: colors.panel,
        boxShadow: colors.shadowMd,
      }}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-2">
          <SkeletonBlock height={20} width="68%" borderRadius={10} />
          <SkeletonBlock height={12} width="44%" borderRadius={8} />
        </View>
        <SkeletonBlock height={28} width={88} borderRadius={999} />
      </View>

      <View className="gap-2">
        <SkeletonBlock height={13} width="100%" borderRadius={8} />
        <SkeletonBlock height={13} width="92%" borderRadius={8} />
      </View>

      <View
        className="gap-2 rounded-[18px] p-3"
        style={{
          borderCurve: "continuous",
          backgroundColor: colors.surfaceRaised,
        }}
      >
        <SkeletonBlock height={12} width="88%" borderRadius={8} />
        <SkeletonBlock height={12} width="74%" borderRadius={8} />
      </View>
    </View>
  );
}
