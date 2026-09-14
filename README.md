# Hextech Riot Settings

A Windows desktop app for managing **League of Legends** and **Teamfight Tactics** settings: edit every option, save and switch profiles per account, and keep automatic backups so a bad change or a cloud sync never costs you your setup.

[![Latest release](https://img.shields.io/github/v/release/PedroGeib/hextech-riot-settings)](https://github.com/PedroGeib/hextech-riot-settings/releases/latest)
![Platform](https://img.shields.io/badge/platform-Windows-0078d4)
![Built with Tauri](https://img.shields.io/badge/built%20with-Tauri%202-24c8db)

## Download

Get the latest installer from the [Releases page](https://github.com/PedroGeib/hextech-riot-settings/releases/latest):

- **`HextechRiotSettings_<version>_x64-setup.exe`**: recommended installer
- **`HextechRiotSettings_<version>_x64_en-US.msi`**: MSI package

The installer is not code-signed, so Windows SmartScreen may warn you the first time. Click **More info → Run anyway**.

## Features

- **League of Legends and TFT settings**: resolution, window mode, audio and HUD, plus every advanced option in `game.cfg` and `PersistedSettings.json`, with search.
- **Keymapper**: see what a key does and bind it to another action.
- **Profiles**: save your current settings, then apply, edit, compare or restore them. Profile cards show the account's icon, crest and banner.
- **Auto profile switcher**: link a profile to an account and it's applied whenever that account logs in to the client.
- **Quick slots and global hotkeys**: apply Slot 1 or 2 with `Ctrl+Alt+1` / `Ctrl+Alt+2`, or from the tray menu.
- **Automatic backups**: a snapshot is taken before every change (the last 5 are kept) and can be restored in one click.
- **Cloud sync lock**: make `PersistedSettings.json` read-only so Riot's cloud sync can't overwrite it.
- **Riot Client settings**: change the client region and language.
- **All Configs**: view and edit any config file as a form or as raw text.
- **Optimize FPS**: one click lowers the most expensive graphics options.
- Regional color themes, launch on Windows startup (starts in the tray), and a single running instance.

## How it works

The app reads and writes the files in your League installation's `Config` folder:

| File | Contains |
| --- | --- |
| `game.cfg` | In-game video, audio and interface settings |
| `PersistedSettings.json` | Keybindings and settings synced with Riot's servers |
| `LeagueClientSettings.yaml` | Riot Client region and language |

- The install folder is detected automatically. If yours is elsewhere, set it in **App Settings**.
- Writes are blocked while a match is running, because the game overwrites its settings when it exits.
- Files keep their original formatting (line endings, indentation and key order).
- The logged-in account is read from the League client's local API. It's only used to show the account and to link profiles.

### Where your data is stored

Everything stays on your PC:

- **Profiles**: `%USERPROFILE%\.riot-orchestrator\profiles`
- **App preferences, account links and backups**: the app's local storage under `%LOCALAPPDATA%`

## Building from source

Requirements:

- Windows 10 or 11
- [Node.js](https://nodejs.org/) 18 or newer
- [Rust](https://www.rust-lang.org/tools/install) 1.77.2 or newer
- The [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for Windows (Microsoft C++ Build Tools and WebView2)

```bash
git clone https://github.com/PedroGeib/hextech-riot-settings.git
```

```bash
cd hextech-riot-settings
```

```bash
npm install
```

Run in development mode:

```bash
npm run dev
```

Build the release executable and installers:

```bash
npm run build
```

The output goes to `src-tauri\target\release\` (the `.exe`) and `src-tauri\target\release\bundle\` (the NSIS and MSI installers). On Windows you can also double-click `app builder.bat`, which checks the requirements and runs the build for you.

### Tests

```bash
npm test
```

```bash
npm run test:rust
```

## Project structure

```text
renderer/            Frontend (vanilla ES modules, no bundler)
  app.js             Shell: router, toasts, modals, status polling, automation
  tauri-bridge.js    window.api: parsing, merging and saving config files
  lib/               Pure helpers (INI, JSON, merge, settings model), unit tested
  views/             Pages: dashboard, LoL, TFT, client, profiles, all configs, app settings
  styles/            Design tokens and components
src-tauri/           Rust backend (Tauri 2)
  src/lib.rs         Commands exposed to the frontend
  src/files.rs       Scoped file access and atomic writes
  src/lcu.rs         Read-only access to the League client's local API
  src/summoner.rs    Active account detection
  src/hotkeys.rs     Global hotkeys
  src/tray.rs        Tray icon and menu
  src/autostart.rs   Launch on Windows startup
tests/               Frontend unit tests (node:test)
```

## License

MIT

## Disclaimer

Hextech Riot Settings isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, League of Legends and Teamfight Tactics are trademarks or registered trademarks of Riot Games, Inc.
