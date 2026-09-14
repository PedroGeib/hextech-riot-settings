//! Read-only access to the League client's local API (LCU).

use std::path::Path;
use std::sync::OnceLock;
use std::time::Duration;

use crate::files::read_shared;

#[derive(Debug, PartialEq, Eq)]
pub struct Credentials {
  pub port: u16,
  pub password: String,
}

/// The lockfile in the install folder holds `name:pid:port:password:protocol`
/// while the client is running.
pub fn parse_lockfile(content: &str) -> Option<Credentials> {
  let mut parts = content.trim().split(':');
  let port = parts.nth(2)?.parse().ok()?;
  let password = parts.next().filter(|p| !p.is_empty())?.to_string();
  Some(Credentials { port, password })
}

fn http_client() -> Result<&'static reqwest::Client, String> {
  static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
  if let Some(client) = CLIENT.get() {
    return Ok(client);
  }
  // The API only listens on 127.0.0.1 and uses a self-signed certificate.
  let client = reqwest::Client::builder()
    .danger_accept_invalid_certs(true)
    .danger_accept_invalid_hostnames(true)
    .timeout(Duration::from_secs(3))
    .build()
    .map_err(|e| e.to_string())?;
  Ok(CLIENT.get_or_init(|| client))
}

pub async fn get_json(install_root: &Path, route: &str) -> Result<serde_json::Value, String> {
  let credentials = read_shared(&install_root.join("lockfile"))
    .ok()
    .and_then(|content| parse_lockfile(&content))
    .ok_or_else(|| "League client is not running".to_string())?;

  let response = http_client()?
    .get(format!("https://127.0.0.1:{}{route}", credentials.port))
    .basic_auth("riot", Some(&credentials.password))
    .header(reqwest::header::ACCEPT, "application/json")
    .send()
    .await
    .map_err(|e| format!("Could not reach the League client: {e}"))?;

  if !response.status().is_success() {
    return Err(format!("League client answered {} for {route}", response.status()));
  }
  response.json().await.map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn parses_lockfile() {
    assert_eq!(
      parse_lockfile("LeagueClient:12345:54321:s3cr3t-Token:https\n"),
      Some(Credentials { port: 54321, password: "s3cr3t-Token".to_string() })
    );
  }

  #[test]
  fn rejects_malformed_lockfile() {
    assert_eq!(parse_lockfile(""), None);
    assert_eq!(parse_lockfile("LeagueClient:12345:notaport:pw:https"), None);
    assert_eq!(parse_lockfile("LeagueClient:12345:54321::https"), None);
    assert_eq!(parse_lockfile("LeagueClient:12345:54321"), None);
  }
}
