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

import { ApiError, api, defaultApiBaseUrl } from "@/lib/api";
import type {
  AccountOverviewResponse,
  AuthLoginResponse,
  AuthSessionResponse,
  BotStatusResponse,
  OpenTradeItem,
} from "@/types/api";

type LoginInput = {
  apiBaseUrl: string;
  accountNumber: string;
  password: string;
  server: string;
};

type AppSessionContextValue = {
  apiBaseUrl: string;
  session: AuthSessionResponse | null;
  account: AccountOverviewResponse | null;
  trades: OpenTradeItem[];
  botStatus: BotStatusResponse | null;
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

export function AppSessionProvider({
  children,
}: PropsWithChildren) {
  const [apiBaseUrl, setApiBaseUrlState] = useState(
    defaultApiBaseUrl
  );
  const [session, setSession] = useState<AuthSessionResponse | null>(null);
  const [account, setAccount] = useState<AccountOverviewResponse | null>(null);
  const [trades, setTrades] = useState<OpenTradeItem[]>([]);
  const [botStatus, setBotStatus] = useState<BotStatusResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasHydratedOnceRef = useRef(false);

  const isAuthenticated = Boolean(session?.authenticated);

  function clearAuthedData() {
    startTransition(() => {
      setAccount(null);
      setTrades([]);
    });
  }

  function applySnapshot(
    nextSession: AuthSessionResponse,
    nextAccount: AccountOverviewResponse | null,
    nextTrades: OpenTradeItem[],
    nextBotStatus: BotStatusResponse | null
  ) {
    startTransition(() => {
      setSession(nextSession);
      setAccount(nextAccount);
      setTrades(nextTrades);
      setBotStatus(nextBotStatus);
    });
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
      });
      clearAuthedData();
      return;
    }

    const nextSession = await api.getSession(targetBaseUrl);
    const nextBotStatus = await api.getBotStatus(targetBaseUrl);

    if (!nextSession.authenticated) {
      applySnapshot(nextSession, null, [], nextBotStatus);
      return;
    }

    const [nextAccount, nextTrades] = await Promise.all([
      api.getAccountOverview(targetBaseUrl),
      api.getOpenTrades(targetBaseUrl),
    ]);

    applySnapshot(
      nextSession,
      nextAccount,
      nextTrades.trades,
      nextBotStatus
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
        startTransition(() => {
          setSession({
            authenticated: false,
            terminal_connected: false,
          });
          setBotStatus((current) =>
            current
              ? {
                  ...current,
                  session: {
                    authenticated: false,
                    terminal_connected: false,
                  },
                }
              : current
          );
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
        }
      );
      const nextBotStatus = await api.getBotStatus(normalizedBaseUrl);

      startTransition(() => {
        setApiBaseUrlState(normalizedBaseUrl);
        setSession(response.session);
        setAccount(response.account);
        setTrades([]);
        setBotStatus(nextBotStatus);
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
    if (hasHydratedOnceRef.current) {
      return;
    }

    hasHydratedOnceRef.current = true;

    if (!defaultApiBaseUrl) {
      return;
    }

    setIsHydrating(true);

    void loadSnapshot(defaultApiBaseUrl)
      .catch((error) => {
        setErrorMessage(getErrorMessage(error));
      })
      .finally(() => {
        setIsHydrating(false);
      });
  }, []);

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

  const value: AppSessionContextValue = {
    apiBaseUrl,
    session,
    account,
    trades,
    botStatus,
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
