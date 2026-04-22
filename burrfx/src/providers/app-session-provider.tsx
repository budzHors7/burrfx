import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { Platform } from "react-native";

import { ApiError, api, defaultApiBaseUrl } from "@/lib/api";
import { appendAccountJournalSnapshot } from "@/lib/account-journal";
import {
  readPersistedConnectionState,
  updatePersistedConnectionState,
} from "@/lib/auth-storage";
import { TRADE_OVERLAY_BUBBLE_ID } from "@/lib/trade-overlay";
import { updateTradeOverlaySnapshot } from "@/lib/trade-overlay-store";
import { getTradingProfileOption } from "@/lib/trading-profiles";
import type {
  AccountLogEntry,
  AccountLogsResponse,
  AccountOverviewResponse,
  AuthLoginResponse,
  AuthSessionResponse,
  BotStatusResponse,
  OpenTradeItem,
  TradingProfileId,
} from "@/types/api";

type LoginInput = {
  apiBaseUrl: string;
  accountNumber: string;
  password: string;
  server: string;
  tradingProfile: TradingProfileId;
};

type DrawOverAppsModule = typeof import("expo-draw-over-apps");

type AppSessionContextValue = {
  apiBaseUrl: string;
  session: AuthSessionResponse | null;
  account: AccountOverviewResponse | null;
  trades: OpenTradeItem[];
  botStatus: BotStatusResponse | null;
  logs: AccountLogEntry[];
  logSourceFile: string | null;
  journalRevision: number;
  errorMessage: string | null;
  isHydrating: boolean;
  isRefreshing: boolean;
  isSubmitting: boolean;
  isAuthenticated: boolean;
  setApiBaseUrl: (value: string) => void;
  login: (input: LoginInput) => Promise<AuthLoginResponse>;
  logout: () => Promise<void>;
  refreshAll: (options?: { silent?: boolean }) => Promise<void>;
  startBot: () => Promise<void>;
  stopBot: () => Promise<void>;
  clearError: () => void;
};

const AppSessionContext = createContext<AppSessionContextValue | null>(null);

const initialConnectionState =
  readPersistedConnectionState();

function getErrorMessage(
  error: unknown
): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong while talking to the BurrFx server.";
}

function getEmptyLogsResponse(): AccountLogsResponse {
  return {
    count: 0,
    source_file: null,
    entries: [],
  };
}

