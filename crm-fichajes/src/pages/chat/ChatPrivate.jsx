// src/pages/chat/ChatPrivate.jsx
import { useState } from "react";
import { useLocation } from "react-router-dom";
import RoomsPanel from "../../components/RoomsPanel"; // <- ruta corregida
import Rooms from "./Rooms";

/**
 * Pantalla de "Privados"
 * - Panel izquierdo (RoomsPanel):
 *   - carga /chat/rooms?type=privado
 *   - colapsable (persistencia localStorage desde el propio panel)
 *   - fijar/desfijar ⭐ (persistencia localStorage)
 *   - autoselección por query ?select=<roomId>
 * - Columna derecha: conversación con <Rooms />
 */
export default function ChatPrivate() {
  const [roomId, setRoomId] = useState(null);
  const [roomName, setRoomName] = useState("");

  const { search } = useLocation();
  const selectId = new URLSearchParams(search).get("select") || undefined;

  const handleSelect = (room) => {
    setRoomId(room.id);
    setRoomName(room.nombre || "Privado");
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {/* Panel lateral de privados */}
      <div className="md:col-span-1">
        <RoomsPanel
          type="privado"
          title="Privados"
          storagePrefix="chat_private"
          currentId={roomId}
          onSelect={handleSelect}
          selectId={selectId}
        />
      </div>

      {/* Columna derecha: conversación */}
      <main className="md:col-span-3">
        {roomId ? (
          <Rooms roomId={roomId} title={`Privado · ${roomName || "Privado"}`} />
        ) : (
          <div className="rounded bg-white p-6 text-sm text-gray-600 shadow">
            Elige una conversación privada o crea una nueva con “+ Nuevo chat”.
          </div>
        )}
      </main>
    </div>
  );
}
