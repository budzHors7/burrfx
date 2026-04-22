import type {
  AccountLogsResponse,
  AccountOverviewResponse,
  AuthLoginPayload,
  AuthLoginResponse,
  AuthLogoutResponse,
  AuthSessionResponse,
  BotControlResponse,
  BotStatusResponse,
  OpenTradesResponse,
} from "@/types/api";

const API_PREFIX = "/api/v1";
const REQUEST_TIMEOUT_MS = 15000;

export const defaultApiBaseUrl =
  process.env.EXPO_PUBLIC_BURRFX_API_URL?.trim() ?? "";

type JsonValue = Record<string, unknown> | null;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: JsonValue
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function normalizeBaseUrl(
  value: string
): string {
  return value.trim().replace(/\/+$/, "");
}

function resolveApiRoot(
  baseUrl: string
): string {
  const normalized = normalizeBaseUrl(baseUrl);

  if (!normalized) {
    throw new ApiError(
      "Add the API URL for your BurrFx server before connecting.",
      0
    );
  }

  if (normalized.endsWith(API_PREFIX)) {
    return normalized;
  }

  return `${normalized}${API_PREFIX}`;
}

function buildApiUrl(
  baseUrl: string,
  path: string
): string {
  const root = resolveApiRoot(baseUrl);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${root}${normalizedPath}`;
}

async function parseJsonSafe(
  response: Response
): Promise<JsonValue> {
  try {
    const payload = (await response.json()) as JsonValue;
    return payload;
  } catch {
    return null;
  }
}

function getErrorMessage(
  payload: JsonValue,
  fallback: string
): string {
  if (
    payload &&
    typeof payload.detail === "string" &&
    payload.detail.trim()
  ) {
    return payload.detail;
  }

  if (
    payload &&
    typeof payload.message === "string" &&
    payload.message.trim()
  ) {
    return payload.message;
  }

  return fallback;
}

async function requestJson<T>(
  baseUrl: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      buildApiUrl(baseUrl, path),
      {
        ...init,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(init?.headers ?? {}),
        },
        signal: controller.signal,
      }
    );
    const payload = await parseJsonSafe(response);

    if (!response.ok) {
      throw new ApiError(
        getErrorMessage(
          payload,
          `Request failed with status ${response.status}.`
        ),
        response.status,
        payload
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new ApiError(
        "The BurrFx server took too long to respond.",
        0
      );
    }

    throw new ApiError(
      "Unable to reach the BurrFx server. Check the API URL and make sure the Windows server is reachable from this device.",
      0
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  normalizeBaseUrl,
  getSession(baseUrl: string) {
    return requestJson<AuthSessionResponse>(
      baseUrl,
      "/auth/session"
    );
  },
  login(
    baseUrl: string,
    payload: AuthLoginPayload
  ) {
    return requestJson<AuthLoginResponse>(
      baseUrl,
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },
  logout(baseUrl: string) {
    return requestJson<AuthLogoutResponse>(
      baseUrl,
      "/auth/logout",
      {
        method: "POST",
      }
    );
  },
  getAccountOverview(baseUrl: string) {
    return requestJson<AccountOverviewResponse>(
      baseUrl,
      "/account/overview"
    );
  },
  getAccountLogs(
    baseUrl: string,
    limit = 120
  ) {
    return requestJson<AccountLogsResponse>(
      baseUrl,
      `/account/logs?limit=${limit}`
    );
  },
  getOpenTrades(baseUrl: string) {
    return requestJson<OpenTradesResponse>(
      baseUrl,
      "/trades/open"
    );
  },
  getBotStatus(baseUrl: string) {
    return requestJson<BotStatusResponse>(
      baseUrl,
      "/bot/status"
    );
  },
  startBot(baseUrl: string) {
    return requestJson<BotControlResponse>(
      baseUrl,
      "/bot/start",
      {
        method: "POST",
      }
    );
  },
  stopBot(baseUrl: string) {
    return requestJson<BotControlResponse>(
      baseUrl,
      "/bot/stop",
      {
        method: "POST",
      }
    );
  },
};
