import "expo-sqlite/localStorage/install";

import {
  defaultTradingProfileId,
  getTradingProfileOption,
} from "@/lib/trading-profiles";
import type { TradingProfileId } from "@/types/api";

export type PersistedConnectionState = {
  apiBaseUrl: string;
  accountNumber: string;
  server: string;
  tradingProfile: TradingProfileId;
};

const STORAGE_KEY = "burrfx.connection-state";

const EMPTY_CONNECTION_STATE: PersistedConnectionState = {
  apiBaseUrl: "",
  accountNumber: "",
  server: "",
  tradingProfile: defaultTradingProfileId,
};

function canUseStorage() {
  return typeof localStorage !== "undefined";
}

function sanitizeConnectionState(
  value: unknown
): PersistedConnectionState {
  if (!value || typeof value !== "object") {
    return EMPTY_CONNECTION_STATE;
  }

  const record = value as Record<string, unknown>;

  return {
    apiBaseUrl:
      typeof record.apiBaseUrl === "string"
        ? record.apiBaseUrl
        : "",
    accountNumber:
      typeof record.accountNumber === "string"
        ? record.accountNumber
        : "",
    server:
      typeof record.server === "string"
        ? record.server
        : "",
    tradingProfile: getTradingProfileOption(
      typeof record.tradingProfile === "string"
        ? record.tradingProfile
        : defaultTradingProfileId
    ).id,
  };
}

export function readPersistedConnectionState(): PersistedConnectionState {
  if (!canUseStorage()) {
    return EMPTY_CONNECTION_STATE;
  }

  try {
    const rawValue = localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return EMPTY_CONNECTION_STATE;
    }

    return sanitizeConnectionState(JSON.parse(rawValue));
  } catch {
    return EMPTY_CONNECTION_STATE;
  }
}

export function updatePersistedConnectionState(
  value: Partial<PersistedConnectionState>
) {
  if (!canUseStorage()) {
    return;
  }

  const nextValue = {
    ...readPersistedConnectionState(),
    ...value,
  };

  try {
    if (
      !nextValue.apiBaseUrl &&
      !nextValue.accountNumber &&
      !nextValue.server &&
      nextValue.tradingProfile === defaultTradingProfileId
    ) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(nextValue)
    );
  } catch {
    return;
  }
}
