//! "Launch on startup" through the per-user Run registry key.

use std::io::ErrorKind;

use winreg::enums::HKEY_CURRENT_USER;
use winreg::RegKey;

const RUN_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
const VALUE_NAME: &str = "HextechRiotSettings";

pub fn set(enabled: bool) -> Result<(), String> {
  let (run, _) = RegKey::predef(HKEY_CURRENT_USER)
    .create_subkey(RUN_KEY)
    .map_err(|e| e.to_string())?;

  if enabled {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    run.set_value(VALUE_NAME, &format!("\"{}\" {}", exe.display(), crate::tray::MINIMIZED_ARG))
      .map_err(|e| e.to_string())
  } else {
    match run.delete_value(VALUE_NAME) {
      Err(e) if e.kind() != ErrorKind::NotFound => Err(e.to_string()),
      _ => Ok(()),
    }
  }
}

pub fn is_enabled() -> bool {
  RegKey::predef(HKEY_CURRENT_USER)
    .open_subkey(RUN_KEY)
    .and_then(|run| run.get_value::<String, _>(VALUE_NAME))
    .is_ok()
}
