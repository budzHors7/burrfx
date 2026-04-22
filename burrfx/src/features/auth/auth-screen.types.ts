import type {
  TradingProfileId,
  TradingProfileOption,
} from "@/types/api";

export type AuthScreenViewProps = {
  apiUrl: string;
  accountNumber: string;
  password: string;
  server: string;
  tradingProfile: TradingProfileId;
  tradingProfileOptions: readonly TradingProfileOption[];
  errorMessage: string | null;
  isHydrating: boolean;
  isSubmitting: boolean;
  onApiUrlChange: (value: string) => void;
  onAccountNumberChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onServerChange: (value: string) => void;
  onTradingProfileChange: (
    value: TradingProfileId
  ) => void;
  onDismissError: () => void;
  onSubmit: () => void;
};
