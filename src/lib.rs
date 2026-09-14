use std::fs;
use std::path::Path;
use std::thread;
use tauri::Emitter;

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
  fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
  if let Some(parent) = Path::new(&path).parent() {
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
  }
  fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn file_exists(path: String) -> bool {
  Path::new(&path).exists()
}

#[tauri::command]
fn get_home_dir() -> Result<String, String> {
  match std::env::var("USERPROFILE") {
    Ok(path) => Ok(path),
    Err(_) => std::env::var("HOME").map_err(|e| e.to_string()),
  }
}

#[tauri::command]
fn is_read_only(path: String) -> bool {
  if let Ok(metadata) = fs::metadata(&path) {
    metadata.permissions().readonly()
  } else {
    false
  }
}

#[tauri::command]
fn set_read_only(path: String, read_only: bool) -> Result<(), String> {
  let path_ref = Path::new(&path);
  if !path_ref.exists() {
    return Err("File does not exist".to_string());
  }
  let metadata = fs::metadata(path_ref).map_err(|e| e.to_string())?;
  let mut permissions = metadata.permissions();
  permissions.set_readonly(read_only);
  fs::set_permissions(path_ref, permissions).map_err(|e| e.to_string())
}

use sysinfo::System;

#[tauri::command]
fn is_process_running(name: String) -> bool {
  let mut sys = System::new();
  sys.refresh_processes();
  let name_lower = name.to_lowercase();
  for process in sys.processes().values() {
    if process.name().to_lowercase().contains(&name_lower) {
      return true;
    }
  }
  false
}

#[tauri::command]
fn get_running_processes(target_names: Vec<String>) -> Vec<String> {
  let mut sys = System::new();
  sys.refresh_processes();
  let mut running = Vec::new();
  for name in target_names {
    let name_lower = name.to_lowercase();
    for process in sys.processes().values() {
      if process.name().to_lowercase().contains(&name_lower) {
        running.push(name.clone());
        break;
      }
    }
  }
  running
}

#[tauri::command]
fn list_profiles(profiles_dir: String) -> Result<Vec<String>, String> {
  let path = Path::new(&profiles_dir);
  if !path.exists() {
    return Ok(Vec::new());
  }
  let mut result = Vec::new();
  let entries = fs::read_dir(path).map_err(|e| e.to_string())?;
  for entry in entries {
    if let Ok(entry) = entry {
      let path = entry.path();
      if path.is_file() {
        if let Some(ext) = path.extension() {
          if ext == "json" {
            if let Some(file_name) = path.file_stem() {
              if let Some(name_str) = file_name.to_str() {
                result.push(name_str.to_string());
              }
            }
          }
        }
      }
    }
  }
  Ok(result)
}

#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
  let path_ref = Path::new(&path);
  if path_ref.exists() {
    fs::remove_file(path_ref).map_err(|e| e.to_string())?;
  }
  Ok(())
}

#[derive(serde::Serialize)]
struct SummonerProfile {
  name: String,
  profileIconId: i32,
  summonerLevel: i32,
}

fn read_file_safe(path: &Path) -> Option<String> {
  #[cfg(target_os = "windows")]
  {
    use std::os::windows::fs::OpenOptionsExt;
    use std::fs::OpenOptions;
    use std::io::Read;
    if let Ok(mut f) = OpenOptions::new().read(true).share_mode(7).open(path) {
      let mut s = String::new();
      if f.read_to_string(&mut s).is_ok() {
        return Some(s);
      }
    }
  }
  fs::read_to_string(path).ok()
}

