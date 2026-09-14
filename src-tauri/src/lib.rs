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

#[tauri::command]
fn get_summoner_profile(install_root: String) -> Option<SummonerProfile> {
  let logs_dir = Path::new(&install_root).join("Logs").join("LeagueClient Logs");
  if !logs_dir.exists() {
    return None;
  }

  let mut log_files = Vec::new();
  if let Ok(entries) = fs::read_dir(logs_dir) {
    for entry in entries.flatten() {
      let path = entry.path();
      if path.is_file() {
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
          if name.ends_with("LeagueClient.log") {
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

  log_files.sort_by(|a, b| b.1.cmp(&a.1));
  if log_files.is_empty() {
    return None;
  }

  let latest_log = &log_files[0].0;
  if let Ok(content) = fs::read_to_string(latest_log) {
    let lines: Vec<&str> = content.lines().collect();
    for line in lines.into_iter().rev() {
      if line.contains("CurrentSummoner") && line.contains("\"gameName\"") {
        let game_name = extract_json_field(line, "gameName")?;
        let icon_id = extract_json_field(line, "profileIconId")
          .and_then(|s| s.parse::<i32>().ok())
          .unwrap_or(29);
        let level = extract_json_field(line, "summonerLevel")
          .and_then(|s| s.parse::<i32>().ok())
          .unwrap_or(1);
          
        return Some(SummonerProfile {
          name: game_name,
          profileIconId: icon_id,
          summonerLevel: level,
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

#[derive(serde::Serialize)]
struct IdentityItem {
  name: String,
  iconId: Option<i32>,
  description: Option<String>,
}

#[tauri::command]
fn get_identities(install_root: String) -> Result<Vec<IdentityItem>, String> {
  // Caminho padrão para skins/identidades do LoL em Windows
  let identities_dir = Path::new(&install_root).join("Resources").join("SkinPack");
  
  if !identities_dir.exists() {
    // Se SkinPack não existe, retornar items padrão de identidade
    return Ok(vec![
      IdentityItem {
        name: "Icon".to_string(),
        iconId: Some(29),
        description: None,
      },
      IdentityItem {
        name: "Border".to_string(),
        iconId: None,
        description: Some("Player border".to_string()),
      },
      IdentityItem {
        name: "Flag".to_string(),
        iconId: None,
        description: Some("Player flag".to_string()),
      },
    ]);
  }
  
  // Ler arquivos de identidade do SkinPack
  let mut identities = Vec::new();
  if let Ok(entries) = fs::read_dir(&identities_dir) {
    for entry in entries.flatten() {
      let path = entry.path();
      if path.is_file() {
        if let Some(name) = path.file_stem().and_then(|n| n.to_str()) {
          // Criar item de identidade a partir do arquivo
          identities.push(IdentityItem {
            name: name.to_string(),
            iconId: None,
            description: None,
          });
        }
      }
    }
  }
  
  Ok(identities)
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

// ═══ AUTO-UPDATE SISTEMA ═══
/// Obtém a versão alvo do arquivo de configuração centralizado
#[tauri::command]
fn get_target_version() -> Result<String, String> {
  // Tenta ler do arquivo de configuração (pode estar na pasta do app ou em local fixo)
  let config_paths = vec![
    format!("{}.txt", std::env::var("APP_NAME").unwrap_or_else(|_| "hextech_riot_settings".to_string())),
    "latest_version.txt".to_string(),
  ];
  
  for path in config_paths {
    if let Ok(content) = fs::read_to_string(&path) {
      let version = content.trim();
      return Ok(version.to_string());
    }
  }
  
  // Se não encontrar arquivo de config, retorna versão atual (0.1.0)
  Ok("0.1.0".to_string())
}

/// Verifica se há atualização disponível e baixa automaticamente
#[tauri::command]
fn check_for_update(install_root: String) -> Result<UpdateCheckResult, String> {
  // Em ambiente de produção, aqui você faria:
  // 1. Ler versão alvo do arquivo de configuração
  // 2. Comparar com versão instalada atual
  // 3. Se houver atualização disponível, baixar usando requests
    
  // Para simplificar no início, retorna resultado nulo
  // Usuário pode configurar manualmente o arquivo latest_version.txt
  
  let target_version = get_target_version()?;
  
  Ok(UpdateCheckResult {
    current_version: "0.1.0".to_string(),
    target_version,
    update_available: false,
    download_url: None,
  })
}

#[derive(serde::Serialize)]
struct UpdateCheckResult {
  current_version: String,
  target_version: String,
  update_available: bool,
  download_url: Option<String>,
}

#[tauri::command]
fn apply_update(download_path: String) -> Result<(), String> {
  // Em produção: desinstalar atual e instalar nova versão baixada
  // Para o MVP inicial, vamos apenas alertar
  if confirm_update() {
    return Err("Auto-update will be implemented with manual approval first. \n\nPlease restart the app to apply updates.".to_string());
  }
  
  Ok(())
}

fn confirm_update() -> bool {
  // Placeholder para confirmação de atualização
  false
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
      get_summoner_profile,
      get_identities,
      minimize_window,
      toggle_maximize_window,
      close_window,
      set_autostart,
      is_autostart_enabled,
      get_target_version,
      check_for_update,
      apply_update
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Background thread para verificar atualizações periodicamente (configurável)
      let app_handle = app.handle().clone();
      thread::spawn(move || {
        // Verifica atualização a cada 6 horas (21600 segundos)
        loop {
          thread::sleep(std::time::Duration::from_secs(21600));
          
          // Tenta verificar se há atualização disponível
          if let Ok(install_root) = std::env::var("TAURI_ENV_TARGET") {
            let _ = check_for_update(install_root);
          }
        }
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}