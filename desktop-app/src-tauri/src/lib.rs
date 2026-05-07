mod runtime;

use runtime::{
    prepare_runtime_root, project_root_from_manifest, ActionResponse, BotSettings,
    BotSettingsSaveResponse, DesktopLogsResponse, DesktopStatus, RuntimeSupervisor,
};
use std::sync::{Arc, Mutex};
use tauri::{path::BaseDirectory, Manager, State};

struct AppState {
    supervisor: Arc<Mutex<RuntimeSupervisor>>,
}

impl AppState {
    fn new(app: &tauri::App) -> Result<Self, String> {
        let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
        let project_root = project_root_from_manifest(manifest_dir);
        let runtime_root = app
            .path()
            .app_data_dir()
            .map_err(|error| format!("Failed to resolve app data folder: {error}"))?;

        let seed_root = app
            .path()
            .resolve("seeds", BaseDirectory::Resource)
            .ok()
            .filter(|path| path.exists())
            .unwrap_or_else(|| project_root.clone());

        prepare_runtime_root(&seed_root, &runtime_root)?;

        Ok(Self {
            supervisor: Arc::new(Mutex::new(RuntimeSupervisor::new(
                project_root,
                runtime_root,
                Some(app.handle().clone()),
            ))),
        })
    }

    fn supervisor(&self) -> Arc<Mutex<RuntimeSupervisor>> {
        Arc::clone(&self.supervisor)
    }
}

#[tauri::command]
async fn get_app_status(state: State<'_, AppState>) -> Result<DesktopStatus, String> {
    with_supervisor(state, |supervisor| Ok(supervisor.status())).await
}

#[tauri::command]
async fn get_bot_settings(state: State<'_, AppState>) -> Result<BotSettings, String> {
    with_supervisor(state, |supervisor| supervisor.bot_settings()).await
}

#[tauri::command]
async fn get_app_logs(state: State<'_, AppState>) -> Result<DesktopLogsResponse, String> {
    with_supervisor(state, |supervisor| supervisor.app_logs()).await
}

#[tauri::command]
async fn get_trade_journal(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    with_supervisor(state, |supervisor| supervisor.trade_journal()).await
}

#[tauri::command]
async fn run_backtest(
    state: State<'_, AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    with_supervisor(state, move |supervisor| supervisor.run_backtest(payload)).await
}

#[tauri::command]
async fn save_bot_settings(
    state: State<'_, AppState>,
    payload: serde_json::Value,
) -> Result<BotSettingsSaveResponse, String> {
    with_supervisor(state, move |supervisor| {
        supervisor.save_bot_settings(payload)
    })
    .await
}

#[tauri::command]
async fn start_server(state: State<'_, AppState>) -> Result<ActionResponse, String> {
    with_supervisor(state, |supervisor| supervisor.start_server()).await
}

#[tauri::command]
async fn stop_server(state: State<'_, AppState>) -> Result<ActionResponse, String> {
    with_supervisor(state, |supervisor| Ok(supervisor.stop_server())).await
}

#[tauri::command]
async fn start_local_trading(state: State<'_, AppState>) -> Result<ActionResponse, String> {
    with_supervisor(state, |supervisor| supervisor.start_trading()).await
}

#[tauri::command]
async fn stop_local_trading(state: State<'_, AppState>) -> Result<ActionResponse, String> {
    with_supervisor(state, |supervisor| Ok(supervisor.stop_trading())).await
}

#[tauri::command]
async fn stop_all(state: State<'_, AppState>) -> Result<ActionResponse, String> {
    with_supervisor(state, |supervisor| Ok(supervisor.stop_all())).await
}

async fn with_supervisor<T, F>(state: State<'_, AppState>, task: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce(&mut RuntimeSupervisor) -> Result<T, String> + Send + 'static,
{
    let supervisor = state.supervisor();

    tauri::async_runtime::spawn_blocking(move || {
        let mut supervisor = supervisor
            .lock()
            .map_err(|_| "Runtime supervisor lock was poisoned.".to_string())?;

        task(&mut supervisor)
    })
    .await
    .map_err(|error| format!("Desktop runtime task failed: {error}"))?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let state = AppState::new(app)
                .map_err(|error| std::io::Error::new(std::io::ErrorKind::Other, error))?;
            app.manage(state);
            Ok(())
        })
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
