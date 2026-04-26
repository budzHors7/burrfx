import {
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";

type DrawOverlayPermissionModalProps = {
  visible: boolean;
  onAllow: () => void;
  onCancel: () => void;
};

export function DrawOverlayPermissionModal({
  visible,
  onAllow,
  onCancel,
}: DrawOverlayPermissionModalProps) {
  const { colors } = useAppTheme();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      transparent
      visible={visible}
    >
      <View
        className="flex-1 justify-center px-5"
        style={{
          backgroundColor: "rgba(7, 13, 20, 0.54)",
        }}
      >
        <View
          className="gap-[18px] rounded-[28px] border p-[22px]"
          style={{
            borderCurve: "continuous",
            borderColor: colors.borderSoft,
            backgroundColor: colors.surface,
            boxShadow: colors.shadowLg,
          }}
        >
          <View className="gap-2">
            <Text
              className="text-[24px] font-extrabold"
              selectable
              style={{
                color: colors.text,
              }}
            >
              Allow floating window access
            </Text>
            <Text
              className="text-[14px] leading-[21px]"
              selectable
              style={{
                color: colors.textMuted,
              }}
            >
              BurrFx needs Android&apos;s draw-over-apps permission to keep the
              floating trade window visible above other apps. Tap Allow to open
              the system settings page.
            </Text>
          </View>

          <View className="flex-row gap-2.5">
            <PermissionButton
              label="Cancel"
              variant="secondary"
              onPress={onCancel}
            />
            <PermissionButton
              label="Allow"
              variant="primary"
              onPress={onAllow}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PermissionButton({
  label,
  onPress,
  variant,
}: {
  label: string;
  onPress: () => void;
  variant: "primary" | "secondary";
}) {
  const { colors } = useAppTheme();

  const backgroundColor =
    variant === "primary"
      ? colors.accent
      : colors.surfaceRaised;
  const textColor =
    variant === "primary"
      ? colors.textOnAccent
      : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      className="min-h-[50px] flex-1 items-center justify-center rounded-[18px] border"
      onPress={onPress}
      style={({ pressed }) => ({
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor:
          variant === "secondary"
            ? colors.borderSoft
            : colors.accentDeep,
        backgroundColor,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <Text
        className="text-[15px] font-extrabold"
        selectable
        style={{
          color: textColor,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
