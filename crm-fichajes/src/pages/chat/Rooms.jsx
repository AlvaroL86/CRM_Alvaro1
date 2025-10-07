import { useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPost } from "../../services/api";

/* favoritos por id */
const PIN_KEY = "chat_pins_v2";

export default function Rooms({ selected, onSelect, onInvite, onAskDelete, getUnread }) {
  const [grupos, setGrupos] = useState([]);
  const [privados, setPrivados] = useState([]);
  const [creating, setCreating] = useState(false);

  const [pins, setPins] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PIN_KEY) || "[]"); } catch { return []; }
  });
  useEffect(() => localStorage.setItem(PIN_KEY, JSON.stringify(pins)), [pins]);

  const refresh = async () => {
    try {
      const [g, p] = await Promise.all([
        apiGet("/chat/rooms?type=grupos"),
        apiGet("/chat/rooms?type=privados"),
      ]);
      setGrupos(Array.isArray(g) ? g : []);
      setPrivados(Array.isArray(p) ? p : []);
    } catch {}
  };
  useEffect(() => { refresh(); }, []);

  const togglePin = (id) => setPins((old) => (old.includes(id) ? old.filter(x=>x!==id) : [...old, id]));

  const sorter = (a,b) => {
    const pa = pins.includes(a.id)?0:1, pb = pins.includes(b.id)?0:1;
    if (pa !== pb) return pa - pb;
    return (a.nombre || "").localeCompare(b.nombre || "");
  };

  const gruposSorted = useMemo(() => [...grupos].sort(sorter), [grupos, pins]);
  const privadosSorted = useMemo(() => [...privados].sort(sorter), [privados, pins]);

  const doCreate = async ({ nombre, members }) => {
    try {
      const r = await apiPost("/chat/rooms", { nombre, members });
      setCreating(false);
      await refresh();
      onSelect?.({ id: r.id, tipo: "grupos", nombre });
    } catch (e) { alert(e.message || "No se pudo crear el grupo"); }
  };

  const askDelete = (room) => {
    const doDelete = async () => {
      await apiDelete(`/chat/rooms/${room.id}`);
      await refresh();
      if (selected?.id === room.id) onSelect?.({ id: "general", tipo: "general", nombre: "General" });
    };
    onAskDelete?.(room.id, doDelete);
  };

  return (
    <div className="space-y-3">
      <section>
        <div className="mb-1 text-xs font-semibold text-gray-500">General</div>
        <RoomItem
          key="general"
          room={{ id: "general", nombre: "General" }}
          active={selected?.id==="general"}
          unread={getUnread?.("general") || 0}
          onClick={() => onSelect?.({ id: "general", tipo: "general", nombre: "General" })}
          pinned={pins.includes("general")}
          onTogglePin={() => togglePin("general")}
        />
      </section>

      <section>
        <div className="mb-1 flex items-center justify-between text-xs font-semibold text-gray-500">
          <span>Grupos</span>
          <button className="rounded bg-blue-600 px-2 py-0.5 text-white" onClick={()=>setCreating(true)}>+ Nuevo</button>
        </div>
        <ul className="space-y-1">
          {gruposSorted.map((r) => (
            <RoomItem
              key={r.id}
              room={r}
              active={selected?.id===r.id}
              unread={getUnread?.(r.id) || 0}
              onClick={() => onSelect?.({ id: r.id, tipo: "grupos", nombre: r.nombre })}
              onInvite={() => onInvite?.(r.id)}
              onDelete={() => askDelete(r)}
              pinned={pins.includes(r.id)}
              onTogglePin={() => togglePin(r.id)}
            />
          ))}
          {!gruposSorted.length && <li className="text-xs text-gray-400">Sin grupos</li>}
        </ul>
      </section>

      <section>
        <div className="mb-1 text-xs font-semibold text-gray-500">Privados</div>
        <ul className="space-y-1">
          {privadosSorted.map((r) => (
            <RoomItem
              key={r.id}
              room={r}
              active={selected?.id===r.id}
              unread={getUnread?.(r.id) || 0}
              onClick={() => onSelect?.({ id: r.id, tipo: "privado", nombre: r.nombre })}
              pinned={pins.includes(r.id)}
              onTogglePin={() => togglePin(r.id)}
            />
          ))}
          {!privadosSorted.length && <li className="text-xs text-gray-400">Sin privados</li>}
        </ul>
      </section>

      {creating && <CreateGroupModal onClose={()=>setCreating(false)} onCreate={doCreate} />}
    </div>
  );
}

function RoomItem({ room, active, onClick, unread=0, onInvite, onDelete, pinned, onTogglePin }) {
  return (
    <li>
      <div className={`flex items-center justify-between rounded px-2 py-1 ${active?'bg-blue-50':''}`}>
        <button type="button" className="flex-1 text-left text-sm hover:bg-gray-50 rounded px-1 py-0.5" onClick={onClick}>
          <span className="truncate">#{room.nombre}</span>
        </button>
        <div className="ml-2 flex shrink-0 items-center gap-1">
          {!!unread && <span className="min-w-5 rounded-full bg-red-600 px-1.5 text-center text-xs text-white">{unread}</span>}
          {onInvite && <button type="button" title="Invitar" className="rounded border px-1 text-xs" onClick={onInvite}>+</button>}
          {onDelete && <button type="button" title="Eliminar" className="rounded border px-1 text-xs" onClick={onDelete}>🗑</button>}
          <button type="button" title={pinned ? "Quitar de favoritos":"Añadir a favoritos"} className="rounded border px-1 text-xs"
            onClick={(e)=>{ e.stopPropagation(); onTogglePin?.(); }}>
            {pinned ? "⭐" : "☆"}
          </button>
        </div>
      </div>
    </li>
  );
}

/* Modal crear grupo (nombre + selección usuarios) */
function CreateGroupModal({ onClose, onCreate }) {
  const [nombre, setNombre] = useState("");
  const [users, setUsers] = useState([]);
  const [sel, setSel] = useState({});

  useEffect(()=>{ (async()=>{
    try { setUsers(await apiGet("/chat/users")); } catch {}
  })(); }, []);

  const toggle = (id) => setSel(s => ({...s, [id]: !s[id]}));
  const submit = () => onCreate?.({ nombre, members: Object.entries(sel).filter(([,v])=>v).map(([k])=>k) });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
      <div className="w-full max-w-lg rounded bg-white p-4 shadow">
        <h3 className="mb-3 text-lg font-semibold">Nuevo grupo</h3>
        <label className="mb-2 block text-sm">Nombre</label>
        <input className="mb-4 w-full rounded border px-2 py-1" value={nombre} onChange={(e)=>setNombre(e.target.value)} />
        <div className="mb-2 text-sm font-medium">Invitar</div>
        <div className="max-h-48 overflow-auto rounded border p-2">
          {users.map(u=>(
            <label key={u.id} className="flex items-center gap-2 py-0.5 text-sm">
              <input type="checkbox" checked={!!sel[u.id]} onChange={()=>toggle(u.id)} /> {u.nombre || u.email}
            </label>
          ))}
          {!users.length && <div className="text-xs text-gray-500">Sin usuarios</div>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded border px-3 py-1" onClick={onClose}>Cancelar</button>
          <button className="rounded bg-blue-600 px-3 py-1 text-white" onClick={submit}>Crear</button>
        </div>
      </div>
    </div>
  );
}
