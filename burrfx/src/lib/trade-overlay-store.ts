import { Platform } from "react-native";
import { useSyncExternalStore } from "react";

import type {
  ResolvedThemeMode,
  ThemeAccentStyle,
} from "@/lib/theme";
import type {
  AccountOverviewResponse,
  OpenTradeItem,
} from "@/types/api";

type TradeOverlaySnapshot = {
  account: AccountOverviewResponse | null;
  trades: OpenTradeItem[];
  resolvedThemeMode: ResolvedThemeMode;
  accentStyle: ThemeAccentStyle;
};

const listeners = new Set<() => void>();

let snapshot: TradeOverlaySnapshot = {
  account: null,
  trades: [],
  resolvedThemeMode: "dark",
  accentStyle:
    Platform.OS === "android"
      ? "system"
      : "blue",
};

function emitChange() {
  listeners.forEach((listener) => {
    listener();
  });
}

export function updateTradeOverlaySnapshot(
  nextSnapshot: Partial<TradeOverlaySnapshot>
) {
  snapshot = {
    ...snapshot,
    ...nextSnapshot,
  };
  emitChange();
}

export function getTradeOverlaySnapshot() {
  return snapshot;
}

export function subscribeToTradeOverlaySnapshot(
  listener: () => void
) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function useTradeOverlaySnapshot() {
  return useSyncExternalStore(
    subscribeToTradeOverlaySnapshot,
    getTradeOverlaySnapshot,
    getTradeOverlaySnapshot
  );
}