#[tauri::command]
fn get_summoner_profile(install_root: String) -> Option<SummonerProfile> {
  let mut candidate_dirs = vec![
    Path::new(&install_root).join("Logs").join("LeagueClient Logs"),
    Path::new(&install_root).join("Logs"),
  ];

  if let Ok(userprofile) = std::env::var("USERPROFILE") {
    candidate_dirs.push(
      Path::new(&userprofile)
        .join("AppData")
        .join("Local")
        .join("Riot Games")
        .join("Riot Client")
        .join("Logs")
        .join("Riot Client Logs")
    );
    candidate_dirs.push(
      Path::new(&userprofile)
        .join("AppData")
        .join("Local")
        .join("Riot Games")
        .join("LeagueClient")
        .join("Logs")
        .join("LeagueClient Logs")
    );
  }

  let mut log_files = Vec::new();
  for dir in candidate_dirs {
    if dir.exists() {
      if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
          let path = entry.path();
          if path.is_file() {
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
              if name.ends_with(".log") || name.contains("LeagueClient") || name.contains("RiotClient") {
                if let Ok(metadata) = fs::metadata(&path) {
                  if let Ok(modified) = metadata.modified() {
                    log_files.push((path, modified));
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  log_files.sort_by(|a, b| b.1.cmp(&a.1));
  if log_files.is_empty() {
    return None;
  }

  for (log_path, _) in &log_files {
    if let Some(content) = read_file_safe(log_path) {
      let lines: Vec<&str> = content.lines().collect();
      let mut found_name: Option<String> = None;
      let mut found_icon_id: Option<i32> = None;
      let mut found_level: Option<i32> = None;

      for line in lines.into_iter().rev() {
        if found_name.is_none() {
          if line.contains("Player display name update received:") {
            if let Some(idx) = line.find("Player display name update received:") {
              let rest = line[idx + "Player display name update received:".len()..].trim();
              let name_part = if let Some(hash_idx) = rest.find('#') {
                &rest[..hash_idx]
              } else {
                rest
              };
              let name = name_part.trim().to_string();
              if !name.is_empty() {
                found_name = Some(name);
              }
            }
          } else if line.contains("CurrentSummoner") || line.contains("current-summoner") || line.contains("displayName") || line.contains("gameName") {
            if let Some(name) = extract_json_field(line, "gameName")
              .or_else(|| extract_json_field(line, "displayName"))
              .or_else(|| extract_json_field(line, "summonerName"))
            {
              if !name.is_empty() {
                found_name = Some(name);
              }
            }
          }
        }

        if found_icon_id.is_none() {
          if let Some(icon_str) = extract_json_field(line, "profileIconId") {
            if let Ok(icon_id) = icon_str.parse::<i32>() {
              found_icon_id = Some(icon_id);
            }
          }
        }

        if found_level.is_none() {
          if let Some(level_str) = extract_json_field(line, "summonerLevel") {
            if let Ok(level) = level_str.parse::<i32>() {
              found_level = Some(level);
            }
          }
        }

        if found_name.is_some() && found_icon_id.is_some() && found_level.is_some() {
          break;
        }
      }

      if let Some(name) = found_name {
        return Some(SummonerProfile {
          name,
          profileIconId: found_icon_id.unwrap_or(29),
          summonerLevel: found_level.unwrap_or(1),
        });
      }
    }
  }

  None
}

fn extract_json_field(line: &str, field: &str) -> Option<String> {
  let target = format!("\"{}\"", field);
  let idx = line.find(&target)?;
  let rest = &line[idx + target.len()..];
  
  let colon_idx = rest.find(':')?;
  let value_part = rest[colon_idx + 1..].trim();
  
  if value_part.starts_with('"') {
    let end_quote = value_part[1..].find('"')?;
    Some(value_part[1..end_quote + 1].to_string())
  } else {
    let mut num_str = String::new();
    for c in value_part.chars() {
      if c.is_ascii_digit() {
        num_str.push(c);
      } else {
        break;
      }
    }
    if num_str.is_empty() { None } else { Some(num_str) }
  }
}

#[tauri::command]
fn set_autostart(enabled: bool) -> Result<(), String> {
  let current_exe = std::env::current_exe()
    .map_err(|e| e.to_string())?;
  let exe_path = current_exe.to_str()
    .ok_or_else(|| "Invalid executable path".to_string())?;

  let status = if enabled {
    std::process::Command::new("reg")
      .args(&[
        "add",
        "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
        "/v",
        "HextechRiotSettings",
        "/t",
        "REG_SZ",
        "/d",
        &format!("\"{}\"", exe_path),
        "/f"
      ])
      .status()
  } else {
    std::process::Command::new("reg")
      .args(&[
        "delete",
        "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
        "/v",
        "HextechRiotSettings",
        "/f"
      ])
      .status()
  };

  match status {
    Ok(s) if s.success() => Ok(()),
    Ok(_) => Err("Registry command returned non-zero exit code".to_string()),
    Err(e) => Err(e.to_string())
  }
}

#[tauri::command]
fn is_autostart_enabled() -> bool {
  let output = std::process::Command::new("reg")
    .args(&[
      "query",
      "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
      "/v",
      "HextechRiotSettings"
    ])
    .output();

  match output {
    Ok(out) => out.status.success(),
    Err(_) => false
  }
}

#[tauri::command]
fn minimize_window(window: tauri::Window) {
  let _ = window.minimize();
}

#[tauri::command]
fn toggle_maximize_window(window: tauri::Window) {
  if let Ok(maximized) = window.is_maximized() {
    if maximized {
      let _ = window.unmaximize();
    } else {
      let _ = window.maximize();
    }
  }
}

#[tauri::command]
fn close_window(window: tauri::Window) {
  let _ = window.close();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      read_file,
      write_file,
      file_exists,
      get_home_dir,
      is_read_only,
      set_read_only,
      is_process_running,
      get_running_processes,
      list_profiles,
      delete_file,
      minimize_window,
      toggle_maximize_window,
      close_window,
      get_summoner_profile,
      set_autostart,
      is_autostart_enabled
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Global hotkey background thread
      let app_handle = app.handle().clone();
      thread::spawn(move || {
        unsafe {
          // Register Hotkeys
          let res1 = windows_sys::Win32::UI::Input::KeyboardAndMouse::RegisterHotKey(
            0,
            1, // ID 1
            windows_sys::Win32::UI::Input::KeyboardAndMouse::MOD_CONTROL | windows_sys::Win32::UI::Input::KeyboardAndMouse::MOD_ALT,
            0x31, // '1' key
          );
          let res2 = windows_sys::Win32::UI::Input::KeyboardAndMouse::RegisterHotKey(
            0,
            2, // ID 2
            windows_sys::Win32::UI::Input::KeyboardAndMouse::MOD_CONTROL | windows_sys::Win32::UI::Input::KeyboardAndMouse::MOD_ALT,
            0x32, // '2' key
          );

          if res1 != 0 && res2 != 0 {
            log::info!("Global hotkeys Ctrl+Alt+1 and Ctrl+Alt+2 registered successfully!");
          }

          let mut msg: windows_sys::Win32::UI::WindowsAndMessaging::MSG = std::mem::zeroed();
          // Message loop to process keypress events
          while windows_sys::Win32::UI::WindowsAndMessaging::GetMessageW(&mut msg, 0, 0, 0) != 0 {
            if msg.message == windows_sys::Win32::UI::WindowsAndMessaging::WM_HOTKEY {
              let id = msg.wParam as i32;
              let _ = app_handle.emit("global-hotkey-triggered", id);
            }
          }
        }
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
