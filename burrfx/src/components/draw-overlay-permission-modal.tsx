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
        style={{
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: 20,
          backgroundColor: "rgba(7, 13, 20, 0.54)",
        }}
      >
        <View
          style={{
            gap: 18,
            borderRadius: 28,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: colors.borderSoft,
            backgroundColor: colors.surface,
            padding: 22,
            boxShadow: colors.shadowLg,
          }}
        >
          <View style={{ gap: 8 }}>
            <Text
              selectable
              style={{
                color: colors.text,
                fontSize: 24,
                fontWeight: "800",
              }}
            >
              Allow floating window access
            </Text>
            <Text
              selectable
              style={{
                color: colors.textMuted,
                fontSize: 14,
                lineHeight: 21,
              }}
            >
              BurrFx needs Android&apos;s draw-over-apps permission to keep the
              floating trade window visible above other apps. Tap Allow to open
              the system settings page.
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              gap: 10,
            }}
          >
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
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 50,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 18,
        borderCurve: "continuous",
        borderWidth: variant === "secondary" ? 1 : 0,
        borderColor:
          variant === "secondary"
            ? colors.borderSoft
            : "transparent",
        backgroundColor,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <Text
        selectable
        style={{
          color: textColor,
          fontSize: 15,
          fontWeight: "800",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
