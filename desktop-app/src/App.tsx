import { useEffect, useMemo, useState } from "react";
import "./App.css";
import {
  AppLogEntry,
  AppLogsResponse,
  BacktestReport,
  BacktestRequest,
  BrokerSummary,
  BrokerDailyLimits,
  BotSettings,
  BotSettingsPayload,
  BotSettingsSaveResponse,
  BotStrategySummary,
  DesktopCommand,
  DesktopStatus,
  ManagedRuntime,
  RuntimeLog,
  TradeJournalResponse,
  getAppLogs,
  getAppStatus,
  getBotSettings,
  getTradeJournal,
  runBacktest,
  runDesktopCommand,
  saveBotSettings,
} from "./lib/desktopApi";

type Notice = {
  tone: "info" | "error";
  text: string;
};

type ThemeMode = "light" | "dark";

const POLL_INTERVAL_MS = 3000;
const LOG_POLL_INTERVAL_MS = 5000;
const THEME_STORAGE_KEY = "burrfx-desktop-theme";

type LogViewMode = "files" | "runtime";

function App() {
  const [status, setStatus] = useState<DesktopStatus | null>(null);
  const [appLogs, setAppLogs] = useState<AppLogsResponse | null>(null);
  const [journal, setJournal] = useState<TradeJournalResponse | null>(null);
  const [backtestResult, setBacktestResult] =
    useState<BacktestReport | null>(null);
  const [pending, setPending] = useState<DesktopCommand | "refresh" | null>(
    null,
  );
  const [logsPending, setLogsPending] = useState(false);
  const [journalPending, setJournalPending] = useState(false);
  const [backtestPending, setBacktestPending] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialTheme);
  const [logViewMode, setLogViewMode] = useState<LogViewMode>("files");
  const [logCategory, setLogCategory] = useState("all");
  const [backtestBroker, setBacktestBroker] = useState("active");
  const [backtestBars, setBacktestBars] = useState("500");

  const activeBrokers = useMemo(
    () => status?.brokers.filter((broker) => broker.enabled) ?? [],
    [status],
  );

  const runtimeLogs = useMemo(() => {
    if (!status) {
      return [];
    }

    return [...status.trading.logs, ...status.server.logs]
      .sort((left, right) => Number(right.at) - Number(left.at))
      .slice(0, 80);
  }, [status]);

  const logCategories = useMemo(() => {
    const categories = new Set(
      appLogs?.entries.map((entry) => entry.category) ?? [],
    );

    return ["all", ...Array.from(categories).sort()];
  }, [appLogs]);

  const visibleFileLogs = useMemo(() => {
    const entries = appLogs?.entries ?? [];

    if (logCategory === "all") {
      return entries;
    }

    return entries.filter((entry) => entry.category === logCategory);
  }, [appLogs, logCategory]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const nextStatus = await getAppStatus();

        if (mounted) {
          setStatus(nextStatus);
        }
      } catch (error) {
        if (mounted) {
          setNotice({
            tone: "error",
            text: normalizeError(error),
          });
        }
      }
    }

    load();
    const timer = window.setInterval(load, POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadEvidence() {
      try {
        const [nextLogs, nextJournal] = await Promise.all([
          getAppLogs(),
          getTradeJournal(),
        ]);

        if (mounted) {
          setAppLogs(nextLogs);
          setJournal(nextJournal);
        }
      } catch (error) {
        if (mounted) {
          setNotice({
            tone: "error",
            text: normalizeError(error),
          });
        }
      }
    }

    loadEvidence();
    const timer = window.setInterval(loadEvidence, LOG_POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  const nextThemeMode = themeMode === "dark" ? "light" : "dark";

  async function refresh() {
    setPending("refresh");

    try {
      const [nextStatus, nextLogs, nextJournal] = await Promise.all([
        getAppStatus(),
        getAppLogs(),
        getTradeJournal(),
      ]);

      setStatus(nextStatus);
      setAppLogs(nextLogs);
      setJournal(nextJournal);
      setNotice({
        tone: "info",
        text: "Status refreshed.",
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: normalizeError(error),
      });
    } finally {
      setPending(null);
    }
  }

  async function refreshLogs() {
    setLogsPending(true);

    try {
      setAppLogs(await getAppLogs());
      setNotice({
        tone: "info",
        text: "Logs refreshed.",
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: normalizeError(error),
      });
    } finally {
      setLogsPending(false);
    }
  }

  async function refreshJournal() {
    setJournalPending(true);

    try {
      setJournal(await getTradeJournal());
      setNotice({
        tone: "info",
        text: "Journal refreshed.",
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: normalizeError(error),
      });
    } finally {
      setJournalPending(false);
    }
  }

  async function runBacktestFromUi() {
    setBacktestPending(true);
    setNotice(null);

    try {
      const payload = buildBacktestPayload(
        backtestBroker,
        backtestBars,
      );
      const report = await runBacktest(payload);

      setBacktestResult(report);
      setNotice({
        tone: "info",
        text: `Backtest finished with ${report.summary.trade_count} trades.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: normalizeError(error),
      });
    } finally {
      setBacktestPending(false);
    }
  }

  async function run(command: DesktopCommand) {
    setPending(command);
    setNotice(null);

    try {
      const response = await runDesktopCommand(command);
      setStatus(response.status);
      setNotice({
        tone: "info",
        text: response.message,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: normalizeError(error),
      });

      try {
        setStatus(await getAppStatus());
      } catch {
        // Keep the earlier command error visible.
      }
    } finally {
      setPending(null);
    }
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div className="brand-lockup">
          <div aria-label="BurrFx" className="brand-wordmark">
            Burr<span>Fx</span>
          </div>
          <div>
            <p className="eyebrow">Desktop</p>
            <h1>Trading Control</h1>
          </div>
        </div>

        <div className="top-actions">
          <button
            aria-label={`Switch to ${nextThemeMode} mode`}
            className="icon-button"
            onClick={() => setThemeMode(nextThemeMode)}
            title={`Switch to ${nextThemeMode} mode`}
            type="button"
          >
            {themeMode === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            aria-label="Bot settings"
            className="icon-button"
            disabled={pending !== null}
            onClick={() => setSettingsOpen(true)}
            title="Bot settings"
            type="button"
          >
            <GearIcon />
          </button>
          <button
            aria-label="Open logs viewer"
            className="icon-button"
            onClick={() => setLogsOpen(true)}
            title="Open logs viewer"
            type="button"
          >
            <LogsIcon />
          </button>
          <button
            className="button ghost"
            disabled={pending !== null}
            onClick={refresh}
            type="button"
          >
            {pending === "refresh" ? "Refreshing" : "Refresh"}
          </button>
          <button
            className="button danger"
            disabled={pending !== null || !status}
            onClick={() => run("stop_all")}
            type="button"
          >
            Stop All
          </button>
        </div>
      </header>

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          onSaved={(response) => {
            setStatus(response.status);
            setNotice({
              tone: "info",
              text: response.message,
            });
            setSettingsOpen(false);
          }}
          tradingRunning={status?.trading.running ?? false}
        />
      )}

      {logsOpen && (
        <LogsModal
          appLogs={appLogs}
          category={logCategory}
          categories={logCategories}
          fileLogs={visibleFileLogs}
          mode={logViewMode}
          onCategoryChange={setLogCategory}
          onClose={() => setLogsOpen(false)}
          onModeChange={setLogViewMode}
          onRefresh={refreshLogs}
          refreshDisabled={logsPending}
          runtimeLogs={runtimeLogs}
        />
      )}

      {notice && (
        <div className={`notice ${notice.tone}`} role="status">
          {notice.text}
        </div>
      )}

      {status?.bridge_error && (
        <div className="notice error" role="alert">
          {status.bridge_error}
        </div>
      )}

      <section className="runtime-grid" aria-label="Runtime controls">
        <RuntimePanel
          actionLabel="Local Trading"
          activeBrokers={activeBrokers}
          busy={pending !== null}
          onStart={() => run("start_local_trading")}
          onStop={() => run("stop_local_trading")}
          runtime={status?.trading ?? null}
          title="Local Trading"
        />
        <RuntimePanel
          actionLabel="Mobile API"
          busy={pending !== null}
          onStart={() => run("start_server")}
          onStop={() => run("stop_server")}
          runtime={status?.server ?? null}
          serverUrl={status?.server_settings?.local_url ?? null}
          title="Mobile API Server"
        />
      </section>

      <section className="workflow-grid" aria-label="Backtest and journal">
        <BacktestPanel
          bars={backtestBars}
          brokers={status?.brokers ?? []}
          result={backtestResult}
          running={backtestPending}
          selectedBroker={backtestBroker}
          tradingRunning={status?.trading.running ?? false}
          onBarsChange={setBacktestBars}
          onBrokerChange={setBacktestBroker}
          onRun={runBacktestFromUi}
        />
        <JournalPanel
          journal={journal}
          onRefresh={refreshJournal}
          refreshDisabled={journalPending}
        />
      </section>

      <section className="lower-grid">
        <section className="panel broker-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Active Broker Settings</p>
              <h2>Brokers</h2>
            </div>
            <span className="metric">{activeBrokers.length} active</span>
          </div>
          <BrokerTable brokers={status?.brokers ?? []} />
        </section>

        <LogsViewer
          appLogs={appLogs}
          category={logCategory}
          categories={logCategories}
          fileLogs={visibleFileLogs}
          mode={logViewMode}
          onCategoryChange={setLogCategory}
          onModeChange={setLogViewMode}
          onOpenLarge={() => setLogsOpen(true)}
          onRefresh={refreshLogs}
          refreshDisabled={logsPending}
          runtimeLogs={runtimeLogs}
        />
      </section>
    </main>
  );
}

function BacktestPanel({
  bars,
  brokers,
  result,
  running,
  selectedBroker,
  tradingRunning,
  onBarsChange,
  onBrokerChange,
  onRun,
}: {
  bars: string;
  brokers: BrokerSummary[];
  result: BacktestReport | null;
  running: boolean;
  selectedBroker: string;
  tradingRunning: boolean;
  onBarsChange: (value: string) => void;
  onBrokerChange: (value: string) => void;
  onRun: () => void;
}) {
  const activeCount = brokers.filter((broker) => broker.enabled).length;
  const hasSelectedBroker =
    selectedBroker === "active"
      ? activeCount > 0
      : selectedBroker === "all"
        ? brokers.length > 0
        : brokers.some((broker) => broker.id === selectedBroker);
  const canRun = !running && !tradingRunning && hasSelectedBroker;
  const summary = result?.summary;

  return (
    <section className="panel backtest-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Backtest</p>
          <h2>Strategy Check</h2>
        </div>
        <span className="metric">
          {summary ? `${summary.trade_count} trades` : `${activeCount} active`}
        </span>
      </div>

      <div className="backtest-controls">
        <label>
          <span>Broker scope</span>
          <select
            className="select-control"
            onChange={(event) => onBrokerChange(event.target.value)}
            value={selectedBroker}
          >
            <option value="active">Active brokers</option>
            <option value="all">All configured brokers</option>
            {brokers.map((broker) => (
              <option key={broker.id} value={broker.id}>
                {broker.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Bars per symbol</span>
          <input
            max={10000}
            min={50}
            onChange={(event) => onBarsChange(event.target.value)}
            type="number"
            value={bars}
          />
        </label>
        <button
          className="button primary"
          disabled={!canRun}
          onClick={onRun}
          type="button"
        >
          {running ? "Running Backtest" : "Run Backtest"}
        </button>
      </div>

      {tradingRunning && (
        <div className="notice warning">
          Stop local trading before running a backtest.
        </div>
      )}

      {summary ? (
        <>
          <BacktestSummaryGrid summary={summary} />
          <BacktestResultList result={result} />
        </>
      ) : (
        <div className="empty-state">No backtest has run yet.</div>
      )}
    </section>
  );
}

function BacktestSummaryGrid({ summary }: { summary: BacktestReport["summary"] }) {
  return (
    <div className="summary-grid">
      <MetricCard label="Brokers" value={summary.broker_count.toString()} />
      <MetricCard label="Symbols" value={summary.symbol_count.toString()} />
      <MetricCard label="Net" value={formatMoney(summary.net_profit)} />
      <MetricCard label="Win rate" value={`${summary.win_rate.toFixed(1)}%`} />
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function BacktestResultList({ result }: { result: BacktestReport }) {
  const rows = result.brokers.flatMap((broker) =>
    broker.symbols.flatMap((symbol) =>
      symbol.strategies.map((strategy) => ({
        broker,
        symbol,
        strategy,
      })),
    ),
  );

  if (!rows.length) {
    const errors = result.brokers.flatMap((broker) =>
      broker.errors.map((error) => `${broker.label}: ${error}`),
    );

    return (
      <div className="empty-state">
        {errors.length ? errors.join(" ") : "No backtest data returned."}
      </div>
    );
  }

  return (
    <div className="backtest-results">
      {rows.map(({ broker, symbol, strategy }) => (
        <div
          className="backtest-result-row"
          key={`${broker.id}-${symbol.mt5}-${strategy.id}`}
        >
          <div>
            <strong>{symbol.mt5}</strong>
            <small>
              {broker.label} | {strategy.name} | {strategy.timeframe}
            </small>
            {strategy.errors.length > 0 && (
              <small className="error-text">{strategy.errors.join(" ")}</small>
            )}
          </div>
          <span>{strategy.trade_count} trades</span>
          <span>{formatMoney(strategy.net_profit)}</span>
        </div>
      ))}
    </div>
  );
}

function JournalPanel({
  journal,
  refreshDisabled,
  onRefresh,
}: {
  journal: TradeJournalResponse | null;
  refreshDisabled: boolean;
  onRefresh: () => void;
}) {
  const entries = journal?.entries ?? [];

  return (
    <section className="panel journal-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Journal</p>
          <h2>Trade Journal</h2>
        </div>
        <span className="metric">{entries.length} rows</span>
      </div>

      <div className="journal-toolbar">
        <button
          className="button secondary compact"
          disabled={refreshDisabled}
          onClick={onRefresh}
          type="button"
        >
          {refreshDisabled ? "Refreshing" : "Refresh Journal"}
        </button>
      </div>

      {journal?.error && (
        <div className="notice error">{journal.error}</div>
      )}

      {!journal?.exists ? (
        <div className="empty-state">No trade journal found yet.</div>
      ) : (
        <JournalEntryList entries={entries} />
      )}
    </section>
  );
}

function JournalEntryList({
  entries,
}: {
  entries: TradeJournalResponse["entries"];
}) {
  if (!entries.length) {
    return <div className="empty-state">No journal entries yet.</div>;
  }

  return (
    <div className="journal-table" role="table">
      <div className="journal-row header" role="row">
        <span role="columnheader">Time</span>
        <span role="columnheader">Symbol</span>
        <span role="columnheader">Type</span>
        <span role="columnheader">Lot</span>
        <span role="columnheader">Entry</span>
        <span role="columnheader">Ticket</span>
        <span role="columnheader">Status</span>
      </div>
      {entries.map((entry) => (
        <div className="journal-row" key={`${entry.row}-${entry.ticket}`} role="row">
          <span role="cell">{formatJournalStamp(entry.time)}</span>
          <span role="cell">{entry.symbol || "Unknown"}</span>
          <span role="cell">{entry.type || "N/A"}</span>
          <span role="cell">{entry.lot || "N/A"}</span>
          <span role="cell">{entry.entry || "N/A"}</span>
          <span role="cell">{entry.ticket || "N/A"}</span>
          <span
            className={
              entry.status.toUpperCase() === "EXECUTED"
                ? "validation ok"
                : "validation bad"
            }
            role="cell"
          >
            {entry.status || "N/A"}
          </span>
        </div>
      ))}
    </div>
  );
}

type SettingsDraft = {
  activeProfile: string;
  restoreTradingDefault: boolean;
  restoreStrategyDefaults: boolean;
  strategies: Record<string, boolean>;
  brokers: Record<string, boolean>;
  brokerConfigs: Record<string, BrokerConfigDraft>;
  brokerStrategies: Record<string, Record<string, boolean>>;
  brokerDailyLimits: Record<string, BrokerDailyLimitsDraft>;
  newBroker: NewBrokerDraft;
};

type BrokerDailyLimitsDraft = {
  enabled: boolean;
  target: string;
  maxLoss: string;
};

type BrokerConfigDraft = {
  terminalPath: string;
  expectedLogin: string;
  expectedServer: string;
};

type NewBrokerDraft = {
  id: string;
  label: string;
  enabled: boolean;
  terminalPath: string;
  expectedLogin: string;
  expectedServer: string;
  tradingProfile: string;
  symbols: string;
};

type SettingsModalProps = {
  tradingRunning: boolean;
  onClose: () => void;
  onSaved: (response: BotSettingsSaveResponse) => void;
};

function SettingsModal({
  tradingRunning,
  onClose,
  onSaved,
}: SettingsModalProps) {
  const [settings, setSettings] = useState<BotSettings | null>(null);
  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const controlsDisabled = loading || saving || tradingRunning;
  const enabledStrategyCount = useMemo(() => {
    if (!draft) {
      return 0;
    }

    return Object.values(draft.strategies).filter(Boolean).length;
  }, [draft]);

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      setLoading(true);
      setError(null);

      try {
        const nextSettings = await getBotSettings();

        if (mounted) {
          setSettings(nextSettings);
          setDraft(createSettingsDraft(nextSettings));
        }
      } catch (error) {
        if (mounted) {
          setError(normalizeError(error));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  function updateProfile(profileId: string) {
    setDraft((current) =>
      current
        ? {
            ...current,
            activeProfile: profileId,
            restoreTradingDefault: false,
          }
        : current,
    );
  }

  function restoreTradingDefault() {
    if (!settings) {
      return;
    }

    setDraft((current) =>
      current
        ? {
            ...current,
            activeProfile: settings.trading.default_profile,
            restoreTradingDefault: true,
          }
        : current,
    );
  }

  function updateStrategy(strategyId: string, enabled: boolean) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const nextStrategies = {
        ...current.strategies,
        [strategyId]: enabled,
      };

      if (!Object.values(nextStrategies).some(Boolean)) {
        return current;
      }

      return {
        ...current,
        restoreStrategyDefaults: false,
        strategies: nextStrategies,
      };
    });
  }

  function restoreStrategyDefaults() {
    if (!settings) {
      return;
    }

    setDraft((current) =>
      current
        ? {
            ...current,
            restoreStrategyDefaults: true,
            strategies: Object.fromEntries(
              settings.strategies.map((strategy) => [
                strategy.id,
                strategy.default_enabled,
              ]),
            ),
          }
        : current,
    );
  }

  function updateBroker(brokerId: string, enabled: boolean) {
    setDraft((current) =>
      current
        ? {
            ...current,
            brokers: {
              ...current.brokers,
              [brokerId]: enabled,
            },
          }
        : current,
    );
  }

  function updateBrokerConfig(
    brokerId: string,
    updates: Partial<BrokerConfigDraft>,
  ) {
    setDraft((current) =>
      current
        ? {
            ...current,
            brokerConfigs: {
              ...current.brokerConfigs,
              [brokerId]: {
                ...current.brokerConfigs[brokerId],
                ...updates,
              },
            },
          }
        : current,
    );
  }

  function updateBrokerStrategy(
    brokerId: string,
    strategyId: string,
    enabled: boolean,
  ) {
    setDraft((current) =>
      current
        ? {
            ...current,
            brokerStrategies: {
              ...current.brokerStrategies,
              [brokerId]: {
                ...(current.brokerStrategies[brokerId] ?? {}),
                [strategyId]: enabled,
              },
            },
          }
        : current,
    );
  }

  function updateBrokerDailyLimits(
    brokerId: string,
    updates: Partial<BrokerDailyLimitsDraft>,
  ) {
    setDraft((current) =>
      current
        ? {
            ...current,
            brokerDailyLimits: {
              ...current.brokerDailyLimits,
              [brokerId]: {
                ...current.brokerDailyLimits[brokerId],
                ...updates,
              },
            },
          }
        : current,
    );
  }

  function updateNewBroker(updates: Partial<NewBrokerDraft>) {
    setDraft((current) =>
      current
        ? {
            ...current,
            newBroker: {
              ...current.newBroker,
              ...updates,
            },
          }
        : current,
    );
  }

  function resetNewBroker() {
    setDraft((current) =>
      current
        ? {
            ...current,
            newBroker: createEmptyNewBrokerDraft(current.activeProfile),
          }
        : current,
    );
  }

  async function saveSettings() {
    if (!draft) {
      return;
    }

    if (tradingRunning) {
      setError("Stop local trading before saving bot settings.");
      return;
    }

    if (enabledStrategyCount < 1) {
      setError("At least one strategy must stay enabled.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await saveBotSettings(buildSettingsPayload(draft));
      onSaved(response);
    } catch (error) {
      setError(normalizeError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        aria-labelledby="settings-title"
        aria-modal="true"
        className="settings-modal"
        role="dialog"
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Bot Settings</p>
            <h2 id="settings-title">Desktop Controls</h2>
          </div>
          <button
            aria-label="Close settings"
            className="icon-button"
            onClick={onClose}
            title="Close settings"
            type="button"
          >
            <CloseIcon />
          </button>
        </div>

        {tradingRunning && (
          <div className="notice warning" role="status">
            Stop local trading before editing bot settings.
          </div>
        )}

        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}

        {loading && <div className="empty-state">Loading settings...</div>}

        {!loading && settings && draft && (
          <div className="settings-content">
            <section className="settings-section">
              <div className="settings-section-heading">
                <div>
                  <p className="eyebrow">Trading</p>
                  <h3>Profile</h3>
                </div>
                <button
                  className="button secondary compact"
                  disabled={controlsDisabled}
                  onClick={restoreTradingDefault}
                  type="button"
                >
                  Restore Regular Risk
                </button>
              </div>
              <div className="option-list">
                {settings.trading.profiles.map((profile) => (
                  <label className="option-row" key={profile.id}>
                    <input
                      checked={draft.activeProfile === profile.id}
                      disabled={controlsDisabled}
                      name="trading-profile"
                      onChange={() => updateProfile(profile.id)}
                      type="radio"
                    />
                    <span>
                      <strong>{profile.label}</strong>
                      <small>{formatProfileMeta(profile)}</small>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section className="settings-section">
              <div className="settings-section-heading">
                <div>
                  <p className="eyebrow">Strategies</p>
                  <h3>Global Toggles</h3>
                </div>
                <button
                  className="button secondary compact"
                  disabled={controlsDisabled}
                  onClick={restoreStrategyDefaults}
                  type="button"
                >
                  Restore Config Defaults
                </button>
              </div>
              <div className="option-list">
                {settings.strategies.map((strategy) => (
                  <StrategyToggle
                    checked={draft.strategies[strategy.id] ?? strategy.enabled}
                    disabled={controlsDisabled}
                    key={strategy.id}
                    onChange={(enabled) => updateStrategy(strategy.id, enabled)}
                    onlyEnabled={enabledStrategyCount === 1}
                    strategy={strategy}
                  />
                ))}
              </div>
            </section>

            <section className="settings-section">
              <div className="settings-section-heading">
                <div>
                  <p className="eyebrow">Brokers</p>
                  <h3>Active Brokers</h3>
                </div>
                <span className="metric">
                  {Object.values(draft.brokers).filter(Boolean).length} active
                </span>
              </div>
              <div className="broker-settings-list">
                {settings.brokers.map((broker) => (
                  <BrokerSettingsCard
                    broker={broker}
                    brokerConfig={
                      draft.brokerConfigs[broker.id]
                      ?? createBrokerConfigDraft(broker)
                    }
                    dailyLimits={
                      draft.brokerDailyLimits[broker.id]
                      ?? createBrokerDailyLimitsDraft(broker.daily_limits)
                    }
                    brokerStrategies={draft.brokerStrategies[broker.id] ?? {}}
                    checked={draft.brokers[broker.id] ?? broker.enabled}
                    disabled={controlsDisabled}
                    key={broker.id}
                    onBrokerChange={(enabled) =>
                      updateBroker(broker.id, enabled)
                    }
                    onConfigChange={(updates) =>
                      updateBrokerConfig(broker.id, updates)
                    }
                    onStrategyChange={(strategyId, enabled) =>
                      updateBrokerStrategy(broker.id, strategyId, enabled)
                    }
                    onDailyLimitsChange={(updates) =>
                      updateBrokerDailyLimits(broker.id, updates)
                    }
                  />
                ))}
              </div>
              <NewBrokerForm
                disabled={controlsDisabled}
                draft={draft.newBroker}
                onChange={updateNewBroker}
                onReset={resetNewBroker}
                profiles={settings.trading.profiles}
              />
            </section>
          </div>
        )}

        <div className="modal-actions">
          <button
            className="button secondary"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="button primary"
            disabled={!draft || controlsDisabled || enabledStrategyCount < 1}
            onClick={saveSettings}
            type="button"
          >
            {saving ? "Saving" : "Save Settings"}
          </button>
        </div>
      </section>
    </div>
  );
}

function StrategyToggle({
  strategy,
  checked,
  disabled,
  onlyEnabled,
  onChange,
}: {
  strategy: BotStrategySummary;
  checked: boolean;
  disabled: boolean;
  onlyEnabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const cannotDisableLast = checked && onlyEnabled;

  return (
    <label className="option-row">
      <input
        checked={checked}
        disabled={disabled || cannotDisableLast}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>
        <strong>{strategy.label}</strong>
        <small>
          Live timeframe: {strategy.timeframe} | Best timeframes:{" "}
          {strategy.recommended_timeframes.join(", ") || "N/A"}
        </small>
      </span>
    </label>
  );
}

function BrokerSettingsCard({
  broker,
  checked,
  disabled,
  brokerConfig,
  dailyLimits,
  brokerStrategies,
  onBrokerChange,
  onConfigChange,
  onStrategyChange,
  onDailyLimitsChange,
}: {
  broker: BrokerSummary;
  checked: boolean;
  disabled: boolean;
  brokerConfig: BrokerConfigDraft;
  dailyLimits: BrokerDailyLimitsDraft;
  brokerStrategies: Record<string, boolean>;
  onBrokerChange: (enabled: boolean) => void;
  onConfigChange: (updates: Partial<BrokerConfigDraft>) => void;
  onStrategyChange: (strategyId: string, enabled: boolean) => void;
  onDailyLimitsChange: (updates: Partial<BrokerDailyLimitsDraft>) => void;
}) {
  const brokerInputId = `broker-${broker.id}`;

  return (
    <div className="broker-settings-row">
      <input
        checked={checked}
        disabled={disabled}
        id={brokerInputId}
        onChange={(event) => onBrokerChange(event.target.checked)}
        type="checkbox"
      />
      <div className="broker-settings-body">
        <div className="broker-settings-title">
          <label htmlFor={brokerInputId}>
            <strong>{broker.label}</strong>
          </label>
          <span
            className={
              broker.validation.valid ? "validation ok" : "validation bad"
            }
          >
            {broker.validation.valid ? "Ready" : "Needs Setup"}
          </span>
        </div>
        <small>Terminal: {broker.terminal_path || "Not set"}</small>
        <BrokerConnectionControls
          config={brokerConfig}
          disabled={disabled}
          onChange={onConfigChange}
        />
        <small>Enabled symbols: {broker.enabled_symbols.length}</small>
        <BrokerDailyLimitControls
          dailyLimits={dailyLimits}
          disabled={disabled}
          onChange={onDailyLimitsChange}
        />
        <BrokerStrategyOptions
          broker={broker}
          brokerStrategies={brokerStrategies}
          disabled={disabled}
          onStrategyChange={onStrategyChange}
        />
        <ValidationList broker={broker} />
      </div>
    </div>
  );
}

function BrokerConnectionControls({
  config,
  disabled,
  onChange,
}: {
  config: BrokerConfigDraft;
  disabled: boolean;
  onChange: (updates: Partial<BrokerConfigDraft>) => void;
}) {
  return (
    <div className="broker-connection-grid">
      <label>
        <span>MT5 path</span>
        <input
          disabled={disabled}
          onChange={(event) => onChange({ terminalPath: event.target.value })}
          placeholder="C:\\Program Files\\MetaTrader 5\\terminal64.exe"
          type="text"
          value={config.terminalPath}
        />
      </label>
      <label>
        <span>Login account</span>
        <input
          disabled={disabled}
          inputMode="numeric"
          onChange={(event) => onChange({ expectedLogin: event.target.value })}
          placeholder="41052686"
          type="text"
          value={config.expectedLogin}
        />
      </label>
      <label>
        <span>Server</span>
        <input
          disabled={disabled}
          onChange={(event) => onChange({ expectedServer: event.target.value })}
          placeholder="Deriv-Demo"
          type="text"
          value={config.expectedServer}
        />
      </label>
    </div>
  );
}

function NewBrokerForm({
  disabled,
  draft,
  profiles,
  onChange,
  onReset,
}: {
  disabled: boolean;
  draft: NewBrokerDraft;
  profiles: BotSettings["trading"]["profiles"];
  onChange: (updates: Partial<NewBrokerDraft>) => void;
  onReset: () => void;
}) {
  const hasInput = newBrokerHasInput(draft);

  return (
    <div className="new-broker-panel">
      <div className="settings-section-heading">
        <div>
          <p className="eyebrow">New Broker</p>
          <h3>Add Broker</h3>
        </div>
        <button
          className="button secondary compact"
          disabled={disabled || !hasInput}
          onClick={onReset}
          type="button"
        >
          Clear
        </button>
      </div>
      <div className="new-broker-grid">
        <label>
          <span>Broker name</span>
          <input
            disabled={disabled}
            onChange={(event) => onChange({ label: event.target.value })}
            placeholder="My Broker"
            type="text"
            value={draft.label}
          />
        </label>
        <label>
          <span>Broker id</span>
          <input
            disabled={disabled}
            onChange={(event) => onChange({ id: event.target.value })}
            placeholder="my_broker"
            type="text"
            value={draft.id}
          />
        </label>
        <label>
          <span>MT5 path</span>
          <input
            disabled={disabled}
            onChange={(event) => onChange({ terminalPath: event.target.value })}
            placeholder="C:\\Program Files\\MetaTrader 5\\terminal64.exe"
            type="text"
            value={draft.terminalPath}
          />
        </label>
        <label>
          <span>Login account</span>
          <input
            disabled={disabled}
            inputMode="numeric"
            onChange={(event) => onChange({ expectedLogin: event.target.value })}
            placeholder="12345678"
            type="text"
            value={draft.expectedLogin}
          />
        </label>
        <label>
          <span>Server</span>
          <input
            disabled={disabled}
            onChange={(event) => onChange({ expectedServer: event.target.value })}
            placeholder="Broker-Demo"
            type="text"
            value={draft.expectedServer}
          />
        </label>
        <label>
          <span>Profile</span>
          <select
            className="select-control"
            disabled={disabled}
            onChange={(event) => onChange({ tradingProfile: event.target.value })}
            value={draft.tradingProfile}
          >
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.label}
              </option>
            ))}
          </select>
        </label>
        <label className="new-broker-symbols">
          <span>MT5 symbols</span>
          <textarea
            disabled={disabled}
            onChange={(event) => onChange({ symbols: event.target.value })}
            placeholder="EURUSDm, GBPUSDm"
            rows={3}
            value={draft.symbols}
          />
        </label>
        <label className="new-broker-enabled">
          <input
            checked={draft.enabled}
            disabled={disabled}
            onChange={(event) => onChange({ enabled: event.target.checked })}
            type="checkbox"
          />
          <span>Enable after saving</span>
        </label>
      </div>
    </div>
  );
}

function BrokerDailyLimitControls({
  dailyLimits,
  disabled,
  onChange,
}: {
  dailyLimits: BrokerDailyLimitsDraft;
  disabled: boolean;
  onChange: (updates: Partial<BrokerDailyLimitsDraft>) => void;
}) {
  return (
    <div className="daily-limit-controls">
      <label className="broker-strategy-option">
        <input
          checked={dailyLimits.enabled}
          disabled={disabled}
          onChange={(event) => onChange({ enabled: event.target.checked })}
          type="checkbox"
        />
        <span>
          <strong>Daily lock</strong>
          <small>Broker-specific target and loss guard.</small>
        </span>
      </label>
      <div className="daily-limit-grid">
        <label>
          <span>Daily target</span>
          <input
            disabled={disabled}
            min="0"
            onChange={(event) => onChange({ target: event.target.value })}
            step="0.01"
            type="number"
            value={dailyLimits.target}
          />
        </label>
        <label>
          <span>Daily loss</span>
          <input
            disabled={disabled}
            min="0"
            onChange={(event) => onChange({ maxLoss: event.target.value })}
            step="0.01"
            type="number"
            value={dailyLimits.maxLoss}
          />
        </label>
      </div>
    </div>
  );
}

function BrokerStrategyOptions({
  broker,
  brokerStrategies,
  disabled,
  onStrategyChange,
}: {
  broker: BrokerSummary;
  brokerStrategies: Record<string, boolean>;
  disabled: boolean;
  onStrategyChange: (strategyId: string, enabled: boolean) => void;
}) {
  if (!broker.allowed_strategies.length) {
    return (
      <small className="muted">
        No strategy options configured for this broker.
      </small>
    );
  }

  return (
    <div
      aria-label={`${broker.label} allowed strategies`}
      className="broker-strategy-options"
    >
      <p className="settings-subheading">Allowed strategies</p>
      {broker.allowed_strategies.map((strategy) => (
        <label className="broker-strategy-option" key={strategy.id}>
          <input
            checked={brokerStrategies[strategy.id] ?? strategy.enabled}
            disabled={disabled}
            onChange={(event) =>
              onStrategyChange(strategy.id, event.target.checked)
            }
            type="checkbox"
          />
          <span>
            <strong>{strategy.label}</strong>
            <small>
              {strategy.timeframe} |{" "}
              {strategy.recommended_timeframes.join(", ") || "N/A"}
            </small>
          </span>
        </label>
      ))}
    </div>
  );
}

function ValidationList({ broker }: { broker: BrokerSummary }) {
  const messages = [
    ...broker.validation.warnings.map((message) => ({
      tone: "warning",
      message,
    })),
    ...broker.validation.errors.map((message) => ({
      tone: "error",
      message,
    })),
  ];

  if (!messages.length) {
    return null;
  }

  return (
    <ul className="validation-list">
      {messages.map((item) => (
        <li className={item.tone} key={`${item.tone}-${item.message}`}>
          {item.message}
        </li>
      ))}
    </ul>
  );
}

function createSettingsDraft(settings: BotSettings): SettingsDraft {
  return {
    activeProfile: settings.trading.active_profile,
    restoreTradingDefault: false,
    restoreStrategyDefaults: false,
    strategies: Object.fromEntries(
      settings.strategies.map((strategy) => [
        strategy.id,
        strategy.enabled,
      ]),
    ),
    brokers: Object.fromEntries(
      settings.brokers.map((broker) => [
        broker.id,
        broker.enabled,
      ]),
    ),
    brokerConfigs: Object.fromEntries(
      settings.brokers.map((broker) => [
        broker.id,
        createBrokerConfigDraft(broker),
      ]),
    ),
    brokerStrategies: Object.fromEntries(
      settings.brokers.map((broker) => [
        broker.id,
        Object.fromEntries(
          broker.allowed_strategies.map((strategy) => [
            strategy.id,
            strategy.enabled,
          ]),
        ),
      ]),
    ),
    brokerDailyLimits: Object.fromEntries(
      settings.brokers.map((broker) => [
        broker.id,
        createBrokerDailyLimitsDraft(broker.daily_limits),
      ]),
    ),
    newBroker: createEmptyNewBrokerDraft(settings.trading.active_profile),
  };
}

function buildSettingsPayload(draft: SettingsDraft): BotSettingsPayload {
  return {
    ...(draft.restoreTradingDefault
      ? { restore_trading_default: true }
      : { active_profile: draft.activeProfile }),
    ...(draft.restoreStrategyDefaults
      ? { restore_strategy_defaults: true }
      : { strategies: draft.strategies }),
    brokers: draft.brokers,
    broker_configs: buildBrokerConfigsPayload(draft.brokerConfigs),
    broker_strategies: draft.brokerStrategies,
    broker_daily_limits: buildBrokerDailyLimitsPayload(
      draft.brokerDailyLimits,
    ),
    new_brokers: buildNewBrokerPayload(draft.newBroker),
  };
}

function createBrokerConfigDraft(broker: BrokerSummary): BrokerConfigDraft {
  return {
    terminalPath: broker.terminal_path,
    expectedLogin: broker.expected_login === null ? "" : String(broker.expected_login),
    expectedServer: broker.expected_server,
  };
}

function createBrokerDailyLimitsDraft(
  dailyLimits: BrokerDailyLimits,
): BrokerDailyLimitsDraft {
  return {
    enabled: dailyLimits.enabled,
    target: String(dailyLimits.target),
    maxLoss: String(Math.abs(dailyLimits.max_loss)),
  };
}

function createEmptyNewBrokerDraft(profileId: string): NewBrokerDraft {
  return {
    id: "",
    label: "",
    enabled: false,
    terminalPath: "",
    expectedLogin: "",
    expectedServer: "",
    tradingProfile: profileId,
    symbols: "",
  };
}

function buildBrokerConfigsPayload(
  configs: Record<string, BrokerConfigDraft>,
): BotSettingsPayload["broker_configs"] {
  return Object.fromEntries(
    Object.entries(configs).map(([brokerId, config]) => [
      brokerId,
      {
        terminal_path: config.terminalPath.trim(),
        expected_login: config.expectedLogin.trim() || null,
        expected_server: config.expectedServer.trim(),
      },
    ]),
  );
}

function buildBrokerDailyLimitsPayload(
  dailyLimits: Record<string, BrokerDailyLimitsDraft>,
): Record<string, BrokerDailyLimits> {
  return Object.fromEntries(
    Object.entries(dailyLimits).map(([brokerId, limits]) => {
      const target = Number(limits.target);
      const maxLoss = Number(limits.maxLoss);

      if (!Number.isFinite(target) || target <= 0) {
        throw new Error("Daily target must be greater than zero.");
      }

      if (!Number.isFinite(maxLoss) || maxLoss <= 0) {
        throw new Error("Daily loss must be greater than zero.");
      }

      return [
        brokerId,
        {
          enabled: limits.enabled,
          target,
          max_loss: -Math.abs(maxLoss),
        },
      ];
    }),
  );
}

function buildNewBrokerPayload(
  draft: NewBrokerDraft,
): BotSettingsPayload["new_brokers"] {
  if (!newBrokerHasInput(draft)) {
    return [];
  }

  const label = draft.label.trim();
  const terminalPath = draft.terminalPath.trim();
  const expectedServer = draft.expectedServer.trim();
  const symbols = parseSymbolText(draft.symbols);

  if (!label) {
    throw new Error("New broker name is required.");
  }

  if (!terminalPath) {
    throw new Error("New broker MT5 path is required.");
  }

  if (!expectedServer) {
    throw new Error("New broker server is required.");
  }

  if (!symbols.length) {
    throw new Error("New broker must include at least one MT5 symbol.");
  }

  return [
    {
      ...(draft.id.trim() ? { id: draft.id.trim() } : {}),
      label,
      enabled: draft.enabled,
      terminal_path: terminalPath,
      expected_login: draft.expectedLogin.trim() || null,
      expected_server: expectedServer,
      trading_profile: draft.tradingProfile,
      symbols,
    },
  ];
}

function newBrokerHasInput(draft: NewBrokerDraft): boolean {
  return [
    draft.id,
    draft.label,
    draft.terminalPath,
    draft.expectedLogin,
    draft.expectedServer,
    draft.symbols,
  ].some((value) => value.trim().length > 0);
}

function parseSymbolText(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((symbol) => symbol.trim())
    .filter(Boolean);
}

function formatProfileMeta(profile: BotSettings["trading"]["profiles"][number]) {
  const lotSummary =
    profile.lot_mode === "min"
      ? "Broker minimum lot"
      : `Auto risk ${profile.risk_percent.toFixed(2)}%`;
  const spreadSummary = profile.bypass_spread_filter
    ? "spread filter off"
    : `${profile.max_spread_points} point spread limit`;
  const protections = [
    profile.use_take_profit ? "TP" : "No TP",
    profile.use_break_even ? "break-even" : "no break-even",
    profile.use_trailing_stop ? "trailing stop" : "no trailing stop",
  ].join(", ");

  return `${lotSummary}; ${spreadSummary}; ${protections}. ${profile.description}`;
}

function GearIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
      <path d="M19.4 13.5a7.8 7.8 0 0 0 0-3l2-1.5-2-3.5-2.4 1a7.8 7.8 0 0 0-2.6-1.5L14 2.4h-4l-.4 2.6A7.8 7.8 0 0 0 7 6.5l-2.4-1-2 3.5 2 1.5a7.8 7.8 0 0 0 0 3l-2 1.5 2 3.5 2.4-1a7.8 7.8 0 0 0 2.6 1.5l.4 2.6h4l.4-2.6a7.8 7.8 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5Z" />
    </svg>
  );
}

function LogsIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 3h14v18H5V3Zm2 2v14h10V5H7Z" />
      <path d="M9 8h6v2H9V8Zm0 4h6v2H9v-2Zm0 4h4v2H9v-2Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m6.4 5 12.6 12.6-1.4 1.4L5 6.4 6.4 5Z" />
      <path d="M19 6.4 6.4 19 5 17.6 17.6 5 19 6.4Z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M20.4 14.1A7.7 7.7 0 0 1 9.9 3.6 8.7 8.7 0 1 0 20.4 14.1Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 17.2A5.2 5.2 0 1 0 12 6.8a5.2 5.2 0 0 0 0 10.4Z" />
      <path d="M11 2h2v3h-2V2Zm0 17h2v3h-2v-3ZM2 11h3v2H2v-2Zm17 0h3v2h-3v-2ZM4.2 5.6l1.4-1.4 2.1 2.1-1.4 1.4-2.1-2.1Zm12.1 12.1 1.4-1.4 2.1 2.1-1.4 1.4-2.1-2.1Zm2.1-13.5 1.4 1.4-2.1 2.1-1.4-1.4 2.1-2.1ZM6.3 16.3l1.4 1.4-2.1 2.1-1.4-1.4 2.1-2.1Z" />
    </svg>
  );
}

type RuntimePanelProps = {
  title: string;
  actionLabel: string;
  runtime: ManagedRuntime | null;
  busy: boolean;
  serverUrl?: string | null;
  activeBrokers?: BrokerSummary[];
  onStart: () => void;
  onStop: () => void;
};

function RuntimePanel({
  title,
  actionLabel,
  runtime,
  busy,
  serverUrl,
  activeBrokers,
  onStart,
  onStop,
}: RuntimePanelProps) {
  const running = runtime?.running ?? false;

  return (
    <section className="panel runtime-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{title}</p>
          <h2>{running ? "Running" : "Stopped"}</h2>
        </div>
        <StatusPill running={running} state={runtime?.state ?? "loading"} />
      </div>

      <dl className="runtime-facts">
        <div>
          <dt>PID</dt>
          <dd>{runtime?.pids.length ? runtime.pids.join(", ") : "None"}</dd>
        </div>
        <div>
          <dt>Started</dt>
          <dd>{formatStamp(runtime?.started_at)}</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>{runtime?.message ?? "Waiting for status"}</dd>
        </div>
      </dl>

      {serverUrl && (
        <a className="server-link" href={serverUrl} target="_blank">
          {serverUrl}
        </a>
      )}

      {activeBrokers && (
        <div className="broker-chips">
          {activeBrokers.length ? (
            activeBrokers.map((broker) => (
              <span className="chip" key={broker.id}>
                {broker.label}
              </span>
            ))
          ) : (
            <span className="muted">No active brokers</span>
          )}
        </div>
      )}

      <div className="button-row">
        <button
          className="button primary"
          disabled={busy || running}
          onClick={onStart}
          type="button"
        >
          Start {actionLabel}
        </button>
        <button
          className="button secondary"
          disabled={busy || !running}
          onClick={onStop}
          type="button"
        >
          Stop {actionLabel}
        </button>
      </div>
    </section>
  );
}

function BrokerTable({ brokers }: { brokers: BrokerSummary[] }) {
  if (!brokers.length) {
    return <div className="empty-state">No broker settings found.</div>;
  }

  return (
    <div className="broker-table" role="table">
      <div className="broker-row header" role="row">
        <span role="columnheader">Broker</span>
        <span role="columnheader">State</span>
        <span role="columnheader">Profile</span>
        <span role="columnheader">Daily Lock</span>
        <span role="columnheader">Symbols</span>
        <span role="columnheader">Validation</span>
      </div>
      {brokers.map((broker) => (
        <div className="broker-row" key={broker.id} role="row">
          <span className="broker-name" role="cell">
            {broker.label}
          </span>
          <span role="cell">{broker.enabled ? "Active" : "Off"}</span>
          <span role="cell">{broker.trading_profile}</span>
          <span role="cell">{formatDailyLimits(broker.daily_limits)}</span>
          <span role="cell">
            {broker.enabled_symbols.length
              ? broker.enabled_symbols.join(", ")
              : "None"}
          </span>
          <span
            className={
              broker.validation.valid ? "validation ok" : "validation bad"
            }
            role="cell"
            title={[...broker.validation.errors, ...broker.validation.warnings].join(
              " ",
            )}
          >
            {broker.validation.valid ? "Ready" : "Needs Setup"}
          </span>
        </div>
      ))}
    </div>
  );
}

function LogsModal({
  appLogs,
  categories,
  category,
  fileLogs,
  mode,
  refreshDisabled,
  runtimeLogs,
  onCategoryChange,
  onClose,
  onModeChange,
  onRefresh,
}: {
  appLogs: AppLogsResponse | null;
  categories: string[];
  category: string;
  fileLogs: AppLogEntry[];
  mode: LogViewMode;
  refreshDisabled: boolean;
  runtimeLogs: RuntimeLog[];
  onCategoryChange: (category: string) => void;
  onClose: () => void;
  onModeChange: (mode: LogViewMode) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        aria-labelledby="logs-modal-title"
        aria-modal="true"
        className="settings-modal logs-modal"
        role="dialog"
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Logs</p>
            <h2 id="logs-modal-title">Runtime Evidence</h2>
          </div>
          <button
            aria-label="Close logs"
            className="icon-button"
            onClick={onClose}
            title="Close logs"
            type="button"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="modal-log-content">
          <LogsViewer
            appLogs={appLogs}
            categories={categories}
            category={category}
            fileLogs={fileLogs}
            large
            mode={mode}
            onCategoryChange={onCategoryChange}
            onModeChange={onModeChange}
            onRefresh={onRefresh}
            refreshDisabled={refreshDisabled}
            runtimeLogs={runtimeLogs}
          />
        </div>
      </section>
    </div>
  );
}

function LogsViewer({
  appLogs,
  categories,
  category,
  fileLogs,
  large = false,
  mode,
  refreshDisabled,
  runtimeLogs,
  onCategoryChange,
  onModeChange,
  onOpenLarge,
  onRefresh,
}: {
  appLogs: AppLogsResponse | null;
  categories: string[];
  category: string;
  fileLogs: AppLogEntry[];
  large?: boolean;
  mode: LogViewMode;
  refreshDisabled: boolean;
  runtimeLogs: RuntimeLog[];
  onCategoryChange: (category: string) => void;
  onModeChange: (mode: LogViewMode) => void;
  onOpenLarge?: () => void;
  onRefresh: () => void;
}) {
  const visibleLineCount =
    mode === "files" ? fileLogs.length : runtimeLogs.length;

  return (
    <section className={`panel log-panel${large ? " large" : ""}`}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">
            {mode === "files" ? "File Logs" : "Process Output"}
          </p>
          <h2>Logs Viewer</h2>
        </div>
        <span className="metric">{visibleLineCount} lines</span>
      </div>

      <div className="log-toolbar">
        <div className="segmented-control" role="tablist">
          <button
            aria-selected={mode === "files"}
            className={mode === "files" ? "selected" : ""}
            onClick={() => onModeChange("files")}
            role="tab"
            type="button"
          >
            File Logs
          </button>
          <button
            aria-selected={mode === "runtime"}
            className={mode === "runtime" ? "selected" : ""}
            onClick={() => onModeChange("runtime")}
            role="tab"
            type="button"
          >
            Runtime Output
          </button>
        </div>

        {mode === "files" && (
          <select
            className="select-control"
            onChange={(event) => onCategoryChange(event.target.value)}
            value={category}
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? "All Logs" : formatCategory(item)}
              </option>
            ))}
          </select>
        )}

        <button
          className="button secondary compact"
          disabled={refreshDisabled}
          onClick={onRefresh}
          type="button"
        >
          {refreshDisabled ? "Refreshing" : "Refresh Logs"}
        </button>
        {onOpenLarge && (
          <button
            className="button secondary compact"
            onClick={onOpenLarge}
            type="button"
          >
            Open Large
          </button>
        )}
      </div>

      {mode === "files" && (
        <>
          <LogFileStrip appLogs={appLogs} />
          <FileLogList logs={fileLogs} />
        </>
      )}

      {mode === "runtime" && <RuntimeLogList logs={runtimeLogs} />}
    </section>
  );
}

function LogFileStrip({ appLogs }: { appLogs: AppLogsResponse | null }) {
  if (!appLogs?.files.length) {
    return null;
  }

  return (
    <div className="log-file-strip" aria-label="Log files">
      {appLogs.files.map((file) => (
        <span className="log-file-chip" key={file.file} title={file.file}>
          {file.name}
          <small>{formatFileSize(file.size)}</small>
        </span>
      ))}
    </div>
  );
}

function FileLogList({ logs }: { logs: AppLogEntry[] }) {
  if (!logs.length) {
    return <div className="empty-state">No file logs found.</div>;
  }

  return (
    <ol className="log-list file-log-list">
      {logs.map((log) => (
        <li key={`${log.file}-${log.line_number}-${log.raw}`}>
          <span className="log-time">{formatLogStamp(log.at)}</span>
          <span className={`log-stream ${log.level.toLowerCase()}`}>
            {log.level}
          </span>
          <span className="log-source" title={log.file}>
            {log.source}
          </span>
          <span className="log-line">{log.line}</span>
        </li>
      ))}
    </ol>
  );
}

function RuntimeLogList({ logs }: { logs: RuntimeLog[] }) {
  if (!logs.length) {
    return <div className="empty-state">No process output yet.</div>;
  }

  return (
    <ol className="log-list">
      {logs.map((log, index) => (
        <li key={`${log.at}-${log.source}-${index}`}>
          <span className="log-time">{formatStamp(log.at)}</span>
          <span className={`log-stream ${log.stream}`}>{log.stream}</span>
          <span className="log-source">{log.source}</span>
          <span className="log-line">{log.line}</span>
        </li>
      ))}
    </ol>
  );
}

function StatusPill({ running, state }: { running: boolean; state: string }) {
  return (
    <span className={`status-pill ${running ? "running" : "stopped"}`}>
      {state}
    </span>
  );
}

function formatStamp(value?: string | null): string {
  if (!value) {
    return "None";
  }

  const numeric = Number(value);

  if (Number.isFinite(numeric) && numeric > 0) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(numeric * 1000));
  }

  return value;
}

function formatLogStamp(value?: string | null): string {
  if (!value) {
    return "Unknown";
  }

  const normalized = value.replace(" ", "T").replace(",", ".");
  const date = new Date(normalized);

  if (!Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  }

  return value;
}

function formatJournalStamp(value?: string | null): string {
  if (!value) {
    return "Unknown";
  }

  const normalized = value.replace(" ", "T").replace(",", ".");
  const date = new Date(normalized);

  if (!Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  return value;
}

function formatCategory(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMoney(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}

function buildBacktestPayload(
  selectedBroker: string,
  barsValue: string,
): BacktestRequest {
  const parsedBars = Number.parseInt(barsValue, 10);
  const bars = Number.isFinite(parsedBars)
    ? Math.min(Math.max(parsedBars, 50), 10000)
    : 500;

  if (selectedBroker === "active") {
    return {
      bars,
      include_disabled: false,
    };
  }

  if (selectedBroker === "all") {
    return {
      bars,
      include_disabled: true,
    };
  }

  return {
    broker_ids: [selectedBroker],
    bars,
    include_disabled: true,
  };
}

function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "The desktop runtime returned an unknown error.";
}

function formatDailyLimits(dailyLimits: BrokerDailyLimits): string {
  if (!dailyLimits.enabled) {
    return "Off";
  }

  return `Target ${dailyLimits.target.toFixed(2)} | Loss ${Math.abs(
    dailyLimits.max_loss,
  ).toFixed(2)}`;
}

function getInitialTheme(): ThemeMode {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export default App;
