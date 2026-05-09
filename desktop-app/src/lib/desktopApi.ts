import { invoke } from "@tauri-apps/api/core";

export type RuntimeLog = {
  at: string;
  source: string;
  stream: string;
  line: string;
};

export type AppLogFile = {
  file: string;
  name: string;
  category: string;
  size: number;
  modified_at: string;
};

export type AppLogEntry = {
  at: string;
  level: string;
  category: string;
  source: string;
  file: string;
  line_number: number;
  line: string;
  raw: string;
};

export type AppLogsResponse = {
  generated_at: string;
  logs_root: string;
  files: AppLogFile[];
  entries: AppLogEntry[];
};

export type TradeJournalEntry = {
  row: number;
  time: string;
  symbol: string;
  type: string;
  lot: string;
  entry: string;
  sl: string;
  tp: string;
  ticket: string;
  status: string;
};

export type TradeJournalResponse = {
  generated_at: string;
  path: string;
  exists: boolean;
  count: number;
  entries: TradeJournalEntry[];
  error?: string;
};

export type BacktestRequest = {
  broker_ids?: string[];
  bars: number;
  include_disabled: boolean;
};

export type BacktestSummary = {
  broker_count: number;
  symbol_count: number;
  strategy_count: number;
  trade_count: number;
  net_profit: number;
  win_rate: number;
};

export type BacktestTrade = {
  time: string;
  symbol: string;
  strategy_id: string;
  strategy_name: string;
  direction: string;
  entry: number;
  exit: number;
  profit: number;
  balance: number;
  reason: string;
};

export type BacktestStrategyResult = {
  id: string;
  name: string;
  timeframe: string;
  bars: number;
  trade_count: number;
  net_profit: number;
  win_rate: number;
  final_balance: number;
  trades: BacktestTrade[];
  equity: number[];
  errors: string[];
};

export type BacktestSymbolResult = {
  canonical: string;
  mt5: string;
  strategies: BacktestStrategyResult[];
};

export type BacktestBrokerResult = {
  id: string;
  label: string;
  enabled: boolean;
  errors: string[];
  warnings: string[];
  symbols: BacktestSymbolResult[];
};

export type BacktestReport = {
  generated_at: string;
  bars_requested: number;
  include_disabled: boolean;
  broker_ids: string[];
  summary: BacktestSummary;
  brokers: BacktestBrokerResult[];
};

export type ManagedRuntime = {
  label: string;
  state: string;
  running: boolean;
  pids: number[];
  started_at: string | null;
  stopped_at: string | null;
  message: string | null;
  logs: RuntimeLog[];
};

export type BrokerValidation = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type StrategyOption = {
  id: string;
  label: string;
  enabled: boolean;
  default_enabled: boolean;
  timeframe: string;
  recommended_timeframes: string[];
  trades_per_signal: number;
  max_positions_per_symbol: number;
  trade_mode?: DerivTradeMode;
};

export type DerivTradeMode = "normal" | "spike" | "both";

export type BrokerDailyLimits = {
  enabled: boolean;
  target: number;
  max_loss: number;
};

export type BrokerSymbol = {
  canonical: string;
  mt5: string;
  enabled: boolean;
};

export type BrokerSummary = {
  id: string;
  label: string;
  enabled: boolean;
  terminal_path: string;
  expected_login: number | null;
  expected_server: string;
  trading_profile: string;
  symbols: BrokerSymbol[];
  enabled_symbols: string[];
  daily_limits: BrokerDailyLimits;
  validation: BrokerValidation;
  requires_strategy_pause: boolean;
  allowed_strategies: StrategyOption[];
};

export type ServerSettings = {
  host: string;
  port: number;
  local_url: string;
};

export type DesktopStatus = {
  project_root: string;
  runtime_root: string;
  packaged_runtime: boolean;
  generated_at: string;
  bridge_error: string | null;
  server_settings: ServerSettings | null;
  server: ManagedRuntime;
  trading: ManagedRuntime;
  brokers: BrokerSummary[];
};

export type TradingProfileSummary = {
  id: string;
  label: string;
  description: string;
  lot_mode: string;
  risk_percent: number;
  max_spread_points: number;
  bypass_spread_filter?: boolean;
  bypass_session_filter?: boolean;
  use_take_profit: boolean;
  use_break_even: boolean;
  use_trailing_stop: boolean;
  safe_floating_profit_percent: number;
  max_positions_per_symbol: number;
  addon_spacing_atr: number;
};

