import {
  View,
  type DimensionValue,
} from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";

type SkeletonBlockProps = {
  width?: DimensionValue;
  height: number;
  borderRadius?: number;
};

export function SkeletonBlock({
  width = "100%",
  height,
  borderRadius = 12,
}: SkeletonBlockProps) {
  const { isDark } = useAppTheme();

  return (
    <View
      className="shrink-0"
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: isDark
          ? "#17354d"
          : "#eef4f9",
        opacity: isDark ? 0.75 : 0.95,
      }}
    />
  );
}
