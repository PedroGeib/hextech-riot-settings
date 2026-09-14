//! System tray icon. Closing the window hides it instead of quitting, so
//! global hotkeys, auto profile switching and backups keep working.

use std::sync::atomic::{AtomicBool, Ordering};

use tauri::menu::{IsMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, Window, WindowEvent, Wry};

/// Launch argument used by "Launch on startup" to start hidden in the tray.
pub const MINIMIZED_ARG: &str = "--minimized";

static CLOSE_TO_TRAY: AtomicBool = AtomicBool::new(true);

pub fn set_close_to_tray(enabled: bool) {
  CLOSE_TO_TRAY.store(enabled, Ordering::SeqCst);
}

pub fn show_main_window(app: &AppHandle) {
  if let Some(window) = app.get_webview_window("main") {
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
  }
}

pub fn create(app: &AppHandle) -> tauri::Result<()> {
  let open = MenuItem::with_id(app, "open", "Abrir Hextech Riot Settings", true, None::<&str>)?;
  let slot_1 = MenuItem::with_id(app, "slot-1", "Aplicar Slot 1", true, None::<&str>)?;
  let slot_2 = MenuItem::with_id(app, "slot-2", "Aplicar Slot 2", true, None::<&str>)?;
  let quit = MenuItem::with_id(app, "quit", "Sair", true, None::<&str>)?;
  let separator_1 = PredefinedMenuItem::separator(app)?;
  let separator_2 = PredefinedMenuItem::separator(app)?;
  let items: [&dyn IsMenuItem<Wry>; 6] = [&open, &separator_1, &slot_1, &slot_2, &separator_2, &quit];
  let menu = Menu::with_items(app, &items)?;

  let mut builder = TrayIconBuilder::with_id("main")
    .tooltip("Hextech Riot Settings")
    .menu(&menu)
    .show_menu_on_left_click(false)
    .on_menu_event(|app, event| match event.id().as_ref() {
      "open" => show_main_window(app),
      // Same event as the global hotkeys, so the UI applies the slot the same way.
      "slot-1" => {
        let _ = app.emit("global-hotkey-triggered", 1);
      }
      "slot-2" => {
        let _ = app.emit("global-hotkey-triggered", 2);
      }
      "quit" => app.exit(0),
      _ => {}
    })
    .on_tray_icon_event(|tray, event| {
      if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
        show_main_window(tray.app_handle());
      }
    });

  if let Some(icon) = app.default_window_icon() {
    builder = builder.icon(icon.clone());
  }
  builder.build(app)?;
  Ok(())
}

pub fn handle_window_event(window: &Window, event: &WindowEvent) {
  if let WindowEvent::CloseRequested { api, .. } = event {
    if window.label() == "main" && CLOSE_TO_TRAY.load(Ordering::SeqCst) {
      api.prevent_close();
      let _ = window.hide();
    }
  }
}
