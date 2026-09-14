//! Detects the logged-in account, from the running client or, when it is
//! closed, from the most recent client logs.

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::SystemTime;

use serde::Serialize;

use crate::files::read_shared;

const DEFAULT_ICON_ID: i64 = 29;
const DISPLAY_NAME_MARKER: &str = "Player display name update received:";
const MAX_LOGS_SCANNED: usize = 10;

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SummonerProfile {
  pub name: String,
  pub tag_line: Option<String>,
  pub profile_icon_id: i64,
  pub summoner_level: i64,
  /// True when read from the running client; false when recovered from logs.
  pub live: bool,
}

/// Builds a profile from `/lol-summoner/v1/current-summoner`.
pub fn from_client(value: &serde_json::Value) -> Option<SummonerProfile> {
  let text = |key: &str| {
    value
      .get(key)
      .and_then(|v| v.as_str())
      .map(str::trim)
      .filter(|s| !s.is_empty())
      .map(String::from)
  };
  let number = |key: &str| value.get(key).and_then(|v| v.as_i64());

  Some(SummonerProfile {
    name: text("gameName").or_else(|| text("displayName"))?,
    tag_line: text("tagLine"),
    profile_icon_id: number("profileIconId").unwrap_or(DEFAULT_ICON_ID),
    summoner_level: number("summonerLevel").unwrap_or(1),
    live: true,
  })
}

/// Scans a client log from the end for the most recent account details.
pub fn parse_log(content: &str) -> Option<SummonerProfile> {
  let mut name: Option<String> = None;
  let mut icon: Option<i64> = None;
  let mut level: Option<i64> = None;

  for line in content.lines().rev() {
    if name.is_none() {
      name = match line.find(DISPLAY_NAME_MARKER) {
        Some(idx) => {
          let rest = line[idx + DISPLAY_NAME_MARKER.len()..].trim();
          Some(rest.split('#').next().unwrap_or_default().trim().to_string())
        }
        None => ["gameName", "displayName", "summonerName"]
          .iter()
          .find_map(|field| json_field(line, field)),
      }
      .filter(|n| !n.is_empty());
    }
    icon = icon.or_else(|| json_field(line, "profileIconId").and_then(|v| v.parse().ok()));
    level = level.or_else(|| json_field(line, "summonerLevel").and_then(|v| v.parse().ok()));

    if name.is_some() && icon.is_some() && level.is_some() {
      break;
    }
  }

  name.map(|name| SummonerProfile {
    name,
    tag_line: None,
    profile_icon_id: icon.unwrap_or(DEFAULT_ICON_ID),
    summoner_level: level.unwrap_or(1),
    live: false,
  })
}

/// Extracts `"field": "value"` or `"field": 123` from a log line.
fn json_field(line: &str, field: &str) -> Option<String> {
  let target = format!("\"{field}\"");
  let rest = &line[line.find(&target)? + target.len()..];
  let value = rest[rest.find(':')? + 1..].trim_start();

  if let Some(quoted) = value.strip_prefix('"') {
    return Some(quoted[..quoted.find('"')?].to_string());
  }
  let digits: String = value.chars().take_while(char::is_ascii_digit).collect();
  (!digits.is_empty()).then_some(digits)
}

fn log_dirs(install_root: &Path) -> Vec<PathBuf> {
  let mut dirs = vec![install_root.join("Logs").join("LeagueClient Logs"), install_root.join("Logs")];
  if let Some(profile) = std::env::var_os("USERPROFILE") {
    let riot = PathBuf::from(profile).join("AppData").join("Local").join("Riot Games");
    dirs.push(riot.join("Riot Client").join("Logs").join("Riot Client Logs"));
    dirs.push(riot.join("LeagueClient").join("Logs").join("LeagueClient Logs"));
  }
  dirs
}

fn newest_logs(install_root: &Path) -> Vec<(PathBuf, SystemTime)> {
  let mut logs: Vec<(PathBuf, SystemTime)> = log_dirs(install_root)
    .into_iter()
    .filter_map(|dir| fs::read_dir(dir).ok())
    .flat_map(|entries| entries.flatten())
    .filter_map(|entry| {
      let path = entry.path();
      let name = path.file_name()?.to_str()?;
      let is_log = name.ends_with(".log") || name.contains("LeagueClient") || name.contains("RiotClient");
      let metadata = entry.metadata().ok()?;
      (is_log && metadata.is_file()).then_some((path, metadata.modified().ok()?))
    })
    .collect();
  logs.sort_by_key(|(_, modified)| std::cmp::Reverse(*modified));
  logs.truncate(MAX_LOGS_SCANNED);
  logs
}

/// Logs can be several megabytes and the UI polls often, so parse results are
/// cached per file until the file changes.
pub fn from_logs(install_root: &Path) -> Option<SummonerProfile> {
  type Cache = HashMap<PathBuf, (SystemTime, Option<SummonerProfile>)>;
  static CACHE: OnceLock<Mutex<Cache>> = OnceLock::new();
  let mut cache = CACHE.get_or_init(Default::default).lock().unwrap_or_else(|e| e.into_inner());

  newest_logs(install_root).into_iter().find_map(|(path, modified)| {
    if let Some((cached_at, profile)) = cache.get(&path) {
      if *cached_at == modified {
        return profile.clone();
      }
    }
    let profile = read_shared(&path).ok().and_then(|content| parse_log(&content));
    cache.insert(path, (modified, profile.clone()));
    profile
  })
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn reads_riot_id_from_client_response() {
    let value = serde_json::json!({
      "gameName": "AuSol do Prata", "tagLine": "BR1", "displayName": "old",
      "profileIconId": 1116, "summonerLevel": 48
    });
    let profile = from_client(&value).unwrap();
    assert_eq!(profile.name, "AuSol do Prata");
    assert_eq!(profile.tag_line.as_deref(), Some("BR1"));
    assert_eq!((profile.profile_icon_id, profile.summoner_level, profile.live), (1116, 48, true));
  }

  #[test]
  fn client_response_without_name_is_ignored() {
    assert_eq!(from_client(&serde_json::json!({ "gameName": " ", "profileIconId": 1 })), None);
  }

  #[test]
  fn parses_most_recent_account_from_log() {
    let log = [
      r#"000001 Player display name update received: OldName#BR1"#,
      r#"000002 {"profileIconId": 29, "summonerLevel": 10}"#,
      r#"000003 Player display name update received: NewName#BR1"#,
      r#"000004 {"profileIconId": 6923, "summonerLevel": 682}"#,
    ]
    .join("\n");
    let profile = parse_log(&log).unwrap();
    assert_eq!(profile.name, "NewName");
    assert_eq!((profile.profile_icon_id, profile.summoner_level, profile.live), (6923, 682, false));
  }

  #[test]
  fn log_without_account_yields_nothing() {
    assert_eq!(parse_log("nothing to see\n{\"profileIconId\": 1}"), None);
  }

  #[test]
  fn json_field_handles_strings_and_numbers() {
    assert_eq!(json_field(r#"{"gameName" : "Faker"}"#, "gameName").as_deref(), Some("Faker"));
    assert_eq!(json_field(r#"{"summonerLevel":123,"x":1}"#, "summonerLevel").as_deref(), Some("123"));
    assert_eq!(json_field(r#"{"summonerLevel":null}"#, "summonerLevel"), None);
    assert_eq!(json_field(r#"{"gameName": "unterminated}"#, "gameName"), None);
  }
}
