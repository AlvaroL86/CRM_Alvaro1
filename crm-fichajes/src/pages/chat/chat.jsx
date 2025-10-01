// src/pages/chat/chat.jsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getSocket } from "../../socket";
import ChatGeneral from "./ChatGeneral";

function ConnectedPanel({ list = [], meId, onOpenMenu }) {
  const filtered = useMemo(() => (list || []).filter((u) => u.id !== meId), [list, meId]);
  return (
    <div className="rounded border bg-white">
      <div className="border-b p-2 text-sm font-medium">Conectados</div>
      <div className="p-2">
        <input className="mb-2 w-full rounded border px-2 py-1 text-sm" placeholder="Buscar usuario…" />
        {!filtered.length && (
          <div className="py-8 text-center text-xs text-gray-400">Nadie conectado.</div>
        )}
        <ul className="space-y-1">
          {filtered.map((u) => (
            <li key={u.id}>
              <button
                onClick={(e) => onOpenMenu?.(u, e.currentTarget)}
                className="flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm hover:bg-gray-50"
              >
                <span className="truncate">{u.nombre || u.id}</span>
                <span className="select-none text-amber-400">★</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function Chat() {
  const { user, ready, isAuthenticated } = useAuth();
  const [tab, setTab] = useState("general");
  const [showLeft, setShowLeft] = useState(() => localStorage.getItem("chat_hide_presence") !== "true");
  const [online, setOnline] = useState([]);

  const toggleLeft = () => {
    const next = !showLeft;
    setShowLeft(next);
    localStorage.setItem("chat_hide_presence", (!next).toString());
  };

  useEffect(() => {
    if (!ready || !isAuthenticated) return;
    const s = getSocket();

    const onPresence = (list) => setOnline(Array.isArray(list) ? list : []);
    s.on?.("presence:list", onPresence);

    // fuerza anuncio propio por si entras directo
    if (user?.id) s.emit("auth:hello", { id: user.id, nombre: user.nombre || user.username || String(user.id) });

    return () => s.off?.("presence:list", onPresence);
  }, [ready, isAuthenticated, user?.id]);

  return (
    <div className="p-4">
      {/* Tabs + toggle */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-2">
          {["general", "guardados", "privados", "grupos"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded px-3 py-1 text-sm ${tab === t ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={toggleLeft} className="text-xs text-blue-600 hover:underline">
          {showLeft ? "Ocultar panel" : "Mostrar panel"}
        </button>
      </div>

      {/* Layout */}
      <div className={`grid gap-4 ${showLeft ? "grid-cols-[260px_1fr]" : "grid-cols-1"}`}>
        {showLeft && (
          <ConnectedPanel
            meId={user?.id}
            list={online}
            onOpenMenu={(u) => console.log("Acciones usuario", u)}
          />
        )}

        <section className="relative min-w-0">
          {/* botón flotante cuando el panel está oculto */}
          {!showLeft && (
            <button
              className="absolute left-2 top-2 z-10 text-xs px-2 py-1 border rounded bg-white shadow"
              onClick={toggleLeft}
            >
              Mostrar panel
            </button>
          )}

          {tab === "general" && <ChatGeneral />}
          {tab === "guardados" && (
            <div className="rounded border bg-white p-4 text-sm text-gray-500">
              Guardados: en construcción (usará tus ⭐ locales).
            </div>
          )}
          {tab === "privados" && (
            <div className="rounded border bg-white p-4 text-sm text-gray-500">
              Privados: en construcción (wiring de salas privadas 1:1).
            </div>
          )}
          {tab === "grupos" && (
            <div className="rounded border bg-white p-4 text-sm text-gray-500">
              Grupos: el listado y la creación los tenemos en progreso.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
