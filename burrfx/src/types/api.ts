export type AuthSessionResponse = {
  authenticated: boolean;
  account_number?: number | null;
  server?: string | null;
  connected_at?: string | null;
  terminal_path?: string | null;
  terminal_connected: boolean;
  last_error_code?: number | null;
  last_error_message?: string | null;
};

export type AccountOverviewResponse = {
  login: number;
  server: string;
  balance: number;
  equity: number;
  profit: number;
  margin: number;
  free_margin: number;
  currency?: string | null;
  leverage?: number | null;
  margin_level?: number | null;
  name?: string | null;
  company?: string | null;
};

export type AuthLoginPayload = {
  account_number: number;
  password: string;
  server: string;
};

export type AuthLoginResponse = {
  message: string;
  session: AuthSessionResponse;
  account: AccountOverviewResponse;
};

export type AuthLogoutResponse = {
  message: string;
  session: AuthSessionResponse;
};

export type OpenTradeItem = {
  ticket: number;
  symbol: string;
  side: string;
  volume: number;
  price_open: number;
  price_current?: number | null;
  stop_loss?: number | null;
  take_profit?: number | null;
  profit?: number | null;
  swap?: number | null;
  magic?: number | null;
  comment?: string | null;
  opened_at?: string | null;
  is_bot_trade: boolean;
};

export type OpenTradesResponse = {
  count: number;
  account: AccountOverviewResponse;
  trades: OpenTradeItem[];
};

export type BotStatusResponse = {
  state: string;
  running: boolean;
  stop_requested: boolean;
  thread_alive: boolean;
  started_at?: string | null;
  stopped_at?: string | null;
  last_update_at?: string | null;
  phase?: string | null;
  detail?: string | null;
  current_symbol?: string | null;
  active_symbols: string[];
  session_label?: string | null;
  countdown_seconds?: number | null;
  daily_profit?: number | null;
  account_number?: number | null;
  server?: string | null;
  last_error?: string | null;
  session: AuthSessionResponse;
};

export type BotControlResponse = {
  message: string;
  status: BotStatusResponse;
};
