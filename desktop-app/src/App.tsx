import { useEffect, useMemo, useState } from "react";
import "./App.css";
import {
  BrokerSummary,
  DesktopCommand,
  DesktopStatus,
  ManagedRuntime,
  RuntimeLog,
  getAppStatus,
  runDesktopCommand,
} from "./lib/desktopApi";

type Notice = {
  tone: "info" | "error";
  text: string;
};

const POLL_INTERVAL_MS = 3000;

function App() {
  const [status, setStatus] = useState<DesktopStatus | null>(null);
  const [pending, setPending] = useState<DesktopCommand | "refresh" | null>(
    null,
  );
  const [notice, setNotice] = useState<Notice | null>(null);

  const activeBrokers = useMemo(
    () => status?.brokers.filter((broker) => broker.enabled) ?? [],
    [status],
  );

  const logs = useMemo(() => {
    if (!status) {
      return [];
    }

    return [...status.trading.logs, ...status.server.logs]
      .sort((left, right) => Number(right.at) - Number(left.at))
      .slice(0, 80);
  }, [status]);

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

  async function refresh() {
    setPending("refresh");

    try {
      setStatus(await getAppStatus());
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
          <div className="brand-mark">B</div>
          <div>
            <p className="eyebrow">BurrFx Desktop</p>
            <h1>Trading Control</h1>
          </div>
        </div>

        <div className="top-actions">
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

        <section className="panel log-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Process Output</p>
              <h2>Runtime Log</h2>
            </div>
            <span className="metric">{logs.length} lines</span>
          </div>
          <LogList logs={logs} />
        </section>
      </section>
    </main>
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

function LogList({ logs }: { logs: RuntimeLog[] }) {
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

function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "The desktop runtime returned an unknown error.";
}

export default App;
