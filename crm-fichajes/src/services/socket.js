// crm-fichajes/src/socket.js
import { io } from "socket.io-client";
import { BASE_URL, readToken } from "./services/api";

let socket = null;

function safeGetToken() {
  try { return readToken?.() ?? localStorage.getItem("crm_token") ?? null; }
  catch { return null; }
}

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
    timeout: 20000,
    auth: token ? { token } : undefined,
  });

  if (import.meta?.env?.DEV) {
    socket.on("connect",       () => console.log("[socket] connected:", socket.id));
    socket.on("disconnect",    (r) => console.log("[socket] disconnected:", r));
    socket.on("connect_error", (e) => console.warn("[socket] error:", e?.message || e));
    socket.on("reconnect_attempt", (n) => console.log("[socket] reconnect_attempt:", n));
  }
  return socket;
}
