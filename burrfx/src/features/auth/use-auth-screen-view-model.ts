import { useEffect, useState } from "react";

import { useAppSession } from "@/hooks/use-app-session";
import type { AuthScreenViewProps } from "@/features/auth/auth-screen.types";

type AuthScreenViewModel = {
  isAuthenticated: boolean;
  viewProps: AuthScreenViewProps;
};

export function useAuthScreenViewModel(): AuthScreenViewModel {
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

  const [apiUrl, setApiUrl] = useState(apiBaseUrl);
  const [accountNumber, setAccountNumber] = useState(
    session?.account_number ? String(session.account_number) : ""
  );
  const [password, setPassword] = useState("");
  const [server, setServer] = useState(session?.server ?? "");

  useEffect(() => {
    if (!apiUrl && apiBaseUrl) {
      setApiUrl(apiBaseUrl);
    }
  }, [apiBaseUrl, apiUrl]);

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

  const viewProps: AuthScreenViewProps = {
    apiUrl,
    accountNumber,
    password,
    server,
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
    onDismissError() {
      clearError();
    },
    onSubmit() {
      void login({
        apiBaseUrl: apiUrl,
        accountNumber,
        password,
        server,
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
