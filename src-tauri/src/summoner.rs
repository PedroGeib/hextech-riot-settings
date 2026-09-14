//! Detects the logged-in account, from the running client or, when it is
//! closed, from the most recent client logs.

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::SystemTime;

use serde::Serialize;

use crate::files::read_shared;

const DISPLAY_NAME_MARKER: &str = "Player display name update received:";
const MAX_LOGS_SCANNED: usize = 10;

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SummonerProfile {
  pub name: String,
  pub tag_line: Option<String>,
  /// Only known when read from the running client.
  pub profile_icon_id: Option<i64>,
  /// Only known when read from the running client.
  pub summoner_level: Option<i64>,
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
    profile_icon_id: number("profileIconId"),
    summoner_level: number("summonerLevel"),
    live: true,
  })
}

/// Finds the most recent account name in a client log. Icon and level are not
/// read from logs, because they also contain other players' data.
pub fn parse_log(content: &str) -> Option<SummonerProfile> {
  let from_marker = |line: &str| {
    let idx = line.find(DISPLAY_NAME_MARKER)?;
    let rest = line[idx + DISPLAY_NAME_MARKER.len()..].trim();
    Some(rest.split('#').next().unwrap_or_default().trim().to_string())
  };
  let from_json = |line: &str| {
    ["gameName", "displayName", "summonerName"]
      .iter()
      .find_map(|field| json_field(line, field))
  };

  // The display-name marker is specific to the local player, so it wins over
  // generic JSON fields anywhere in the log.
  let name = content
    .lines()
    .rev()
    .find_map(|line| from_marker(line).filter(|n| !n.is_empty()))
    .or_else(|| content.lines().rev().find_map(|line| from_json(line).filter(|n| !n.is_empty())))?;

  Some(SummonerProfile {
    name,
    tag_line: None,
    profile_icon_id: None,
    summoner_level: None,
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
    assert_eq!((profile.profile_icon_id, profile.summoner_level, profile.live), (Some(1116), Some(48), true));
  }

  #[test]
  fn client_response_without_name_is_ignored() {
    assert_eq!(from_client(&serde_json::json!({ "gameName": " ", "profileIconId": 1 })), None);
  }

  #[test]
  fn takes_only_the_most_recent_name_from_logs() {
    let log = [
      r#"000001 Player display name update received: OldName#BR1"#,
      r#"000002 {"gameName": "SomeoneElse", "summonerLevel": 1}"#,
      r#"000003 Player display name update received: NewName#BR1"#,
      r#"000004 {"gameName": "Teammate", "profileIconId": 29, "summonerLevel": 1}"#,
    ]
    .join("\n");
    let profile = parse_log(&log).unwrap();
    assert_eq!(profile.name, "NewName");
    assert_eq!((profile.profile_icon_id, profile.summoner_level, profile.live), (None, None, false));
  }

  #[test]
  fn falls_back_to_json_names_without_the_marker() {
    let profile = parse_log(r#"{"gameName": "OnlyName"}"#).unwrap();
    assert_eq!(profile.name, "OnlyName");
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
