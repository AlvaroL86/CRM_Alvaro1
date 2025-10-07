// src/socket.js
import { io } from "socket.io-client";
import { BASE_URL } from "./services/api";

let socket;
export function getSocket() {
  if (!socket) {
    const url = import.meta.env.VITE_API_URL || "http://localhost:3000";
    socket = io(url, { transports: ["websocket"], autoConnect: true });
    socket.on("connect", () => {
      const u = readUser();
      if (u?.id) socket.emit("auth:hello", { id: u.id, nombre: u.nombre || u.username || String(u.id), nif: u.nif || null });
    });
  }
  return socket;
}