export type BotTradingSettings = {
  active_profile: string;
  default_profile: string;
  profiles: TradingProfileSummary[];
};

export type BotStrategySummary = StrategyOption;

export type BotSettings = {
  status: {
    server: ServerSettings;
    enabled_broker_count: number;
    brokers: BrokerSummary[];
  };
  trading: BotTradingSettings;
  strategies: BotStrategySummary[];
  strategy_catalog: StrategyOption[];
  brokers: BrokerSummary[];
};

export type BotSettingsPayload = {
  active_profile?: string;
  restore_trading_default?: boolean;
  restore_strategy_defaults?: boolean;
  strategies?: Record<string, boolean>;
  brokers?: Record<string, boolean>;
  broker_configs?: Record<string, BrokerConfigPayload>;
  broker_strategies?: Record<
    string,
    Record<string, boolean | BrokerStrategyPayload>
  >;
  broker_daily_limits?: Record<string, BrokerDailyLimits>;
  new_brokers?: NewBrokerPayload[];
};

export type BrokerStrategyPayload = {
  enabled?: boolean;
  trades_per_signal?: number;
  trade_mode?: DerivTradeMode;
};

export type BrokerConfigPayload = {
  label?: string;
  terminal_path?: string;
  expected_login?: string | number | null;
  expected_server?: string;
  trading_profile?: string;
  symbols?: BrokerSymbol[];
};

export type NewBrokerPayload = {
  id?: string;
  label: string;
  enabled: boolean;
  terminal_path: string;
  expected_login?: string | number | null;
  expected_server: string;
  trading_profile: string;
  symbols: string[];
  daily_limits?: BrokerDailyLimits;
};

export type BotSettingsSaveResponse = {
  message: string;
  settings: BotSettings;
  status: DesktopStatus;
};

export type ActionResponse = {
  message: string;
  status: DesktopStatus;
};

export type DesktopCommand =
  | "start_server"
  | "stop_server"
  | "start_local_trading"
  | "stop_local_trading"
  | "stop_all";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

const mockStatus: DesktopStatus = {
  project_root: "C:\\Users\\Anda Hanise\\Desktop\\Projects\\BurrFx",
  runtime_root: "C:\\Users\\Anda Hanise\\AppData\\Roaming\\com.haniseanda.desktop-app",
  packaged_runtime: true,
  generated_at: nowStamp(),
  bridge_error: null,
  server_settings: {
    host: "0.0.0.0",
    port: 8000,
    local_url: "http://localhost:8000",
  },
  server: createRuntime("Mobile API server"),
  trading: createRuntime("Local trading"),
  brokers: [
    {
      id: "exness",
      label: "Exness",
      enabled: true,
      terminal_path: "C:\\Program Files\\MetaTrader 5 EXNESS\\terminal64.exe",
      expected_login: 435325248,
      expected_server: "Exness-MT5Trial9",
      trading_profile: "regular_risk",
      symbols: [
        { canonical: "EURUSD", mt5: "EURUSDm", enabled: true },
        { canonical: "GBPUSD", mt5: "GBPUSDm", enabled: true },
        { canonical: "USDJPY", mt5: "USDJPYm", enabled: true },
        { canonical: "USTEC", mt5: "USTECm", enabled: true },
        { canonical: "US30", mt5: "US30m", enabled: true },
      ],
      enabled_symbols: ["EURUSDm", "GBPUSDm", "USDJPYm", "USTECm", "US30m"],
      daily_limits: {
        enabled: true,
        target: 150,
        max_loss: -100,
      },
      validation: {
        valid: true,
        errors: [],
        warnings: [],
      },
      requires_strategy_pause: false,
      allowed_strategies: [],
    },
    {
      id: "deriv",
      label: "Deriv",
      enabled: false,
      terminal_path: "",
      expected_login: null,
      expected_server: "",
      trading_profile: "regular_risk",
      symbols: [
        { canonical: "BOOM1000", mt5: "Boom 1000 Index", enabled: true },
        { canonical: "CRASH1000", mt5: "Crash 1000 Index", enabled: true },
      ],
      enabled_symbols: ["Boom 1000 Index", "Crash 1000 Index"],
      daily_limits: {
        enabled: true,
        target: 150,
        max_loss: -100,
      },
      validation: {
        valid: false,
        errors: ["MT5 terminal path is empty."],
        warnings: ["Expected login is not set.", "Expected server is not set."],
      },
      requires_strategy_pause: false,
      allowed_strategies: [],
    },
  ],
};

