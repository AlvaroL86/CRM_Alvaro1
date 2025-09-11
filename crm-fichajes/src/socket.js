import { io } from "socket.io-client";
import { BASE_URL } from "./api"; // <-- CORRECTO: ./api (está en la misma carpeta)

let socket = null;

/** Lee el token guardado por tu login (si existe) */
function getToken() {
  try {
    return localStorage.getItem("crm_token");
  } catch {
    return null;
  }
}

/** Devuelve SIEMPRE la misma instancia (singleton) */
export function getSocket() {
  if (!socket) {
    const token = getToken();

    socket = io(BASE_URL, {
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      auth: token ? { token } : undefined, // opcional, si tu backend lo usa
    });

    // Logs útiles para debug (puedes quitarlos luego si molestan)
    socket.on("connect", () => {
      console.log("[socket] connected:", socket.id);
    });
    socket.on("disconnect", (reason) => {
      console.log("[socket] disconnected:", reason);
    });
    socket.on("connect_error", (err) => {
      console.warn("[socket] error:", err.message);
    });
  }
  return socket;
}

/** Para desconectar explícitamente si alguna vez lo necesitas */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
