//! File access for the webview, limited to Riot config files and profiles.

use std::fs;
use std::io::{ErrorKind, Read};
use std::path::{Component, Path, PathBuf};

const CONFIG_FILE_NAMES: [&str; 3] = ["game.cfg", "PersistedSettings.json", "LeagueClientSettings.yaml"];

/// Accepts only an absolute path to one of the known config files inside a
/// folder named `Config` (the League install's config folder).
pub fn config_file(path: &str) -> Result<PathBuf, String> {
  let path = PathBuf::from(path);
  let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or_default();
  let folder = path.parent().and_then(Path::file_name).and_then(|n| n.to_str()).unwrap_or_default();

  let allowed = path.is_absolute()
    && !path.components().any(|c| matches!(c, Component::ParentDir))
    && folder.eq_ignore_ascii_case("Config")
    && CONFIG_FILE_NAMES.iter().any(|name| name.eq_ignore_ascii_case(file_name));

  if allowed {
    Ok(path)
  } else {
    Err(format!("Access to \"{}\" is not allowed", path.display()))
  }
}

/// Accepts a bare `*.json` file name and resolves it inside `dir`.
pub fn profile_file(dir: &Path, file_name: &str) -> Result<PathBuf, String> {
  let mut components = Path::new(file_name).components();
  let single_name = matches!((components.next(), components.next()), (Some(Component::Normal(_)), None));
  let allowed = single_name
    && !file_name.contains(':')
    && file_name.len() > ".json".len()
    && file_name.to_ascii_lowercase().ends_with(".json");

  if allowed {
    Ok(dir.join(file_name))
  } else {
    Err(format!("Invalid profile file name \"{file_name}\""))
  }
}

/// Reads a text file that the League client may be holding open.
pub fn read_shared(path: &Path) -> Result<String, String> {
  let mut options = fs::OpenOptions::new();
  options.read(true);
  #[cfg(windows)]
  {
    use std::os::windows::fs::OpenOptionsExt;
    // FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE
    options.share_mode(0x7);
  }

  let mut bytes = Vec::new();
  options
    .open(path)
    .and_then(|mut file| file.read_to_end(&mut bytes))
    .map_err(|e| format!("Could not read \"{}\": {e}", path.display()))?;

  let text = String::from_utf8_lossy(&bytes);
  Ok(text.strip_prefix('\u{feff}').unwrap_or(&text).to_string())
}

/// Writes through a temporary file so a crash never leaves a half-written config.
pub fn write_atomic(path: &Path, content: &str) -> Result<(), String> {
  let fail = |e: std::io::Error| format!("Could not write \"{}\": {e}", path.display());

  if let Some(parent) = path.parent() {
    fs::create_dir_all(parent).map_err(fail)?;
  }

  let mut tmp = path.as_os_str().to_owned();
  tmp.push(".tmp");
  let tmp = PathBuf::from(tmp);

  fs::write(&tmp, content).map_err(fail)?;
  if let Err(rename_error) = fs::rename(&tmp, path) {
    let _ = fs::remove_file(&tmp);
    // The client may keep the file open without delete sharing, which blocks
    // the rename but still allows writing in place.
    if rename_error.kind() != ErrorKind::PermissionDenied || is_read_only(path).unwrap_or(false) {
      return Err(fail(rename_error));
    }
    fs::write(path, content).map_err(fail)?;
  }
  Ok(())
}

pub fn is_read_only(path: &Path) -> Result<bool, String> {
  match fs::metadata(path) {
    Ok(metadata) => Ok(metadata.permissions().readonly()),
    Err(e) if e.kind() == ErrorKind::NotFound => Ok(false),
    Err(e) => Err(e.to_string()),
  }
}

#[allow(clippy::permissions_set_readonly_false)]
pub fn set_read_only(path: &Path, read_only: bool) -> Result<(), String> {
  let mut permissions = fs::metadata(path)
    .map_err(|e| format!("Could not access \"{}\": {e}", path.display()))?
    .permissions();
  permissions.set_readonly(read_only);
  fs::set_permissions(path, permissions).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
  use super::*;

  #[cfg(windows)]
  #[test]
  fn config_file_allows_only_known_files_in_config_folders() {
    assert!(config_file(r"C:\Riot Games\League of Legends\Config\game.cfg").is_ok());
    assert!(config_file(r"D:\Games\LoL\config\persistedsettings.json").is_ok());
    assert!(config_file(r"C:\Riot Games\League of Legends\Config\LeagueClientSettings.yaml").is_ok());

    assert!(config_file(r"C:\Windows\System32\drivers\etc\hosts").is_err());
    assert!(config_file(r"C:\Riot Games\League of Legends\lockfile").is_err());
    assert!(config_file(r"C:\Riot Games\League of Legends\Config\..\Config\game.cfg").is_err());
    assert!(config_file(r"C:\Users\me\Documents\game.cfg").is_err());
    assert!(config_file(r"Config\game.cfg").is_err());
  }

  #[test]
  fn profile_file_rejects_anything_but_a_bare_json_name() {
    let dir = Path::new("profiles");
    assert_eq!(profile_file(dir, "trava o chat.json").unwrap(), dir.join("trava o chat.json"));
    assert!(profile_file(dir, ".._.._evil.json").is_ok());

    assert!(profile_file(dir, "../evil.json").is_err());
    assert!(profile_file(dir, "sub/evil.json").is_err());
    assert!(profile_file(dir, "evil.json:stream").is_err());
    assert!(profile_file(dir, "evil.txt").is_err());
    assert!(profile_file(dir, ".json").is_err());
  }

  #[test]
  fn write_atomic_replaces_content_and_cleans_up() {
    let dir = std::env::temp_dir().join(format!("hrs-files-test-{}", std::process::id()));
    let path = dir.join("Config").join("game.cfg");

    write_atomic(&path, "[General]\r\nWidth=1280\r\n").unwrap();
    write_atomic(&path, "[General]\r\nWidth=1920\r\n").unwrap();

    assert_eq!(read_shared(&path).unwrap(), "[General]\r\nWidth=1920\r\n");
    assert!(!dir.join("Config").join("game.cfg.tmp").exists());

    set_read_only(&path, true).unwrap();
    assert!(is_read_only(&path).unwrap());
    assert!(write_atomic(&path, "blocked").is_err());
    set_read_only(&path, false).unwrap();

    fs::remove_dir_all(&dir).unwrap();
  }

  #[test]
  fn read_shared_strips_byte_order_mark() {
    let path = std::env::temp_dir().join(format!("hrs-bom-test-{}.json", std::process::id()));
    fs::write(&path, "\u{feff}{}").unwrap();
    assert_eq!(read_shared(&path).unwrap(), "{}");
    fs::remove_file(&path).unwrap();
  }
}
