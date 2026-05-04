export type TradingProfileId =
  | "smart_risk"
  | "regular_risk"
  | "highly_risky";

export type TradingProfileOption = {
  id: TradingProfileId;
  label: string;
  description: string;
  lot_mode: string;
  risk_percent: number;
  max_spread_points: number;
  use_take_profit: boolean;
  use_break_even: boolean;
  use_trailing_stop: boolean;
  safe_floating_profit_percent: number;
  max_positions_per_symbol: number;
  addon_spacing_atr: number;
};

export type AuthSessionResponse = {
  authenticated: boolean;
  account_number?: number | null;
  server?: string | null;
  connected_at?: string | null;
  terminal_path?: string | null;
  terminal_connected: boolean;
  last_error_code?: number | null;
  last_error_message?: string | null;
  trading_profile: TradingProfileOption;
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

export type AccountLogEntry = {
  timestamp?: string | null;
  level: string;
  event: string;
  message: string;
  context?: Record<string, unknown> | null;
  source?: string | null;
};

export type AccountLogsResponse = {
  count: number;
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
  source_file?: string | null;
  entries: AccountLogEntry[];
};

export type AuthLoginPayload = {
  account_number: number;
  password: string;
  server: string;
  trading_profile: TradingProfileId;
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
