// src/components/RoomsPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../services/api";

/**
 * Panel reutilizable para listar salas (grupos/privados/guardados)
 *
 * Props:
 * - type: "grupo" | "privado" | "guardado"
 * - title: string
 * - storagePrefix: string (p.e. "chat_private")
 * - currentId: string | null (para resaltar la activa)
 * - onSelect(room): callback al seleccionar
 * - selectId?: string (autoselección inicial por query)
 */
export default function RoomsPanel({
  type = "grupo",
  title = "Salas",
  storagePrefix = "chat_panel",
  currentId = null,
  onSelect,
  selectId,
}) {
  const PIN_KEY = `${storagePrefix}_pins`;
  const PANEL_KEY = `${storagePrefix}_hide_panel`;

  // estado base
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // pins + visibilidad
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
    try {
      return JSON.parse(localStorage.getItem(PANEL_KEY) || "false");
    } catch {
      return false;
    }
  });

  useEffect(() => localStorage.setItem(PIN_KEY, JSON.stringify(pins)), [pins]);
  useEffect(
    () => localStorage.setItem(PANEL_KEY, JSON.stringify(hidePanel)),
    [hidePanel]
  );

  // cargar listado
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const list = await apiGet(`/chat/rooms?type=${encodeURIComponent(type)}`);
        setRooms(Array.isArray(list) ? list : []);
      } catch (e) {
        setErr(e.message || "No se pudo cargar el listado.");
        setRooms([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [type]);

  // ordenar con pins primero
  const orderedRooms = useMemo(() => {
    const map = new Map(rooms.map((r) => [r.id, r]));
    const pinned = pins.map((id) => map.get(id)).filter(Boolean);
    const others = rooms
      .filter((r) => !pins.includes(r.id))
      .slice()
      .sort((a, b) =>
        (a.nombre || "").localeCompare(b.nombre || "", "es", {
          sensitivity: "base",
        })
      );
    return [...pinned, ...others];
  }, [rooms, pins]);

  // autoselección por selectId (si viene en la URL)
  useEffect(() => {
    if (!selectId || !rooms.length || !onSelect) return;
    const r = rooms.find((x) => x.id === selectId);
    if (r) onSelect(r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectId, rooms.length]);

  const togglePin = (id) =>
    setPins((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  if (hidePanel) {
    return (
      <div className="mb-2">
        <button
          className="text-xs text-gray-500 hover:underline"
          onClick={() => setHidePanel(false)}
          title="Mostrar panel"
        >
          Mostrar {title}
        </button>
      </div>
    );
  }

  return (
    <aside className="rounded bg-white p-3 shadow">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">{title}</h3>
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
        <div className="text-sm text-gray-500">No hay elementos.</div>
      )}

      <div className="mt-2 space-y-1">
        {orderedRooms.map((r) => {
          const active = r.id === currentId;
          const pinned = pins.includes(r.id);
          return (
            <div
              key={r.id}
              className={`flex items-center justify-between rounded px-2 py-1 text-sm ${
                active ? "bg-blue-50 text-blue-700" : "hover:bg-gray-100"
              }`}
            >
              <button
                onClick={() => onSelect?.(r)}
                className="flex-1 truncate text-left"
                title={r.nombre}
              >
                {r.nombre}
              </button>
              <button
                onClick={() => togglePin(r.id)}
                className={`ml-2 rounded px-1 ${
                  pinned
                    ? "text-amber-500"
                    : "text-gray-400 hover:text-gray-600"
                }`}
                title={pinned ? "Desfijar" : "Fijar"}
              >
                ★
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
