import {
  canDrawOverlays,
  hideBubble,
  requestPermission,
  showBubble,
  useBubbleState,
} from "expo-draw-over-apps";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { TRADE_OVERLAY_BUBBLE_ID } from "@/lib/trade-overlay";

export function useTradeOverlay() {
  const bubbleState = useBubbleState(
    TRADE_OVERLAY_BUBBLE_ID
  );
  const [hasPermission, setHasPermission] = useState(() =>
    canDrawOverlays()
  );
  const [
    isPermissionModalVisible,
    setIsPermissionModalVisible,
  ] = useState(false);
  const pendingShowRef = useRef(false);

  const refreshPermission = useCallback(() => {
    const nextValue = canDrawOverlays();
    setHasPermission(nextValue);

    if (nextValue) {
      setIsPermissionModalVisible(false);
    }

    return nextValue;
  }, []);

  const hideTradeOverlay = useCallback(() => {
    pendingShowRef.current = false;
    return hideBubble(TRADE_OVERLAY_BUBBLE_ID);
  }, []);

  const dismissPermissionModal = useCallback(() => {
    pendingShowRef.current = false;
    setIsPermissionModalVisible(false);
  }, []);

  const showTradeOverlay = useCallback(async () => {
    if (refreshPermission()) {
      pendingShowRef.current = false;
      return showBubble(
        TRADE_OVERLAY_BUBBLE_ID,
        {
          edgeHideEnabled: false,
        }
      );
    }

    setIsPermissionModalVisible(true);
    return false;
  }, [refreshPermission]);

  const openPermissionSettings = useCallback(async () => {
    pendingShowRef.current = true;
    setIsPermissionModalVisible(true);

    const grantedImmediately =
      await requestPermission();
    const granted = grantedImmediately || refreshPermission();

    if (!granted) {
      setIsPermissionModalVisible(true);
      return false;
    }

    pendingShowRef.current = false;
    setIsPermissionModalVisible(false);

    return showBubble(
      TRADE_OVERLAY_BUBBLE_ID,
      {
        edgeHideEnabled: false,
      }
    );
  }, [refreshPermission]);

  const toggleTradeOverlay = useCallback(async () => {
    if (bubbleState.isVisible) {
      hideTradeOverlay();
      return false;
    }

    return showTradeOverlay();
  }, [
    bubbleState.isVisible,
    hideTradeOverlay,
    showTradeOverlay,
  ]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (status) => {
        if (status !== "active") {
          return;
        }

        const granted = refreshPermission();

        if (granted && pendingShowRef.current) {
          pendingShowRef.current = false;
          setIsPermissionModalVisible(false);
          void showBubble(
            TRADE_OVERLAY_BUBBLE_ID,
            {
              edgeHideEnabled: false,
            }
          );
          return;
        }

        if (!granted && pendingShowRef.current) {
          setIsPermissionModalVisible(true);
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [refreshPermission]);

  return {
    hasTradeOverlayPermission: hasPermission,
    isTradeOverlayVisible: bubbleState.isVisible,
    isTradeOverlayPermissionModalVisible:
      isPermissionModalVisible,
    showTradeOverlay,
    hideTradeOverlay,
    toggleTradeOverlay,
    openTradeOverlayPermissionSettings:
      openPermissionSettings,
    dismissTradeOverlayPermissionModal:
      dismissPermissionModal,
  };
}
