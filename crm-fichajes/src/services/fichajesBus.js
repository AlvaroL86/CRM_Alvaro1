const EVT = "fichajes:changed";

export function emitFichajesChanged() {
  window.dispatchEvent(new CustomEvent(EVT));
}

export function subscribeFichajesChanged(handler) {
  window.addEventListener(EVT, handler);
  return () => window.removeEventListener(EVT, handler);
}
