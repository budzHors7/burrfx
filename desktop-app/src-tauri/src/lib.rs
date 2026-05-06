mod runtime;

use runtime::{
    project_root_from_manifest, ActionResponse, BotSettings, BotSettingsSaveResponse,
    DesktopLogsResponse, DesktopStatus, RuntimeSupervisor,
};
use std::sync::Mutex;
use tauri::State;

struct AppState {
    supervisor: Mutex<RuntimeSupervisor>,
}

impl AppState {
    fn new() -> Self {
        let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));

        Self {
            supervisor: Mutex::new(RuntimeSupervisor::new(project_root_from_manifest(
                manifest_dir,
            ))),
        }
    }
}

#[tauri::command]
fn get_app_status(state: State<'_, AppState>) -> Result<DesktopStatus, String> {
    let mut supervisor = state
        .supervisor
        .lock()
        .map_err(|_| "Runtime supervisor lock was poisoned.".to_string())?;

    Ok(supervisor.status())
}

#[tauri::command]
fn get_bot_settings(state: State<'_, AppState>) -> Result<BotSettings, String> {
    let supervisor = state
        .supervisor
        .lock()
        .map_err(|_| "Runtime supervisor lock was poisoned.".to_string())?;

    supervisor.bot_settings()
}

#[tauri::command]
fn get_app_logs(state: State<'_, AppState>) -> Result<DesktopLogsResponse, String> {
    let supervisor = state
        .supervisor
        .lock()
        .map_err(|_| "Runtime supervisor lock was poisoned.".to_string())?;

    supervisor.app_logs()
}

#[tauri::command]
fn get_trade_journal(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let supervisor = state
        .supervisor
        .lock()
        .map_err(|_| "Runtime supervisor lock was poisoned.".to_string())?;

    supervisor.trade_journal()
}

#[tauri::command]
fn run_backtest(
    state: State<'_, AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let mut supervisor = state
        .supervisor
        .lock()
        .map_err(|_| "Runtime supervisor lock was poisoned.".to_string())?;

    supervisor.run_backtest(payload)
}

#[tauri::command]
fn save_bot_settings(
    state: State<'_, AppState>,
    payload: serde_json::Value,
) -> Result<BotSettingsSaveResponse, String> {
    let mut supervisor = state
        .supervisor
        .lock()
        .map_err(|_| "Runtime supervisor lock was poisoned.".to_string())?;

    supervisor.save_bot_settings(payload)
}

#[tauri::command]
fn start_server(state: State<'_, AppState>) -> Result<ActionResponse, String> {
    let mut supervisor = state
        .supervisor
        .lock()
        .map_err(|_| "Runtime supervisor lock was poisoned.".to_string())?;

    supervisor.start_server()
}

#[tauri::command]
fn stop_server(state: State<'_, AppState>) -> Result<ActionResponse, String> {
    let mut supervisor = state
        .supervisor
        .lock()
        .map_err(|_| "Runtime supervisor lock was poisoned.".to_string())?;

    Ok(supervisor.stop_server())
}

#[tauri::command]
fn start_local_trading(state: State<'_, AppState>) -> Result<ActionResponse, String> {
    let mut supervisor = state
        .supervisor
        .lock()
        .map_err(|_| "Runtime supervisor lock was poisoned.".to_string())?;

    supervisor.start_trading()
}

#[tauri::command]
fn stop_local_trading(state: State<'_, AppState>) -> Result<ActionResponse, String> {
    let mut supervisor = state
        .supervisor
        .lock()
        .map_err(|_| "Runtime supervisor lock was poisoned.".to_string())?;

    Ok(supervisor.stop_trading())
}

#[tauri::command]
fn stop_all(state: State<'_, AppState>) -> Result<ActionResponse, String> {
    let mut supervisor = state
        .supervisor
        .lock()
        .map_err(|_| "Runtime supervisor lock was poisoned.".to_string())?;

    Ok(supervisor.stop_all())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            get_app_status,
            get_bot_settings,
            get_app_logs,
            get_trade_journal,
            run_backtest,
            save_bot_settings,
            start_server,
            stop_server,
            start_local_trading,
            stop_local_trading,
            stop_all
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