const mockProfiles: TradingProfileSummary[] = [
  {
    id: "smart_risk",
    label: "Smart Risk",
    description:
      "Smallest broker lot, safer TP/SL, low spread filter, break-even only.",
    lot_mode: "min",
    risk_percent: 0.5,
    max_spread_points: 18,
    bypass_spread_filter: false,
    bypass_session_filter: false,
    use_take_profit: true,
    use_break_even: true,
    use_trailing_stop: false,
    safe_floating_profit_percent: 2,
    max_positions_per_symbol: 3,
    addon_spacing_atr: 1,
  },
  {
    id: "regular_risk",
    label: "Regular Risk",
    description: "Automatic lot size, safe TP/SL, break-even, and trailing stop.",
    lot_mode: "auto",
    risk_percent: 1,
    max_spread_points: 30,
    bypass_spread_filter: false,
    bypass_session_filter: false,
    use_take_profit: true,
    use_break_even: true,
    use_trailing_stop: true,
    safe_floating_profit_percent: 2,
    max_positions_per_symbol: 3,
    addon_spacing_atr: 1,
  },
  {
    id: "highly_risky",
    label: "Highly Risky",
    description:
      "Higher automatic lot size, no TP, break-even first, then trailing stop.",
    lot_mode: "auto",
    risk_percent: 2,
    max_spread_points: 45,
    bypass_spread_filter: true,
    bypass_session_filter: true,
    use_take_profit: false,
    use_break_even: true,
    use_trailing_stop: true,
    safe_floating_profit_percent: 2,
    max_positions_per_symbol: 3,
    addon_spacing_atr: 1,
  },
];

let mockActiveProfile = "highly_risky";

let mockStrategies: BotStrategySummary[] = [
  {
    id: "ma_crossover",
    label: "MA Crossover",
    enabled: true,
    default_enabled: true,
    timeframe: "M15",
    recommended_timeframes: ["M15", "M30", "H1"],
    trades_per_signal: 1,
    max_positions_per_symbol: 3,
  },
  {
    id: "trendline_price_action",
    label: "Trendline + Price Action",
    enabled: true,
    default_enabled: true,
    timeframe: "H1",
    recommended_timeframes: ["H1", "H4", "D1"],
    trades_per_signal: 1,
    max_positions_per_symbol: 3,
  },
  {
    id: "smc_liquidity_sweep",
    label: "SMC Liquidity Sweep",
    enabled: true,
    default_enabled: false,
    timeframe: "M15",
    recommended_timeframes: ["M15", "M30", "H1"],
    trades_per_signal: 1,
    max_positions_per_symbol: 3,
  },
  {
    id: "high_impact_news",
    label: "High Impact News",
    enabled: true,
    default_enabled: false,
    timeframe: "M1",
    recommended_timeframes: ["M1", "M5"],
    trades_per_signal: 1,
    max_positions_per_symbol: 3,
  },
];

let mockBrokerStrategies: Record<string, BotStrategySummary[]> = {
  exness: mockStrategies.map(cloneStrategy),
  deriv: [
    {
      id: "stochastic_oscillator",
      label: "Stochastic Oscillator",
      enabled: true,
      default_enabled: true,
      timeframe: "M5",
      recommended_timeframes: ["M5"],
      trades_per_signal: 5,
      max_positions_per_symbol: 25,
      trade_mode: "normal",
    },
  ],
};

export async function getAppStatus(): Promise<DesktopStatus> {
  if (isTauri()) {
    return invoke<DesktopStatus>("get_app_status");
  }

  await sleep(120);
  mockStatus.generated_at = nowStamp();
  return clone(buildMockStatus());
}

export async function getBotSettings(): Promise<BotSettings> {
  if (isTauri()) {
    return invoke<BotSettings>("get_bot_settings");
  }

  await sleep(120);
  return clone(buildMockBotSettings());
}

