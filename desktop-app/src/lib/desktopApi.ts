import { invoke } from "@tauri-apps/api/core";

export type RuntimeLog = {
  at: string;
  source: string;
  stream: string;
  line: string;
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

export type BrokerSummary = {
  id: string;
  label: string;
  enabled: boolean;
  terminal_path: string;
  trading_profile: string;
  enabled_symbols: string[];
  validation: BrokerValidation;
  requires_strategy_pause: boolean;
};

export type ServerSettings = {
  host: string;
  port: number;
  local_url: string;
};

export type DesktopStatus = {
  project_root: string;
  generated_at: string;
  bridge_error: string | null;
  server_settings: ServerSettings | null;
  server: ManagedRuntime;
  trading: ManagedRuntime;
  brokers: BrokerSummary[];
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
      trading_profile: "regular_risk",
      enabled_symbols: ["EURUSDm", "GBPUSDm", "USDJPYm", "USTECm", "US30m"],
      validation: {
        valid: true,
        errors: [],
        warnings: [],
      },
      requires_strategy_pause: false,
    },
    {
      id: "deriv",
      label: "Deriv",
      enabled: false,
      terminal_path: "",
      trading_profile: "regular_risk",
      enabled_symbols: [],
      validation: {
        valid: false,
        errors: ["MT5 terminal path is empty.", "No enabled symbols configured."],
        warnings: ["Expected login is not set.", "Expected server is not set."],
      },
      requires_strategy_pause: true,
    },
  ],
};

export async function getAppStatus(): Promise<DesktopStatus> {
  if (isTauri()) {
    return invoke<DesktopStatus>("get_app_status");
  }

  await sleep(120);
  mockStatus.generated_at = nowStamp();
  return clone(mockStatus);
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

function isTauri(): boolean {
  return (
    typeof window !== "undefined"
    && window.__TAURI_INTERNALS__ !== undefined
  );
}

function nowStamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
