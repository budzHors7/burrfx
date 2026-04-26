import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";

type PageHeadingProps = {
  title: string;
  description: string;
  eyebrow?: string;
  accessory?: ReactNode;
};

export function PageHeading({
  title,
  description,
  eyebrow,
  accessory,
}: PageHeadingProps) {
  const { colors } = useAppTheme();

  return (
    <View className="gap-[14px]">
      {eyebrow ? (
        <Text
          className="text-[12px] font-bold uppercase tracking-[0.9px]"
          selectable
          style={{
            color: colors.textDim,
          }}
        >
          {eyebrow}
        </Text>
      ) : null}

      <View
        className="flex-row flex-wrap items-start justify-between gap-4"
      >
        <View className="min-w-[240px] flex-1 gap-2">
          <Text
            className="text-[30px] font-black leading-[34px]"
            selectable
            style={{
              color: colors.text,
            }}
          >
            {title}
          </Text>
          <Text
            className="text-[15px] leading-[22px]"
            selectable
            style={{
              color: colors.textMuted,
            }}
          >
            {description}
          </Text>
        </View>

        {accessory ? <View>{accessory}</View> : null}
      </View>
    </View>
  );
}
