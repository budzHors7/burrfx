use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::io::{BufRead, BufReader, Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_LOG_LINES: usize = 180;

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct BridgeValidation {
    pub valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct StrategyOption {
    pub id: String,
    pub label: String,
    pub enabled: bool,
    pub default_enabled: bool,
    pub timeframe: String,
    pub recommended_timeframes: Vec<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct BrokerDailyLimits {
    pub enabled: bool,
    pub target: f64,
    pub max_loss: f64,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct BrokerSymbol {
    pub canonical: String,
    pub mt5: String,
    pub enabled: bool,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct BrokerSummary {
    pub id: String,
    pub label: String,
    pub enabled: bool,
    pub terminal_path: String,
    pub expected_login: Option<u64>,
    pub expected_server: String,
    pub trading_profile: String,
    pub symbols: Vec<BrokerSymbol>,
    pub enabled_symbols: Vec<String>,
    pub daily_limits: BrokerDailyLimits,
    pub validation: BridgeValidation,
    pub requires_strategy_pause: bool,
    pub allowed_strategies: Vec<StrategyOption>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct BridgeStatus {
    pub server: BridgeServer,
    pub enabled_broker_count: usize,
    pub brokers: Vec<BrokerSummary>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct BotTradingSettings {
    pub active_profile: String,
    pub default_profile: String,
    pub profiles: Vec<serde_json::Value>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct BridgeServer {
    pub host: String,
    pub port: u16,
    pub local_url: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct BotSettings {
    pub status: BridgeStatus,
    pub trading: BotTradingSettings,
    pub strategies: Vec<StrategyOption>,
    pub strategy_catalog: Vec<StrategyOption>,
    pub brokers: Vec<BrokerSummary>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct DesktopLogFile {
    pub file: String,
    pub name: String,
    pub category: String,
    pub size: u64,
    pub modified_at: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct DesktopLogEntry {
    pub at: String,
    pub level: String,
    pub category: String,
    pub source: String,
    pub file: String,
    pub line_number: u64,
    pub line: String,
    pub raw: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct DesktopLogsResponse {
    pub generated_at: String,
    pub logs_root: String,
    pub files: Vec<DesktopLogFile>,
    pub entries: Vec<DesktopLogEntry>,
}

#[derive(Debug, Serialize, Clone)]
pub struct RuntimeLog {
    pub at: String,
    pub source: String,
    pub stream: String,
    pub line: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct ManagedProcessStatus {
    pub label: String,
    pub state: String,
    pub running: bool,
    pub pids: Vec<u32>,
    pub started_at: Option<String>,
    pub stopped_at: Option<String>,
    pub message: Option<String>,
    pub logs: Vec<RuntimeLog>,
}

#[derive(Debug, Serialize, Clone)]
pub struct DesktopStatus {
    pub project_root: String,
    pub generated_at: String,
    pub bridge_error: Option<String>,
    pub server_settings: Option<BridgeServer>,
    pub server: ManagedProcessStatus,
    pub trading: ManagedProcessStatus,
    pub brokers: Vec<BrokerSummary>,
}

#[derive(Debug, Serialize, Clone)]
pub struct ActionResponse {
    pub message: String,
    pub status: DesktopStatus,
}

#[derive(Debug, Serialize, Clone)]
pub struct BotSettingsSaveResponse {
    pub message: String,
    pub settings: BotSettings,
    pub status: DesktopStatus,
}

#[derive(Debug, Deserialize)]
struct BridgeSettingsSaveResponse {
    message: String,
    settings: BotSettings,
}

struct ManagedChild {
    label: String,
    child: Child,
}

struct ProcessGroup {
    label: String,
    idle_state: String,
    running_state: String,
    children: Vec<ManagedChild>,
    started_at: Option<String>,
    stopped_at: Option<String>,
    last_message: Option<String>,
    logs: Arc<Mutex<VecDeque<RuntimeLog>>>,
}

impl ProcessGroup {
    fn new(label: &str, idle_state: &str, running_state: &str) -> Self {
        Self {
            label: label.to_string(),
            idle_state: idle_state.to_string(),
            running_state: running_state.to_string(),
            children: Vec::new(),
            started_at: None,
            stopped_at: None,
            last_message: None,
            logs: Arc::new(Mutex::new(VecDeque::new())),
        }
    }

    fn is_running(&mut self) -> bool {
        self.refresh();
        !self.children.is_empty()
    }

    fn spawn(&mut self, label: String, mut command: Command) -> Result<(), String> {
        command.stdin(Stdio::null());
        command.stdout(Stdio::piped());
        command.stderr(Stdio::piped());

        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(0x08000000);
        }

        let mut child = command
            .spawn()
            .map_err(|error| format!("Failed to start {label}: {error}"))?;

        let pid = child.id();

        if let Some(stdout) = child.stdout.take() {
            spawn_log_reader(Arc::clone(&self.logs), label.clone(), "stdout", stdout);
        }

        if let Some(stderr) = child.stderr.take() {
            spawn_log_reader(Arc::clone(&self.logs), label.clone(), "stderr", stderr);
        }

        push_log(
            &self.logs,
            &self.label,
            "system",
            format!("Started {label} (pid {pid})."),
        );

        self.started_at = Some(now_stamp());
        self.stopped_at = None;
        self.last_message = Some(format!("Started {label}."));
        self.children.push(ManagedChild { label, child });

        Ok(())
    }

    fn stop(&mut self) -> String {
        self.refresh();

        if self.children.is_empty() {
            self.stopped_at = Some(now_stamp());
            self.last_message = Some(format!("{} is already stopped.", self.label));
            return self.last_message.clone().unwrap_or_default();
        }

        let count = self.children.len();

        for managed in &mut self.children {
            let pid = managed.child.id();

            match managed.child.kill() {
                Ok(()) => {
                    let _ = managed.child.wait();
                    push_log(
                        &self.logs,
                        &managed.label,
                        "system",
                        format!("Stopped {} (pid {}).", managed.label, pid),
                    );
                }
                Err(error) => {
                    push_log(
                        &self.logs,
                        &managed.label,
                        "system",
                        format!("Failed to stop {} (pid {}): {}", managed.label, pid, error),
                    );
                }
            }
        }

        self.children.clear();
        self.stopped_at = Some(now_stamp());
        self.last_message = Some(format!(
            "Stopped {} {}.",
            count,
            if count == 1 { "process" } else { "processes" }
        ));

        self.last_message.clone().unwrap_or_default()
    }

    fn refresh(&mut self) {
        let logs = Arc::clone(&self.logs);
        let mut running = Vec::new();

        for mut managed in self.children.drain(..) {
            match managed.child.try_wait() {
                Ok(Some(status)) => {
                    push_log(
                        &logs,
                        &managed.label,
                        "system",
                        format!("{} exited with status {}.", managed.label, status),
                    );
                    self.stopped_at = Some(now_stamp());
                    self.last_message = Some(format!("{} exited.", managed.label));
                }
                Ok(None) => running.push(managed),
                Err(error) => {
                    push_log(
                        &logs,
                        &managed.label,
                        "system",
                        format!("Could not inspect {}: {}", managed.label, error),
                    );
                    running.push(managed);
                }
            }
        }

        self.children = running;
    }

    fn snapshot(&mut self) -> ManagedProcessStatus {
        self.refresh();

        let running = !self.children.is_empty();
        let logs = self
            .logs
            .lock()
            .map(|items| items.iter().cloned().collect())
            .unwrap_or_default();

        ManagedProcessStatus {
            label: self.label.clone(),
            state: if running {
                self.running_state.clone()
            } else {
                self.idle_state.clone()
            },
            running,
            pids: self
                .children
                .iter()
                .map(|managed| managed.child.id())
                .collect(),
            started_at: self.started_at.clone(),
            stopped_at: self.stopped_at.clone(),
            message: self.last_message.clone(),
            logs,
        }
    }
}

pub struct RuntimeSupervisor {
    project_root: PathBuf,
    server: ProcessGroup,
    trading: ProcessGroup,
}

impl RuntimeSupervisor {
    pub fn new(project_root: PathBuf) -> Self {
        Self {
            project_root,
            server: ProcessGroup::new("Mobile API server", "stopped", "running"),
            trading: ProcessGroup::new("Local trading", "stopped", "running"),
        }
    }

    pub fn status(&mut self) -> DesktopStatus {
        self.build_status(None)
    }

    pub fn bot_settings(&self) -> Result<BotSettings, String> {
        self.load_bot_settings()
    }

    pub fn app_logs(&self) -> Result<DesktopLogsResponse, String> {
        self.load_app_logs()
    }

    pub fn trade_journal(&self) -> Result<serde_json::Value, String> {
        self.run_bridge_json_command("journal", None, "desktop journal")
    }

    pub fn run_backtest(
        &mut self,
        payload: serde_json::Value,
    ) -> Result<serde_json::Value, String> {
        if self.trading.is_running() {
            return Err("Stop local trading before running a backtest.".to_string());
        }

        self.run_bridge_json_command("backtest", Some(payload), "desktop backtest")
    }

    pub fn save_bot_settings(
        &mut self,
        payload: serde_json::Value,
    ) -> Result<BotSettingsSaveResponse, String> {
        if self.trading.is_running() {
            return Err("Stop local trading before saving bot settings.".to_string());
        }

        let response = self.save_bridge_settings(payload)?;
        let status = self.build_status(Some(response.settings.status.clone()));

        Ok(BotSettingsSaveResponse {
            message: response.message,
            settings: response.settings,
            status,
        })
    }

    pub fn start_server(&mut self) -> Result<ActionResponse, String> {
        if self.server.is_running() {
            return Ok(ActionResponse {
                message: "Mobile API server is already running.".to_string(),
                status: self.build_status(None),
            });
        }

        let mut command = self.python_command();
        command.arg("server/run_desktop.py");
        command.current_dir(&self.project_root);
        command.env("PYTHONUNBUFFERED", "1");

        self.server
            .spawn("Mobile API server".to_string(), command)?;

        Ok(ActionResponse {
            message: "Mobile API server start requested.".to_string(),
            status: self.build_status(None),
        })
    }

    pub fn stop_server(&mut self) -> ActionResponse {
        let message = self.server.stop();

        ActionResponse {
            message,
            status: self.build_status(None),
        }
    }

    pub fn start_trading(&mut self) -> Result<ActionResponse, String> {
        if self.trading.is_running() {
            return Ok(ActionResponse {
                message: "Local trading is already running.".to_string(),
                status: self.build_status(None),
            });
        }

        let bridge = self.load_bridge_status()?;
        let enabled_brokers: Vec<_> = bridge
            .brokers
            .iter()
            .filter(|broker| broker.enabled)
            .collect();

        if enabled_brokers.is_empty() {
            return Err("No active brokers are enabled in broker settings.".to_string());
        }

        let invalid = enabled_brokers
            .iter()
            .filter(|broker| !broker.validation.valid)
            .map(|broker| format!("{}: {}", broker.label, broker.validation.errors.join("; ")))
            .collect::<Vec<_>>();

        if !invalid.is_empty() {
            return Err(format!(
                "Active broker setup is incomplete: {}",
                invalid.join(" | ")
            ));
        }

        for broker in enabled_brokers {
            let mut command = self.python_command();
            command
                .arg("-m")
                .arg("trading.broker_worker")
                .arg("--broker")
                .arg(&broker.id);
            command.current_dir(&self.project_root);
            command.env("PYTHONUNBUFFERED", "1");

            if let Err(error) = self
                .trading
                .spawn(format!("{} trading worker", broker.label), command)
            {
                let _ = self.trading.stop();
                return Err(error);
            }
        }

        Ok(ActionResponse {
            message: "Local trading start requested.".to_string(),
            status: self.build_status(Some(bridge)),
        })
    }

    pub fn stop_trading(&mut self) -> ActionResponse {
        let message = self.trading.stop();

        ActionResponse {
            message,
            status: self.build_status(None),
        }
    }

    pub fn stop_all(&mut self) -> ActionResponse {
        let trading_message = self.trading.stop();
        let server_message = self.server.stop();

        ActionResponse {
            message: format!("{trading_message} {server_message}"),
            status: self.build_status(None),
        }
    }

    fn build_status(&mut self, bridge: Option<BridgeStatus>) -> DesktopStatus {
        let bridge_result = match bridge {
            Some(bridge) => Ok(bridge),
            None => self.load_bridge_status(),
        };

        let (server_settings, brokers, bridge_error) = match bridge_result {
            Ok(bridge) => (Some(bridge.server), bridge.brokers, None),
            Err(error) => (None, Vec::new(), Some(error)),
        };

        DesktopStatus {
            project_root: self.project_root.to_string_lossy().to_string(),
            generated_at: now_stamp(),
            bridge_error,
            server_settings,
            server: self.server.snapshot(),
            trading: self.trading.snapshot(),
            brokers,
        }
    }

    fn load_bridge_status(&self) -> Result<BridgeStatus, String> {
        let output = self
            .python_command()
            .args(["-m", "trading.desktop_bridge", "status"])
            .current_dir(&self.project_root)
            .output()
            .map_err(|error| format!("Failed to run desktop bridge: {error}"))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!(
                "Desktop bridge exited with {}: {}",
                output.status,
                stderr.trim()
            ));
        }

        serde_json::from_slice(&output.stdout)
            .map_err(|error| format!("Failed to parse desktop bridge output: {error}"))
    }

    fn load_bot_settings(&self) -> Result<BotSettings, String> {
        let output = self
            .python_command()
            .args(["-m", "trading.desktop_bridge", "settings"])
            .current_dir(&self.project_root)
            .output()
            .map_err(|error| format!("Failed to run desktop bridge: {error}"))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!(
                "Desktop bridge exited with {}: {}",
                output.status,
                stderr.trim()
            ));
        }

        serde_json::from_slice(&output.stdout)
            .map_err(|error| format!("Failed to parse desktop settings output: {error}"))
    }

    fn load_app_logs(&self) -> Result<DesktopLogsResponse, String> {
        let output = self
            .python_command()
            .args(["-m", "trading.desktop_bridge", "logs"])
            .current_dir(&self.project_root)
            .output()
            .map_err(|error| format!("Failed to run desktop bridge: {error}"))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!(
                "Desktop bridge exited with {}: {}",
                output.status,
                stderr.trim()
            ));
        }

        serde_json::from_slice(&output.stdout)
            .map_err(|error| format!("Failed to parse desktop log output: {error}"))
    }

    fn run_bridge_json_command(
        &self,
        command_name: &str,
        payload: Option<serde_json::Value>,
        context: &str,
    ) -> Result<serde_json::Value, String> {
        let mut command = self.python_command();
        command
            .args(["-m", "trading.desktop_bridge", command_name])
            .current_dir(&self.project_root)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        if payload.is_some() {
            command.stdin(Stdio::piped());
        }

        let mut child = command
            .spawn()
            .map_err(|error| format!("Failed to run {context}: {error}"))?;

        if let Some(payload) = payload {
            let mut stdin = child
                .stdin
                .take()
                .ok_or_else(|| format!("Failed to open {context} stdin."))?;

            stdin
                .write_all(payload.to_string().as_bytes())
                .map_err(|error| format!("Failed to write {context} payload: {error}"))?;
            drop(stdin);
        }

        let output = child
            .wait_with_output()
            .map_err(|error| format!("Failed to read {context} output: {error}"))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!(
                "Desktop bridge exited with {}: {}",
                output.status,
                stderr.trim()
            ));
        }

        serde_json::from_slice(&output.stdout)
            .map_err(|error| format!("Failed to parse {context} output: {error}"))
    }

    fn save_bridge_settings(
        &self,
        payload: serde_json::Value,
    ) -> Result<BridgeSettingsSaveResponse, String> {
        let mut command = self.python_command();
        command
            .args(["-m", "trading.desktop_bridge", "save-settings"])
            .current_dir(&self.project_root)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        let mut child = command
            .spawn()
            .map_err(|error| format!("Failed to run desktop bridge: {error}"))?;

        let mut stdin = child
            .stdin
            .take()
            .ok_or_else(|| "Failed to open desktop bridge stdin.".to_string())?;

        stdin
            .write_all(payload.to_string().as_bytes())
            .map_err(|error| format!("Failed to write desktop settings payload: {error}"))?;
        drop(stdin);

        let output = child
            .wait_with_output()
            .map_err(|error| format!("Failed to read desktop bridge output: {error}"))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!(
                "Desktop bridge exited with {}: {}",
                output.status,
                stderr.trim()
            ));
        }

        serde_json::from_slice(&output.stdout)
            .map_err(|error| format!("Failed to parse desktop settings output: {error}"))
    }

    fn python_command(&self) -> Command {
        Command::new(python_executable(&self.project_root))
    }
}

pub fn project_root_from_manifest(manifest_dir: &Path) -> PathBuf {
    manifest_dir
        .parent()
        .and_then(Path::parent)
        .map(Path::to_path_buf)
        .unwrap_or_else(|| manifest_dir.to_path_buf())
}

fn python_executable(project_root: &Path) -> PathBuf {
    let venv_python = project_root
        .join(".venv")
        .join("Scripts")
        .join("python.exe");

    if venv_python.exists() {
        return venv_python;
    }

    PathBuf::from("python")
}

fn spawn_log_reader<R>(
    logs: Arc<Mutex<VecDeque<RuntimeLog>>>,
    source: String,
    stream: &'static str,
    reader: R,
) where
    R: Read + Send + 'static,
{
    thread::spawn(move || {
        let reader = BufReader::new(reader);

        for line in reader.lines() {
            match line {
                Ok(line) if !line.trim().is_empty() => {
                    push_log(&logs, &source, stream, line);
                }
                Ok(_) => {}
                Err(error) => {
                    push_log(
                        &logs,
                        &source,
                        stream,
                        format!("Failed reading process output: {error}"),
                    );
                    break;
                }
            }
        }
    });
}

fn push_log(logs: &Arc<Mutex<VecDeque<RuntimeLog>>>, source: &str, stream: &str, line: String) {
    if let Ok(mut logs) = logs.lock() {
        logs.push_back(RuntimeLog {
            at: now_stamp(),
            source: source.to_string(),
            stream: stream.to_string(),
            line,
        });

        while logs.len() > MAX_LOG_LINES {
            logs.pop_front();
        }
    }
}

fn now_stamp() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn project_root_moves_two_levels_up_from_src_tauri() {
        let manifest = Path::new(r"C:\repo\desktop-app\src-tauri");

        assert_eq!(
            project_root_from_manifest(manifest),
            PathBuf::from(r"C:\repo")
        );
    }
}
