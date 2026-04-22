import { useEffect, useRef, useState } from "react";

import { useAppSession } from "@/hooks/use-app-session";
import type { AuthScreenViewProps } from "@/features/auth/auth-screen.types";
import {
  readPersistedConnectionState,
  updatePersistedConnectionState,
} from "@/lib/auth-storage";
import {
  defaultTradingProfileId,
  getTradingProfileOption,
  tradingProfileOptions,
} from "@/lib/trading-profiles";
import type { TradingProfileId } from "@/types/api";

type AuthScreenViewModel = {
  isAuthenticated: boolean;
  viewProps: AuthScreenViewProps;
};

export function useAuthScreenViewModel(): AuthScreenViewModel {
  const persistedConnectionStateRef = useRef(
    readPersistedConnectionState()
  );
  const {
    apiBaseUrl,
    session,
    errorMessage,
    isAuthenticated,
    isHydrating,
    isSubmitting,
    clearError,
    login,
  } = useAppSession();

  const [apiUrl, setApiUrl] = useState(
    apiBaseUrl ||
      persistedConnectionStateRef.current.apiBaseUrl
  );
  const [accountNumber, setAccountNumber] = useState(
    session?.account_number
      ? String(session.account_number)
      : persistedConnectionStateRef.current.accountNumber
  );
  const [password, setPassword] = useState("");
  const [server, setServer] = useState(
    session?.server ??
      persistedConnectionStateRef.current.server
  );
  const [tradingProfile, setTradingProfile] =
    useState<TradingProfileId>(
      session?.trading_profile.id ??
        persistedConnectionStateRef.current.tradingProfile ??
        defaultTradingProfileId
    );

  useEffect(() => {
    if (!apiUrl && apiBaseUrl) {
      setApiUrl(apiBaseUrl);
    }
  }, [apiBaseUrl, apiUrl]);

  useEffect(() => {
    updatePersistedConnectionState({
      accountNumber,
      server,
      tradingProfile,
    });
  }, [accountNumber, server, tradingProfile]);

  useEffect(() => {
    if (!accountNumber && session?.account_number) {
      setAccountNumber(String(session.account_number));
    }
  }, [accountNumber, session?.account_number]);

  useEffect(() => {
    if (!server && session?.server) {
      setServer(session.server);
    }
  }, [server, session?.server]);

  useEffect(() => {
    if (!session?.trading_profile.id) {
      return;
    }

    setTradingProfile(
      getTradingProfileOption(
        session.trading_profile.id
      ).id
    );
  }, [session?.trading_profile.id]);

  const viewProps: AuthScreenViewProps = {
    apiUrl,
    accountNumber,
    password,
    server,
    tradingProfile,
    tradingProfileOptions,
    errorMessage,
    isHydrating,
    isSubmitting,
    onApiUrlChange(value) {
      clearError();
      setApiUrl(value);
    },
    onAccountNumberChange(value) {
      clearError();
      setAccountNumber(value);
    },
    onPasswordChange(value) {
      clearError();
      setPassword(value);
    },
    onServerChange(value) {
      clearError();
      setServer(value);
    },
    onTradingProfileChange(value) {
      clearError();
      setTradingProfile(value);
    },
    onDismissError() {
      clearError();
    },
    onSubmit() {
      void login({
        apiBaseUrl: apiUrl,
        accountNumber,
        password,
        server,
        tradingProfile,
      }).catch(() => {
        return;
      });
    },
  };

  return {
    isAuthenticated,
    viewProps,
  };
}