export async function getAppLogs(): Promise<AppLogsResponse> {
  if (isTauri()) {
    return invoke<AppLogsResponse>("get_app_logs");
  }

  await sleep(120);
  return clone(buildMockAppLogs());
}

export async function getTradeJournal(): Promise<TradeJournalResponse> {
  if (isTauri()) {
    return invoke<TradeJournalResponse>("get_trade_journal");
  }

  await sleep(120);
  return clone(buildMockTradeJournal());
}

export async function runBacktest(
  payload: BacktestRequest,
): Promise<BacktestReport> {
  if (isTauri()) {
    return invoke<BacktestReport>("run_backtest", { payload });
  }

  await sleep(260);

  if (mockStatus.trading.running) {
    throw new Error("Stop local trading before running a backtest.");
  }

  return clone(buildMockBacktestReport(payload));
}

export async function saveBotSettings(
  payload: BotSettingsPayload,
): Promise<BotSettingsSaveResponse> {
  if (isTauri()) {
    return invoke<BotSettingsSaveResponse>("save_bot_settings", { payload });
  }

  await sleep(180);

  if (mockStatus.trading.running) {
    throw new Error("Stop local trading before saving bot settings.");
  }

  applyMockSettings(payload);
  mockStatus.generated_at = nowStamp();

  return {
    message: "Settings saved.",
    settings: clone(buildMockBotSettings()),
    status: clone(buildMockStatus()),
  };
}

export async function runDesktopCommand(
  command: DesktopCommand,
): Promise<ActionResponse> {
  if (isTauri()) {
    return invoke<ActionResponse>(command);
  }

  await sleep(180);
  const message = applyMockCommand(command);
  mockStatus.generated_at = nowStamp();

  return {
    message,
    status: clone(mockStatus),
  };
}

function applyMockCommand(command: DesktopCommand): string {
  if (command === "start_server") {
    return startRuntime(mockStatus.server, "Mobile API server", 8000);
  }

  if (command === "stop_server") {
    return stopRuntime(mockStatus.server, "Mobile API server");
  }

  if (command === "start_local_trading") {
    return startRuntime(mockStatus.trading, "Exness trading worker", 4221);
  }

  if (command === "stop_local_trading") {
    return stopRuntime(mockStatus.trading, "Local trading");
  }

  stopRuntime(mockStatus.trading, "Local trading");
  stopRuntime(mockStatus.server, "Mobile API server");
  return "Stopped local trading and the mobile API server.";
}

function startRuntime(
  runtime: ManagedRuntime,
  source: string,
  pid: number,
): string {
  if (runtime.running) {
    return `${runtime.label} is already running.`;
  }

  runtime.running = true;
  runtime.state = "running";
  runtime.pids = [pid];
  runtime.started_at = nowStamp();
  runtime.stopped_at = null;
  runtime.message = `${runtime.label} start requested.`;
  runtime.logs = [
    ...runtime.logs,
    {
      at: nowStamp(),
      source,
      stream: "system",
      line: `Started ${source} (pid ${pid}).`,
    },
  ].slice(-120);

  return runtime.message;
}

function stopRuntime(runtime: ManagedRuntime, source: string): string {
  if (!runtime.running) {
    runtime.message = `${runtime.label} is already stopped.`;
    runtime.stopped_at = nowStamp();
    return runtime.message;
  }

  runtime.running = false;
  runtime.state = "stopped";
  runtime.pids = [];
  runtime.stopped_at = nowStamp();
  runtime.message = `Stopped ${runtime.label}.`;
  runtime.logs = [
    ...runtime.logs,
    {
      at: nowStamp(),
      source,
      stream: "system",
      line: `Stopped ${source}.`,
    },
  ].slice(-120);

  return runtime.message;
}

function createRuntime(label: string): ManagedRuntime {
  return {
    label,
    state: "stopped",
    running: false,
    pids: [],
    started_at: null,
    stopped_at: null,
    message: null,
    logs: [],
  };
}

