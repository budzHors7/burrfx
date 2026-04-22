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
    <View style={{ gap: 14 }}>
      {eyebrow ? (
        <Text
          selectable
          style={{
            color: colors.textDim,
            fontSize: 12,
            fontWeight: "700",
            letterSpacing: 0.9,
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <View style={{ flex: 1, minWidth: 240, gap: 8 }}>
          <Text
            selectable
            style={{
              color: colors.text,
              fontSize: 30,
              lineHeight: 34,
              fontWeight: "900",
            }}
          >
            {title}
          </Text>
          <Text
            selectable
            style={{
              color: colors.textMuted,
              fontSize: 15,
              lineHeight: 22,
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

