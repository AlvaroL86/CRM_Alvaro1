// src/pages/chat/ChatGroups.jsx
import { useEffect, useMemo, useState } from "react";
import { getSocket } from "../../socket";

const HIDE_KEY = "chat_groups_hide_panel";
const PINS_KEY = "chat_pinned_groups";
const LIST_KEY = "chat_groups_local"; // almacenamiento local si no hay backend

function readPins() {
  try { return JSON.parse(localStorage.getItem(PINS_KEY) || "[]"); } catch { return []; }
}
function writePins(v) {
  try { localStorage.setItem(PINS_KEY, JSON.stringify(v)); } catch {}
}
function readLocalGroups() {
  try { return JSON.parse(localStorage.getItem(LIST_KEY) || "[]"); } catch { return []; }
}
function writeLocalGroups(list) {
  try { localStorage.setItem(LIST_KEY, JSON.stringify(list)); } catch {}
}

export default function ChatGroups() {
  const [hidden, setHidden] = useState(() => localStorage.getItem(HIDE_KEY) === "true");
  const [q, setQ] = useState("");
  const [groups, setGroups] = useState(() => readLocalGroups());
  const [pins, setPins] = useState(() => readPins());
  const [selected, setSelected] = useState(null);

  // escuchar evento global para “+ Nuevo chat”
  useEffect(() => {
    const onNew = () => {
      const name = prompt("Nombre del grupo");
      if (!name) return;
      const id = `g_${Date.now()}`;
      const g = { id, name };
      const list = [g, ...groups];
      setGroups(list);
      writeLocalGroups(list);
      getSocket().emit("chat:room-created", { id, name });
      setSelected(g);
    };
    window.addEventListener("chat:new-group", onNew);
    return () => window.removeEventListener("chat:new-group", onNew);
  }, [groups]);

  function hideToggle() {
    const v = !hidden;
    setHidden(v);
    try { localStorage.setItem(HIDE_KEY, String(v)); } catch {}
  }

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return groups
      .slice()
      .sort((a, b) => {
        const ap = pins.includes(a.id) ? -1 : 0;
        const bp = pins.includes(b.id) ? -1 : 0;
        return ap - bp || a.name.localeCompare(b.name);
      })
      .filter(g => !t || g.name.toLowerCase().includes(t));
  }, [groups, q, pins]);

  function togglePin(id) {
    const set = new Set(pins);
    set.has(id) ? set.delete(id) : set.add(id);
    const arr = [...set];
    setPins(arr);
    writePins(arr);
  }

  return (
    <div className="flex gap-4">
      {/* Panel lateral de grupos */}
      <div className="w-64 shrink-0 p-2">
        <div className="mb-2 flex items-center justify-between">
          <div className="font-semibold">Grupos</div>
          <button className="text-xs text-blue-600 hover:underline" onClick={hideToggle}>
            {hidden ? "Mostrar panel" : "Ocultar panel"}
          </button>
        </div>

        {!hidden && (
          <>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar grupo…"
              className="mb-2 w-full rounded border px-2 py-1 text-sm"
            />
            <div className="max-h-[60vh] overflow-y-auto rounded border bg-white">
              {!list.length && <div className="p-3 text-sm text-gray-500">No hay grupos. Crea uno nuevo.</div>}
              {list.map((g) => (
                <div
                  key={g.id}
                  onClick={() => setSelected(g)}
                  className={`flex cursor-pointer items-center justify-between gap-2 border-b px-2 py-2 hover:bg-gray-50 ${
                    selected?.id === g.id ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="truncate text-sm">{g.name}</div>
                  <button
                    className={`text-xs ${pins.includes(g.id) ? "text-yellow-500" : "text-gray-400"}`}
                    onClick={(e) => { e.stopPropagation(); togglePin(g.id); }}
                    title={pins.includes(g.id) ? "Quitar de favoritos" : "Marcar favorito"}
                  >
                    ★
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Área de grupo seleccionado / ayuda */}
      <div className="flex-1">
        {!selected && (
          <div className="rounded border bg-white p-4 text-sm text-gray-600">
            Selecciona un grupo de la lista o crea uno nuevo con “+ Nuevo chat”.
          </div>
        )}
        {selected && (
          <div className="rounded border bg-white p-4">
            <div className="mb-2 text-sm text-gray-600">
              Grupo: <strong>{selected.name}</strong>
            </div>
            <div className="text-gray-400">Aquí iría el timeline del grupo (enlaza tu lógica de rooms).</div>
          </div>
        )}
      </div>
    </div>
  );
}