export function AppSessionProvider({
  children,
}: PropsWithChildren) {
  const [apiBaseUrl, setApiBaseUrlState] = useState(() =>
    api.normalizeBaseUrl(
      initialConnectionState.apiBaseUrl ||
        defaultApiBaseUrl
    )
  );
  const [session, setSession] = useState<AuthSessionResponse | null>(null);
  const [account, setAccount] = useState<AccountOverviewResponse | null>(null);
  const [trades, setTrades] = useState<OpenTradeItem[]>([]);
  const [botStatus, setBotStatus] = useState<BotStatusResponse | null>(null);
  const [logs, setLogs] = useState<AccountLogEntry[]>([]);
  const [logSourceFile, setLogSourceFile] =
    useState<string | null>(null);
  const [journalRevision, setJournalRevision] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(() =>
    Boolean(
      api.normalizeBaseUrl(
        initialConnectionState.apiBaseUrl ||
          defaultApiBaseUrl
      )
    )
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasHydratedOnceRef = useRef(false);
  const initialApiBaseUrlRef = useRef(
    api.normalizeBaseUrl(
      initialConnectionState.apiBaseUrl ||
        defaultApiBaseUrl
    )
  );
  const overlayModuleRef =
    useRef<DrawOverAppsModule | null>(null);
  const latestTradesRef = useRef<OpenTradeItem[]>([]);
  const latestSessionAuthenticatedRef =
    useRef(false);

  const isAuthenticated = Boolean(session?.authenticated);

  function clearAuthedData() {
    startTransition(() => {
      setAccount(null);
      setTrades([]);
      setLogs([]);
      setLogSourceFile(null);
    });
  }

  function applySnapshot(
    nextSession: AuthSessionResponse,
    nextAccount: AccountOverviewResponse | null,
    nextTrades: OpenTradeItem[],
    nextBotStatus: BotStatusResponse | null,
    nextLogs: AccountLogEntry[],
    nextLogSourceFile: string | null
  ) {
    startTransition(() => {
      setSession(nextSession);
      setAccount(nextAccount);
      setTrades(nextTrades);
      setBotStatus(nextBotStatus);
      setLogs(nextLogs);
      setLogSourceFile(nextLogSourceFile);
    });
  }

  async function loadAccountLogsSafe(
    targetBaseUrl: string
  ) {
    try {
      return await api.getAccountLogs(targetBaseUrl);
    } catch {
      return getEmptyLogsResponse();
    }
  }

  async function loadSnapshot(
    baseUrlOverride?: string
  ) {
    const targetBaseUrl = api.normalizeBaseUrl(
      baseUrlOverride ?? apiBaseUrl
    );

    if (!targetBaseUrl) {
      startTransition(() => {
        setSession(null);
        setBotStatus(null);
        setLogs([]);
        setLogSourceFile(null);
      });
      clearAuthedData();
      return;
    }

    const nextSession = await api.getSession(targetBaseUrl);
    const nextBotStatus = await api.getBotStatus(targetBaseUrl);

    if (!nextSession.authenticated) {
      applySnapshot(
        nextSession,
        null,
        [],
        nextBotStatus,
        [],
        null
      );
      return;
    }

    const [nextAccount, nextTrades, nextLogs] =
      await Promise.all([
        api.getAccountOverview(targetBaseUrl),
        api.getOpenTrades(targetBaseUrl),
        loadAccountLogsSafe(targetBaseUrl),
      ]);

    applySnapshot(
      nextSession,
      nextAccount,
      nextTrades.trades,
      nextBotStatus,
      nextLogs.entries,
      nextLogs.source_file ?? null
    );
  }

  async function refreshAll(
    options?: { silent?: boolean }
  ) {
    const silent = options?.silent ?? false;

    if (!silent) {
      setIsRefreshing(true);
    }

    setErrorMessage(null);

    try {
      await loadSnapshot();
    } catch (error) {
      const message = getErrorMessage(error);
      setErrorMessage(message);

      if (
        error instanceof ApiError &&
        error.status === 401
      ) {
        const fallbackTradingProfile =
          getTradingProfileOption(
            session?.trading_profile.id ??
              botStatus?.session.trading_profile.id ??
              initialConnectionState.tradingProfile
          );

        startTransition(() => {
          setSession({
            authenticated: false,
            terminal_connected: false,
            trading_profile: fallbackTradingProfile,
          });
          setBotStatus((current) =>
            current
              ? {
                  ...current,
                  session: {
                    authenticated: false,
                    terminal_connected: false,
                    trading_profile: fallbackTradingProfile,
                  },
                }
              : current
          );
          setLogs([]);
          setLogSourceFile(null);
        });
        clearAuthedData();
      }

      throw error;
    } finally {
      if (!silent) {
        setIsRefreshing(false);
      }
    }
  }

  async function login(
    input: LoginInput
  ): Promise<AuthLoginResponse> {
    const normalizedBaseUrl = api.normalizeBaseUrl(input.apiBaseUrl);
    const accountNumber = Number(input.accountNumber.trim());

    if (!normalizedBaseUrl) {
      const error = new ApiError(
        "Enter the BurrFx API URL before signing in.",
        0
      );
      setErrorMessage(error.message);
      throw error;
    }

    if (!Number.isFinite(accountNumber) || accountNumber <= 0) {
      const error = new ApiError(
        "Enter a valid MT5 account number.",
        0
      );
      setErrorMessage(error.message);
      throw error;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await api.login(
        normalizedBaseUrl,
        {
          account_number: accountNumber,
          password: input.password,
          server: input.server.trim(),
          trading_profile: input.tradingProfile,
        }
      );
      const nextBotStatus = await api.getBotStatus(normalizedBaseUrl);

      startTransition(() => {
        setApiBaseUrlState(normalizedBaseUrl);
        setSession(response.session);
        setAccount(response.account);
        setTrades([]);
        setBotStatus(nextBotStatus);
        setLogs([]);
        setLogSourceFile(null);
      });

      await refreshAll({ silent: true });
      return response;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function logout() {
    const targetBaseUrl = api.normalizeBaseUrl(apiBaseUrl);

    if (!targetBaseUrl) {
      clearAuthedData();
      startTransition(() => {
        setSession(null);
        setBotStatus(null);
        setLogs([]);
        setLogSourceFile(null);
      });
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await api.logout(targetBaseUrl);
      startTransition(() => {
        setSession(response.session);
        setBotStatus(null);
        setLogs([]);
        setLogSourceFile(null);
      });
      clearAuthedData();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function startBot() {
    const targetBaseUrl = api.normalizeBaseUrl(apiBaseUrl);

    if (!targetBaseUrl) {
      const error = new ApiError(
        "Add the API URL before starting the bot.",
        0
      );
      setErrorMessage(error.message);
      throw error;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await api.startBot(targetBaseUrl);
      startTransition(() => {
        setBotStatus(response.status);
      });
      await refreshAll({ silent: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function stopBot() {
    const targetBaseUrl = api.normalizeBaseUrl(apiBaseUrl);

    if (!targetBaseUrl) {
      const error = new ApiError(
        "Add the API URL before stopping the bot.",
        0
      );
      setErrorMessage(error.message);
      throw error;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await api.stopBot(targetBaseUrl);
      startTransition(() => {
        setBotStatus(response.status);
      });
      await refreshAll({ silent: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  const pollServer = useEffectEvent(() => {
    if (!apiBaseUrl) {
      return;
    }

    void refreshAll({ silent: true }).catch(() => {
      return;
    });
  });

  useEffect(() => {
    updatePersistedConnectionState({
      apiBaseUrl,
    });
  }, [apiBaseUrl]);

  useEffect(() => {
    if (hasHydratedOnceRef.current) {
      return;
    }

    hasHydratedOnceRef.current = true;

    const initialApiBaseUrl =
      initialApiBaseUrlRef.current;

    if (!initialApiBaseUrl) {
      setIsHydrating(false);
      return;
    }

    void loadSnapshot(initialApiBaseUrl)
      .catch((error) => {
        setErrorMessage(getErrorMessage(error));
      })
      .finally(() => {
        setIsHydrating(false);
      });
  }, []);

  useEffect(() => {
    latestTradesRef.current = trades;
    latestSessionAuthenticatedRef.current =
      Boolean(session?.authenticated);
  }, [session?.authenticated, trades]);

  useEffect(() => {
    if (!apiBaseUrl) {
      return;
    }

    if (!session?.authenticated && !botStatus?.running) {
      return;
    }

    const intervalId = setInterval(() => {
      pollServer();
    }, 8000);

    return () => {
      clearInterval(intervalId);
    };
  }, [
    apiBaseUrl,
    botStatus?.running,
    pollServer,
    session?.authenticated,
  ]);

  useEffect(() => {
    if (!account) {
      return;
    }

    let isCancelled = false;

    void appendAccountJournalSnapshot({
      account,
      botStatus,
      trades,
    })
      .then((didWrite) => {
        if (!didWrite || isCancelled) {
          return;
        }

        setJournalRevision((current) => current + 1);
      })
      .catch(() => {
        return;
      });

    return () => {
      isCancelled = true;
    };
  }, [account, botStatus, trades]);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    let isCancelled = false;

    void import("expo-draw-over-apps")
      .then(async (module) => {
        if (isCancelled) {
          return;
        }

        const [{ FloatingTradesWindow }] =
          await Promise.all([
            import("@/components/floating-trades-window"),
          ]);

        if (isCancelled) {
          return;
        }

        overlayModuleRef.current = module;
        module.setBubbleRendererForBubble(
          TRADE_OVERLAY_BUBBLE_ID,
          FloatingTradesWindow
        );
        module.setBubbleCount(
          latestTradesRef.current.length,
          "app",
          TRADE_OVERLAY_BUBBLE_ID
        );

        if (!latestSessionAuthenticatedRef.current) {
          module.hideBubble(TRADE_OVERLAY_BUBBLE_ID);
        }
      })
      .catch(() => {
        overlayModuleRef.current = null;
      });

    return () => {
      isCancelled = true;
      overlayModuleRef.current?.setBubbleRendererForBubble(
        TRADE_OVERLAY_BUBBLE_ID,
        null
      );
    };
  }, []);

  useEffect(() => {
    updateTradeOverlaySnapshot({
      account,
      trades,
    });

    overlayModuleRef.current?.setBubbleCount(
      trades.length,
      "app",
      TRADE_OVERLAY_BUBBLE_ID
    );
  }, [account, trades]);

  useEffect(() => {
    if (session?.authenticated) {
      return;
    }

    overlayModuleRef.current?.hideBubble(
      TRADE_OVERLAY_BUBBLE_ID
    );
  }, [session?.authenticated]);

  const value: AppSessionContextValue = {
    apiBaseUrl,
    session,
    account,
    trades,
    botStatus,
    logs,
    logSourceFile,
    journalRevision,
    errorMessage,
    isHydrating,
    isRefreshing,
    isSubmitting,
    isAuthenticated,
    setApiBaseUrl(value) {
      startTransition(() => {
        setApiBaseUrlState(api.normalizeBaseUrl(value));
      });
    },
    login,
    logout,
    refreshAll,
    startBot,
    stopBot,
    clearError() {
      setErrorMessage(null);
    },
  };

  return (
    <AppSessionContext.Provider value={value}>
      {children}
    </AppSessionContext.Provider>
  );
}

export function useAppSessionContext() {
  const context = useContext(AppSessionContext);

  if (context === null) {
    throw new Error(
      "useAppSessionContext must be used within AppSessionProvider."
    );
  }

  return context;
}
