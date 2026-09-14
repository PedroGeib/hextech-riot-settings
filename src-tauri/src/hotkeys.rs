//! Global Ctrl+Alt+1 / Ctrl+Alt+2 hotkeys for applying the quick slots.
//!
//! Hotkeys are owned by the thread that registers them, so a dedicated thread
//! runs a message loop and (un)registers them when the setting changes.
//! They start unregistered: the UI enables them according to the user's setting.

use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::thread;

use tauri::{AppHandle, Emitter};
use windows_sys::Win32::System::Threading::GetCurrentThreadId;
use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
  RegisterHotKey, UnregisterHotKey, MOD_ALT, MOD_CONTROL, MOD_NOREPEAT,
};
use windows_sys::Win32::UI::WindowsAndMessaging::{
  GetMessageW, PeekMessageW, PostThreadMessageW, MSG, PM_NOREMOVE, WM_APP, WM_HOTKEY,
};

/// Hotkey id (also the slot number sent to the UI) and virtual key code.
const HOTKEYS: [(i32, u32); 2] = [(1, 0x31), (2, 0x32)];
const WM_SYNC_HOTKEYS: u32 = WM_APP + 1;

static THREAD_ID: AtomicU32 = AtomicU32::new(0);
static ENABLED: AtomicBool = AtomicBool::new(false);

pub fn spawn(app: AppHandle) {
  thread::spawn(move || unsafe {
    let mut msg: MSG = std::mem::zeroed();
    // Forces creation of this thread's message queue before publishing its id.
    PeekMessageW(&mut msg, 0, WM_APP, WM_APP, PM_NOREMOVE);
    THREAD_ID.store(GetCurrentThreadId(), Ordering::SeqCst);

    let mut registered = false;
    sync(&mut registered);

    while GetMessageW(&mut msg, 0, 0, 0) > 0 {
      match msg.message {
        WM_HOTKEY => {
          let _ = app.emit("global-hotkey-triggered", msg.wParam as i32);
        }
        WM_SYNC_HOTKEYS => sync(&mut registered),
        _ => {}
      }
    }
  });
}

pub fn set_enabled(enabled: bool) {
  ENABLED.store(enabled, Ordering::SeqCst);
  let thread_id = THREAD_ID.load(Ordering::SeqCst);
  if thread_id != 0 {
    unsafe {
      PostThreadMessageW(thread_id, WM_SYNC_HOTKEYS, 0, 0);
    }
  }
}

unsafe fn sync(registered: &mut bool) {
  let wanted = ENABLED.load(Ordering::SeqCst);
  if wanted == *registered {
    return;
  }
  for (id, key) in HOTKEYS {
    if wanted {
      if RegisterHotKey(0, id, MOD_CONTROL | MOD_ALT | MOD_NOREPEAT, key) == 0 {
        log::warn!("Ctrl+Alt+{id} is already in use by another application");
      }
    } else {
      UnregisterHotKey(0, id);
    }
  }
  *registered = wanted;
}
