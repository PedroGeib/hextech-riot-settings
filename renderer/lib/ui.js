// Small UI helpers shared by the views. Toasts and modals are implemented in
// app.js and exposed on window so every view uses the same look and behavior.

import { escapeHtml } from './html.js';

export function toast(message, type = 'info') {
  window.showToast?.(message, type);
}

export function errorMessage(err) {
  return err?.message ?? String(err);
}

/** Resolves true when confirmed. `message` is plain text. */
export function confirmAction({ title = 'Confirm', message, confirmText = 'Confirm', danger = false }) {
  return window.showModal({
    title,
    body: `<p style="margin: 0; white-space: pre-line;">${escapeHtml(message)}</p>`,
    confirmText,
    danger,
  });
}

/** Disables the buttons and shows a busy label on the first one while `task` runs. */
export async function withBusyButtons(buttons, busyLabel, task) {
  const list = buttons.filter(Boolean);
  const originals = list.map((button) => button.innerHTML);
  list.forEach((button) => (button.disabled = true));
  if (list[0]) list[0].textContent = busyLabel;
  try {
    return await task();
  } finally {
    list.forEach((button, i) => {
      button.disabled = false;
      button.innerHTML = originals[i];
    });
  }
}
