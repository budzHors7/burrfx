import { View } from "react-native";

import { SkeletonBlock } from "@/components/skeleton-block";
import { useAppTheme } from "@/hooks/use-app-theme";

export function JournalEntrySkeleton() {
  const { colors } = useAppTheme();

  return (
    <View
      className="gap-[14px] rounded-[24px] border p-[18px]"
      style={{
        borderCurve: "continuous",
        borderColor: colors.borderSoft,
        backgroundColor: colors.panel,
        boxShadow: colors.shadowMd,
      }}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-2">
          <SkeletonBlock height={18} width="58%" borderRadius={10} />
          <SkeletonBlock height={12} width="42%" borderRadius={8} />
        </View>
        <SkeletonBlock height={28} width={92} borderRadius={999} />
      </View>

      <View className="flex-row flex-wrap gap-2.5">
        <MetricSkeleton />
        <MetricSkeleton />
        <MetricSkeleton />
        <MetricSkeleton />
      </View>
    </View>
  );
}

function MetricSkeleton() {
  const { colors } = useAppTheme();

  return (
    <View
      className="min-w-[47%] flex-1 gap-1.5 rounded-[16px] px-3 py-2.5"
      style={{
        borderCurve: "continuous",
        backgroundColor: colors.surfaceRaised,
      }}
    >
      <SkeletonBlock height={10} width="54%" borderRadius={8} />
      <SkeletonBlock height={14} width="72%" borderRadius={8} />
    </View>
  );
}