function buildMockBotSettings(): BotSettings {
  const brokers = buildMockBrokersWithStrategies();

  return {
    status: {
      server: mockStatus.server_settings ?? {
        host: "0.0.0.0",
        port: 8000,
        local_url: "http://localhost:8000",
      },
      enabled_broker_count: brokers.filter((broker) => broker.enabled)
        .length,
      brokers,
    },
    trading: {
      active_profile: mockActiveProfile,
      default_profile: "regular_risk",
      profiles: mockProfiles,
    },
    strategies: mockStrategies,
    strategy_catalog: [
      ...mockStrategies,
      ...(mockBrokerStrategies.deriv ?? []),
    ],
    brokers,
  };
}

function buildMockStatus(): DesktopStatus {
  return {
    ...mockStatus,
    brokers: buildMockBrokersWithStrategies(),
  };
}

function buildMockAppLogs(): AppLogsResponse {
  const entries: AppLogEntry[] = [
    {
      at: "2026-05-06 04:00:34,373",
      level: "INFO",
      category: "debug",
      source: "debug",
      file: "debug/debug.log",
      line_number: 1240,
      line:
        'broker_daily_limits_updated | {"broker_id":"deriv","daily_limits":{"enabled":false}}',
      raw:
        '2026-05-06 04:00:34,373 | INFO | broker_daily_limits_updated | {"broker_id":"deriv","daily_limits":{"enabled":false}}',
    },
    {
      at: "2026-05-06 04:00:00.575014",
      level: "INFO",
      category: "symbol",
      source: "Boom 1000 Index",
      file: "symbol_logs/Boom 1000 Index.log",
      line_number: 88,
      line: "Checking Stochastic Oscillator on M5",
      raw: "[2026-05-06 04:00:00.575014] Checking Stochastic Oscillator on M5",
    },
    {
      at: "2026-05-06 03:59:58,904",
      level: "WARNING",
      category: "debug",
      source: "session_20260506_035933",
      file: "debug/session_20260506_035933.log",
      line_number: 12,
      line:
        'stochastic_signal_missing | {"symbol":"Crash 1000 Index","reason":"no_crossover"}',
      raw:
        '2026-05-06 03:59:58,904 | WARNING | stochastic_signal_missing | {"symbol":"Crash 1000 Index","reason":"no_crossover"}',
    },
  ];

  return {
    generated_at: nowStamp(),
    logs_root: "C:\\Users\\Anda Hanise\\Desktop\\Projects\\BurrFx\\logs",
    files: [
      {
        file: "debug/debug.log",
        name: "debug",
        category: "debug",
        size: 102400,
        modified_at: "2026-05-06T04:00:34",
      },
      {
        file: "symbol_logs/Boom 1000 Index.log",
        name: "Boom 1000 Index",
        category: "symbol",
        size: 8192,
        modified_at: "2026-05-06T04:00:00",
      },
    ],
    entries,
  };
}

function buildMockTradeJournal(): TradeJournalResponse {
  return {
    generated_at: nowStamp(),
    path: "C:\\Users\\Anda Hanise\\Desktop\\Projects\\BurrFx\\logs\\trade_journal.csv",
    exists: true,
    count: 3,
    entries: [
      {
        row: 24,
        time: "2026-05-06 04:10:00",
        symbol: "Crash 1000 Index",
        type: "BUY",
        lot: "0.2",
        entry: "823.45",
        sl: "819.10",
        tp: "",
        ticket: "9002451",
        status: "EXECUTED",
      },
      {
        row: 23,
        time: "2026-05-06 04:05:00",
        symbol: "Boom 1000 Index",
        type: "SELL",
        lot: "0.2",
        entry: "1241.80",
        sl: "1246.15",
        tp: "",
        ticket: "9002448",
        status: "EXECUTED",
      },
      {
        row: 22,
        time: "2026-05-06 03:58:00",
        symbol: "EURUSDm",
        type: "BUY",
        lot: "0.01",
        entry: "1.08412",
        sl: "1.08290",
        tp: "1.08640",
        ticket: "9002402",
        status: "EXECUTED",
      },
    ],
  };
}

