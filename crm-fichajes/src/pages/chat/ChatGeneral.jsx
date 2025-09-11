// src/pages/chat/ChatGeneral.jsx
import { useEffect, useState } from "react";
import { apiGet } from "../../services/api";
import Rooms from "./Rooms";

export default function ChatGeneral() {
  const [roomId, setRoomId] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await apiGet("/chat/general"); // { id, nombre, tipo }
        if (alive) setRoomId(r.id);
      } catch (e) {
        console.error("General room", e);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div>
      {roomId ? (
        <Rooms roomId={roomId} title="General" />
      ) : (
        <div className="rounded bg-white p-6 text-sm text-gray-600 shadow">
          Cargando sala General…
        </div>
      )}
    </div>
  );
}
