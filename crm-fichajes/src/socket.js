// crm-fichajes/src/socket.js
import { io } from "socket.io-client";
import { BASE_URL, readToken } from "./services/api";

let socket = null;

/** Lee el token con seguridad (usa readToken de services/api) */
function safeGetToken() {
  try {
    return readToken?.() ?? localStorage.getItem("crm_token") ?? null;
  } catch {
    return null;
  }
}

/**
 * Devuelve SIEMPRE la misma instancia de socket.io (singleton).
 * Si pasas forceReconnect=true, cierra y crea una nueva.
 */
export function getSocket(forceReconnect = false) {
  if (socket && !forceReconnect) return socket;

  if (socket && forceReconnect) {
    try { socket.disconnect(); } catch {}
    socket = null;
  }

  const token = safeGetToken();

  socket = io(BASE_URL, {
    transports: ["websocket"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    // En Render (plan free) la primera conexión puede tardar
    timeout: 20000,
    auth: token ? { token } : undefined, // si tu backend lo usa
  });

  // Logs útiles en desarrollo (se silencian en producción)
  if (import.meta?.env?.DEV) {
    socket.on("connect", () => console.log("[socket] connected:", socket.id));
    socket.on("disconnect", (reason) =>
      console.log("[socket] disconnected:", reason)
    );
    socket.on("connect_error", (err) =>
      console.warn("[socket] error:", err?.message ?? err)
    );
    socket.on("reconnect_attempt", (n) =>
      console.log("[socket] reconnect_attempt:", n)
    );
  }

  return socket;
}

/** Para desconectar explícitamente si alguna vez lo necesitas */
export function disconnectSocket() {
  if (socket) {
    try { socket.disconnect(); } catch {}
    socket = null;
  }
}

/** Atajo opcional para registrar listeners y poder quitarlos fácil */
export function on(event, handler) {
  const s = getSocket();
  s.on(event, handler);
  return () => s.off(event, handler);
}

/** Atajo para emitir eventos */
export function emit(event, payload) {
  const s = getSocket();
  s.emit(event, payload);
}
