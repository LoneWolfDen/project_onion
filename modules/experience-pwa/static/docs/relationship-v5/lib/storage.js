// storage.js: per-viewer conveniences only (the Why card dismissal).
// Storage can be blocked (private windows, previews), so every call is guarded
// and the page works the same without it.
export function readFlag(key) {
  try { return window.localStorage.getItem(key) === '1'; } catch (e) { return false; }
}

export function writeFlag(key, on) {
  try {
    if (on) window.localStorage.setItem(key, '1'); else window.localStorage.removeItem(key);
  } catch (e) { /* storage unavailable: the flag simply is not remembered */ }
}
