// crm-fichajes/src/socket.js
import { io } from "socket.io-client";
import { BASE_URL, readToken } from "./services/api";

let socket = null;

function safeToken() {
  try { return readToken() || null; } catch { return null; }
}

/** Singleton */
export function getSocket(forceReconnect = false) {
  if (socket && !forceReconnect) return socket;
  if (socket && forceReconnect) {
    try { socket.disconnect(); } catch {}
    socket = null;
  }
  socket = io(BASE_URL, {
    transports: ["websocket"],
    autoConnect: true,
    reconnection: true,
    timeout: 20000,
    auth: (() => {
      const t = safeToken();
      return t ? { token: t } : undefined;
    })(),
  });

  if (import.meta?.env?.DEV) {
    socket.on("connect", () => console.log("[socket] connected:", socket.id));
    socket.on("disconnect", (r) => console.log("[socket] disconnected:", r));
    socket.on("connect_error", (e) => console.warn("[socket] error:", e?.message ?? e));
  }
  return socket;
}

export function on(event, handler) {
  const s = getSocket();
  s.on(event, handler);
  return () => s.off(event, handler);
}
export function emit(event, payload) {
  getSocket().emit(event, payload);
}
