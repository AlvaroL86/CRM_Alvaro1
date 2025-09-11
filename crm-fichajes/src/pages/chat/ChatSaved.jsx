// src/pages/chat/ChatSaved.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { apiGet } from "../../services/api";
import Rooms from "./Rooms";

const PIN_KEY = "chat_pinned_saved";
const PANEL_KEY = "chat_saved_hide_panel";

export default function ChatSaved() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [roomId, setRoomId] = useState(null);
  const [roomName, setRoomName] = useState("");

  const [pins, setPins] = useState(() => {
    try {
      const raw = localStorage.getItem(PIN_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  });

  const [hidePanel, setHidePanel] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PANEL_KEY) || "false"); } catch { return false; }
  });

  const { search } = useLocation();

  useEffect(() => { localStorage.setItem(PIN_KEY, JSON.stringify(pins)); }, [pins]);
  useEffect(() => { localStorage.setItem(PANEL_KEY, JSON.stringify(hidePanel)); }, [hidePanel]);

  const loadRooms = async () => {
    setLoading(true);
    setErr("");
    try {
      const list = await apiGet("/chat/rooms?type=guardado");
      setRooms(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e.message || "No se pudieron cargar las salas guardadas.");
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRooms(); }, []);

  const orderedRooms = useMemo(() => {
    const map = new Map(rooms.map(r => [r.id, r]));
    const pinned = pins.map(id => map.get(id)).filter(Boolean);
    const others = rooms
      .filter(r => !pins.includes(r.id))
      .slice()
      .sort((a,b) =>
        (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" })
      );
    return [...pinned, ...others];
  }, [rooms, pins]);

  useEffect(() => {
    const p = new URLSearchParams(search).get("select");
    if (p) {
      const r = rooms.find(x => x.id === p);
      if (r) { setRoomId(r.id); setRoomName(r.nombre || "Sala"); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, rooms.length]);

  const togglePin = (id) =>
    setPins(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const selectRoom = (r) => { setRoomId(r.id); setRoomName(r.nombre || "Sala"); };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {!hidePanel && (
        <aside className="rounded bg-white p-3 shadow md:col-span-1">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Guardados</h3>
            <button
              className="text-xs text-gray-500 hover:underline"
              onClick={() => setHidePanel(true)}
              title="Ocultar panel"
            >
              Ocultar panel
            </button>
          </div>

          {loading && <div className="text-sm text-gray-500">Cargando…</div>}
          {err && <div className="text-sm text-red-600">{err}</div>}
          {!loading && !err && orderedRooms.length === 0 && (
            <div className="text-sm text-gray-500">No hay salas guardadas.</div>
          )}

          <div className="mt-2 space-y-1">
            {orderedRooms.map((r) => {
              const active = r.id === roomId;
              const pinned = pins.includes(r.id);
              return (
                <div
                  key={r.id}
                  className={`flex items-center justify-between rounded px-2 py-1 text-sm ${
                    active ? "bg-blue-50 text-blue-700" : "hover:bg-gray-100"
                  }`}
                >
                  <button
                    onClick={() => selectRoom(r)}
                    className="flex-1 truncate text-left"
                    title={r.nombre}
                  >
                    {r.nombre}
                  </button>
                  <button
                    onClick={() => togglePin(r.id)}
                    className={`ml-2 rounded px-1 ${pinned ? "text-amber-500" : "text-gray-400 hover:text-gray-600"}`}
                    title={pinned ? "Desfijar" : "Fijar"}
                  >
                    ★
                  </button>
                </div>
              );
            })}
          </div>
        </aside>
      )}

      <main className={hidePanel ? "md:col-span-4" : "md:col-span-3"}>
        {hidePanel && (
          <div className="mb-2">
            <button
              className="text-xs text-gray-500 hover:underline"
              onClick={() => setHidePanel(false)}
              title="Mostrar panel"
            >
              Mostrar panel
            </button>
          </div>
        )}

        {roomId ? (
          <Rooms roomId={roomId} title={`Guardado · ${roomName || "Sala"}`} />
        ) : (
          <div className="rounded bg-white p-6 text-sm text-gray-600 shadow">
            Selecciona una sala guardada para continuar.
          </div>
        )}
      </main>
    </div>
  );
}