function buildMockBacktestReport(payload: BacktestRequest): BacktestReport {
  const brokers = buildMockBrokersWithStrategies().filter((broker) => {
    if (payload.broker_ids?.length) {
      return payload.broker_ids.includes(broker.id);
    }

    return payload.include_disabled || broker.enabled;
  });
  const brokerResults = brokers.map((broker) =>
    buildMockBacktestBrokerResult(broker, payload.bars),
  );
  const strategyResults = brokerResults.flatMap((broker) =>
    broker.symbols.flatMap((symbol) => symbol.strategies),
  );
  const tradeCount = strategyResults.reduce(
    (total, strategy) => total + strategy.trade_count,
    0,
  );
  const netProfit = strategyResults.reduce(
    (total, strategy) => total + strategy.net_profit,
    0,
  );

  return {
    generated_at: new Date().toISOString(),
    bars_requested: payload.bars,
    include_disabled: payload.include_disabled,
    broker_ids: brokers.map((broker) => broker.id),
    summary: {
      broker_count: brokerResults.length,
      symbol_count: brokerResults.reduce(
        (total, broker) => total + broker.symbols.length,
        0,
      ),
      strategy_count: strategyResults.length,
      trade_count: tradeCount,
      net_profit: Number(netProfit.toFixed(2)),
      win_rate: tradeCount ? 62.5 : 0,
    },
    brokers: brokerResults,
  };
}

function buildMockBacktestBrokerResult(
  broker: BrokerSummary,
  bars: number,
): BacktestBrokerResult {
  const strategies = broker.allowed_strategies.length
    ? broker.allowed_strategies.filter((strategy) => strategy.enabled)
    : mockStrategies.filter((strategy) => strategy.enabled);
  const symbols = broker.enabled_symbols.slice(0, 2).map((symbol, index) => ({
    canonical: canonicalSymbol(symbol),
    mt5: symbol,
    strategies: strategies.slice(0, 2).map((strategy, strategyIndex) =>
      buildMockBacktestStrategy(strategy, symbol, bars, index + strategyIndex),
    ),
  }));

  return {
    id: broker.id,
    label: broker.label,
    enabled: broker.enabled,
    errors: broker.validation.valid ? [] : broker.validation.errors,
    warnings: broker.validation.warnings,
    symbols,
  };
}

function buildMockBacktestStrategy(
  strategy: BotStrategySummary,
  symbol: string,
  bars: number,
  offset: number,
): BacktestStrategyResult {
  const direction = symbol.toLowerCase().includes("boom") ? "SELL" : "BUY";
  const profit = Number((12.5 - offset * 2.25).toFixed(2));

  return {
    id: strategy.id,
    name: strategy.label,
    timeframe: strategy.timeframe,
    bars,
    trade_count: 4,
    net_profit: profit,
    win_rate: 75,
    final_balance: 10000 + profit,
    trades: [
      {
        time: "2026-05-06T04:00:00",
        symbol,
        strategy_id: strategy.id,
        strategy_name: strategy.label,
        direction,
        entry: direction === "BUY" ? 820.25 : 1244.8,
        exit: direction === "BUY" ? 823.55 : 1241.3,
        profit,
        balance: 10000 + profit,
        reason: "Mock crossover on the latest closed candle.",
      },
    ],
    equity: [10000, 10000 + profit],
    errors: [],
  };
}

function buildMockBrokersWithStrategies(): BrokerSummary[] {
  return mockStatus.brokers.map((broker) => ({
    ...broker,
    allowed_strategies:
      mockBrokerStrategies[broker.id]?.map(cloneStrategy)
      ?? mockStrategies.map(cloneStrategy),
  }));
}

