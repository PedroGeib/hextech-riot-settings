//! Backend for Hextech Riot Settings.
//!
//! The webview only gets narrowly scoped access: the three Riot config files,
//! the app's own profiles folder and a few read-only League client routes.
//! The client's lockfile credentials never leave this process.

#[cfg(windows)]
mod autostart;
mod files;
#[cfg(windows)]
mod hotkeys;
mod lcu;
mod summoner;
mod tray;

use std::collections::HashSet;
use std::path::{Path, PathBuf};

use serde::Serialize;
use sysinfo::{ProcessRefreshKind, System};

const RIOT_PROCESSES: [&str; 4] = [
  "RiotClientServices.exe",
  "LeagueClient.exe",
  "LeagueClientUx.exe",
  "League of Legends.exe",
];

/// League client routes the UI is allowed to read.
const CLIENT_READ_ROUTES: [&str; 3] = [
  "/lol-summoner/v1/current-summoner",
  "/lol-regalia/v2/current-summoner/regalia",
  "/lol-loadouts/v4/loadouts/scope/account",
];

fn home_dir() -> Result<PathBuf, String> {
  std::env::var_os("USERPROFILE")
    .or_else(|| std::env::var_os("HOME"))
    .map(PathBuf::from)
    .ok_or_else(|| "Não foi possível encontrar a pasta do usuário".to_string())
}

fn profiles_dir() -> Result<PathBuf, String> {
  Ok(home_dir()?.join(".riot-orchestrator").join("profiles"))
}

#[tauri::command]
fn get_home_dir() -> Result<String, String> {
  home_dir().map(|path| path.to_string_lossy().into_owned())
}

#[tauri::command]
fn path_exists(path: String) -> bool {
  Path::new(&path).exists()
}

#[tauri::command]
fn read_config_file(path: String) -> Result<String, String> {
  files::read_shared(&files::config_file(&path)?)
}

#[tauri::command]
fn write_config_file(path: String, content: String) -> Result<(), String> {
  files::write_atomic(&files::config_file(&path)?, &content)
}

#[tauri::command]
fn is_config_read_only(path: String) -> Result<bool, String> {
  files::is_read_only(&files::config_file(&path)?)
}

#[tauri::command]
fn set_config_read_only(path: String, read_only: bool) -> Result<(), String> {
  files::set_read_only(&files::config_file(&path)?, read_only)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProfileFile {
  file_name: String,
  content: String,
}

#[tauri::command]
fn list_profiles() -> Result<Vec<ProfileFile>, String> {
  let dir = profiles_dir()?;
  if !dir.exists() {
    return Ok(Vec::new());
  }

  let entries = std::fs::read_dir(&dir).map_err(|e| e.to_string())?;
  let mut profiles: Vec<ProfileFile> = entries
    .flatten()
    .map(|entry| entry.path())
    .filter(|path| path.is_file() && path.extension().is_some_and(|ext| ext.eq_ignore_ascii_case("json")))
    .filter_map(|path| {
      let file_name = path.file_name()?.to_str()?.to_string();
      let content = std::fs::read_to_string(&path).ok()?;
      Some(ProfileFile { file_name, content })
    })
    .collect();
  profiles.sort_by_key(|profile| profile.file_name.to_lowercase());
  Ok(profiles)
}

#[tauri::command]
fn write_profile(file_name: String, content: String) -> Result<(), String> {
  let dir = profiles_dir()?;
  files::write_atomic(&files::profile_file(&dir, &file_name)?, &content)
}

#[tauri::command]
fn delete_profile(file_name: String) -> Result<(), String> {
  let path = files::profile_file(&profiles_dir()?, &file_name)?;
  match std::fs::remove_file(&path) {
    Err(e) if e.kind() != std::io::ErrorKind::NotFound => Err(e.to_string()),
    _ => Ok(()),
  }
}

#[tauri::command]
fn get_riot_processes() -> Vec<String> {
  let mut sys = System::new();
  sys.refresh_processes_specifics(ProcessRefreshKind::new());
  let running: HashSet<String> = sys.processes().values().map(|p| p.name().to_lowercase()).collect();
  RIOT_PROCESSES
    .iter()
    .filter(|name| running.contains(&name.to_lowercase()))
    .map(|name| name.to_string())
    .collect()
}

#[tauri::command]
async fn get_summoner_profile(install_root: String) -> Result<Option<summoner::SummonerProfile>, String> {
  let root = PathBuf::from(install_root);
  if let Ok(value) = lcu::get_json(&root, CLIENT_READ_ROUTES[0]).await {
    if let Some(profile) = summoner::from_client(&value) {
      return Ok(Some(profile));
    }
  }
  tauri::async_runtime::spawn_blocking(move || summoner::from_logs(&root))
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn read_client_route(install_root: String, route: String) -> Result<serde_json::Value, String> {
  if !CLIENT_READ_ROUTES.contains(&route.as_str()) {
    return Err(format!("Rota do client não permitida: {route}"));
  }
  lcu::get_json(Path::new(&install_root), &route).await
}

#[tauri::command]
fn set_autostart(enabled: bool) -> Result<(), String> {
  #[cfg(windows)]
  return autostart::set(enabled);
  #[cfg(not(windows))]
  {
    let _ = enabled;
    Err("Iniciar com o sistema só funciona no Windows".to_string())
  }
}

#[tauri::command]
fn is_autostart_enabled() -> bool {
  #[cfg(windows)]
  return autostart::is_enabled();
  #[cfg(not(windows))]
  false
}

#[tauri::command]
fn set_global_hotkeys(enabled: bool) {
  #[cfg(windows)]
  hotkeys::set_enabled(enabled);
  #[cfg(not(windows))]
  let _ = enabled;
}

#[tauri::command]
fn set_close_to_tray(enabled: bool) {
  tray::set_close_to_tray(enabled);
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
  app.exit(0);
}

#[tauri::command]
fn minimize_window(window: tauri::Window) {
  let _ = window.minimize();
}

#[tauri::command]
fn toggle_maximize_window(window: tauri::Window) {
  match window.is_maximized() {
    Ok(true) => {
      let _ = window.unmaximize();
    }
    Ok(false) => {
      let _ = window.maximize();
    }
    Err(_) => {}
  }
}

#[tauri::command]
fn close_window(window: tauri::Window) {
  let _ = window.close();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    // Must be registered first: a second launch just brings this window back.
    .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
      tray::show_main_window(app);
    }))
    .invoke_handler(tauri::generate_handler![
      get_home_dir,
      path_exists,
      read_config_file,
      write_config_file,
      is_config_read_only,
      set_config_read_only,
      list_profiles,
      write_profile,
      delete_profile,
      get_riot_processes,
      get_summoner_profile,
      read_client_route,
      set_autostart,
      is_autostart_enabled,
      set_global_hotkeys,
      set_close_to_tray,
      quit_app,
      minimize_window,
      toggle_maximize_window,
      close_window,
    ])
    .on_window_event(tray::handle_window_event)
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      tray::create(app.handle())?;
      #[cfg(windows)]
      hotkeys::spawn(app.handle().clone());

      // The window starts hidden (tauri.conf.json) so a launch at Windows
      // startup stays in the tray instead of flashing on screen.
      if !std::env::args().any(|arg| arg == tray::MINIMIZED_ARG) {
        tray::show_main_window(app.handle());
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
