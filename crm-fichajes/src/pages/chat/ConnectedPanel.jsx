// src/pages/chat/ConnectedPanel.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { getSocket } from "../../socket";

const HIDE_KEY = "chat_hide_presence";
const PINS_KEY = "chat_private_pins";

function readPins() {
  try { return JSON.parse(localStorage.getItem(PINS_KEY) || "[]"); } catch { return []; }
}
function writePins(arr) {
  try { localStorage.setItem(PINS_KEY, JSON.stringify(arr)); } catch {}
}
function togglePin(userId) {
  const pins = new Set(readPins());
  pins.has(userId) ? pins.delete(userId) : pins.add(userId);
  writePins([...pins]);
  return [...pins];
}

export default function ConnectedPanel({ onOpenPrivate, className = "" }) {
  const [online, setOnline] = useState([]);
  const [q, setQ] = useState("");
  const [hidden, setHidden] = useState(() => localStorage.getItem(HIDE_KEY) === "true");
  const [pins, setPins] = useState(() => readPins());
  const [menu, setMenu] = useState(null); // {x,y,user}

  // presencia (nuevo + compat)
  useEffect(() => {
    const s = getSocket();
    const onPresence = (list) => {
      const norm = Array.isArray(list) ? list.map(u => ({
        id: u.id ?? u.userId, nombre: u.nombre ?? u.name
      })) : [];
      setOnline(norm);
    };
    s.on("presence:list", onPresence);
    s.on("online-users", onPresence);
    return () => {
      s.off("presence:list", onPresence);
      s.off("online-users", onPresence);
    };
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return online
      .slice()
      .sort((a, b) => {
        const ap = pins.includes(a.id) ? -1 : 0;
        const bp = pins.includes(b.id) ? -1 : 0;
        return ap - bp || String(a.nombre || a.id).localeCompare(String(b.nombre || b.id));
      })
      .filter(u => !t || String(u.nombre || u.id).toLowerCase().includes(t));
  }, [online, q, pins]);

  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setMenu(null);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  function openMenu(e, u) {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, user: u });
  }

  function pinUser(u) {
    setPins(togglePin(u.id));
    setMenu(null);
  }

  function hideToggle() {
    const v = !hidden;
    setHidden(v);
    try { localStorage.setItem(HIDE_KEY, String(v)); } catch {}
  }

  if (hidden) {
    return (
      <div className={`w-64 shrink-0 p-2 ${className}`}>
        <button
          className="text-xs text-blue-600 hover:underline"
          onClick={hideToggle}
        >
          Mostrar panel
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className={`w-64 shrink-0 p-3 space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="font-semibold">Conectados</div>
        <button
          className="text-xs text-blue-600 hover:underline"
          onClick={hideToggle}
        >
          Ocultar panel
        </button>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar usuario…"
        className="w-full rounded border px-2 py-1 text-sm"
      />

      <div className="max-h-[60vh] overflow-y-auto rounded border bg-white">
        {!filtered.length && (
          <div className="p-3 text-sm text-gray-500">Sin usuarios.</div>
        )}
        {filtered.map((u) => (
          <div
            key={u.id}
            onClick={() => onOpenPrivate?.(u)}
            onContextMenu={(e) => openMenu(e, u)}
            className="flex cursor-pointer items-center justify-between gap-2 border-b px-2 py-2 hover:bg-gray-50"
            title="Click: abrir chat · Clic derecho: opciones"
          >
            <div className="truncate text-sm">
              {u.nombre || u.id}
            </div>
            <button
              className={`text-xs ${pins.includes(u.id) ? "text-yellow-500" : "text-gray-400"}`}
              onClick={(e) => { e.stopPropagation(); pinUser(u); }}
              title={pins.includes(u.id) ? "Quitar de favoritos" : "Marcar favorito"}
            >
              ★
            </button>
          </div>
        ))}
      </div>

      {/* Menú contextual simple */}
      {menu && (
        <div
          style={{ top: menu.y, left: menu.x }}
          className="fixed z-50 w-48 overflow-hidden rounded border bg-white shadow-lg"
        >
          <div className="border-b px-3 py-2 text-sm font-medium">
            {menu.user.nombre || menu.user.id}
          </div>
          <button
            className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
            onClick={() => { onOpenPrivate?.(menu.user); setMenu(null); }}
          >
            Abrir chat
          </button>
          <button
            className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
            onClick={() => { pinUser(menu.user); }}
          >
            {pins.includes(menu.user.id) ? "Quitar de favoritos" : "Marcar como favorito"}
          </button>
          <button
            className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
            onClick={() => { alert("Llamar (por implementar)"); setMenu(null); }}
          >
            Llamar
          </button>
        </div>
      )}
    </div>
  );
}