function applyMockSettings(payload: BotSettingsPayload): void {
  if (payload.restore_trading_default) {
    mockActiveProfile = "regular_risk";
  } else if (payload.active_profile) {
    mockActiveProfile = payload.active_profile;
  }

  if (payload.restore_strategy_defaults) {
    mockStrategies = mockStrategies.map((strategy) => ({
      ...strategy,
      enabled: strategy.default_enabled,
    }));
  } else if (payload.strategies) {
    const nextStrategies = mockStrategies.map((strategy) => ({
      ...strategy,
      enabled: payload.strategies?.[strategy.id] ?? strategy.enabled,
    }));

    if (!nextStrategies.some((strategy) => strategy.enabled)) {
      throw new Error("At least one strategy must stay enabled.");
    }

    mockStrategies = nextStrategies;
  }

  if (payload.brokers) {
    mockStatus.brokers = mockStatus.brokers.map((broker) => ({
      ...broker,
      enabled: payload.brokers?.[broker.id] ?? broker.enabled,
    }));
  }

  if (payload.broker_configs) {
    mockStatus.brokers = mockStatus.brokers.map((broker) => {
      const config = payload.broker_configs?.[broker.id];

      if (!config) {
        return broker;
      }

      const symbols = config.symbols ?? broker.symbols;

      return {
        ...broker,
        label: config.label ?? broker.label,
        terminal_path: config.terminal_path ?? broker.terminal_path,
        expected_login:
          config.expected_login === undefined
            ? broker.expected_login
            : config.expected_login === ""
              ? null
              : Number(config.expected_login),
        expected_server: config.expected_server ?? broker.expected_server,
        trading_profile: config.trading_profile ?? broker.trading_profile,
        symbols,
        enabled_symbols: symbols
          .filter((symbol) => symbol.enabled)
          .map((symbol) => symbol.mt5),
      };
    });
  }

  if (payload.new_brokers?.length) {
    const newBrokers = payload.new_brokers.map((broker) => {
      const symbols = broker.symbols
        .map((symbol) => symbol.trim())
        .filter(Boolean)
        .map((symbol) => ({
          canonical: canonicalSymbol(symbol),
          mt5: symbol,
          enabled: true,
        }));

      return {
        id: broker.id || canonicalSymbol(broker.label).toLowerCase(),
        label: broker.label,
        enabled: broker.enabled,
        terminal_path: broker.terminal_path,
        expected_login:
          broker.expected_login === ""
            ? null
            : Number(broker.expected_login ?? 0) || null,
        expected_server: broker.expected_server,
        trading_profile: broker.trading_profile,
        symbols,
        enabled_symbols: symbols.map((symbol) => symbol.mt5),
        daily_limits: broker.daily_limits ?? {
          enabled: false,
          target: 150,
          max_loss: -100,
        },
        validation: {
          valid: false,
          errors: ["MT5 terminal path has not been validated yet."],
          warnings: [],
        },
        requires_strategy_pause: false,
        allowed_strategies: mockStrategies.map(cloneStrategy),
      };
    });

    mockStatus.brokers = [...mockStatus.brokers, ...newBrokers];
  }

  if (payload.broker_strategies) {
    mockBrokerStrategies = Object.fromEntries(
      Object.entries(mockBrokerStrategies).map(([brokerId, strategies]) => [
        brokerId,
        strategies.map((strategy) => ({
          ...strategy,
          ...normalizeMockBrokerStrategyUpdate(
            payload.broker_strategies?.[brokerId]?.[strategy.id],
            strategy,
          ),
        })),
      ]),
    );
  }

  if (payload.broker_daily_limits) {
    mockStatus.brokers = mockStatus.brokers.map((broker) => ({
      ...broker,
      daily_limits:
        payload.broker_daily_limits?.[broker.id] ?? broker.daily_limits,
    }));
  }
}

function cloneStrategy(strategy: BotStrategySummary): BotStrategySummary {
  return {
    ...strategy,
    recommended_timeframes: [...strategy.recommended_timeframes],
  };
}

function normalizeMockBrokerStrategyUpdate(
  update: boolean | BrokerStrategyPayload | undefined,
  strategy: BotStrategySummary,
): Partial<BotStrategySummary> {
  if (update === undefined) {
    return {};
  }

  if (typeof update === "boolean") {
    return {
      enabled: update,
    };
  }

  const maxPositions = Math.max(1, strategy.max_positions_per_symbol);
  const requestedTradeCount = Math.floor(
    Number(update.trades_per_signal ?? strategy.trades_per_signal),
  );

  return {
    ...(update.enabled === undefined ? {} : { enabled: Boolean(update.enabled) }),
    ...(update.trade_mode === undefined
      ? {}
      : { trade_mode: normalizeMockDerivTradeMode(update.trade_mode) }),
    trades_per_signal: Math.min(
      Math.max(Number.isFinite(requestedTradeCount) ? requestedTradeCount : 1, 1),
      maxPositions,
    ),
  };
}

function normalizeMockDerivTradeMode(value: string): DerivTradeMode {
  if (value === "spike" || value === "both") {
    return value;
  }

  return "normal";
}

function isTauri(): boolean {
  return (
    typeof window !== "undefined"
    && window.__TAURI_INTERNALS__ !== undefined
  );
}

function nowStamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

function canonicalSymbol(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
