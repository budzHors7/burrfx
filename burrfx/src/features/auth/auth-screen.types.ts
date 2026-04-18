export type AuthScreenViewProps = {
  apiUrl: string;
  accountNumber: string;
  password: string;
  server: string;
  errorMessage: string | null;
  isHydrating: boolean;
  isSubmitting: boolean;
  onApiUrlChange: (value: string) => void;
  onAccountNumberChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onServerChange: (value: string) => void;
  onDismissError: () => void;
  onSubmit: () => void;
};
