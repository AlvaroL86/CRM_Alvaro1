import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getSocket } from "../../socket";
import NewChatModal from "./NewChatModal";

const LS_GROUPS = "chat_groups";
const LS_PIN_GROUPS = "chat_pinned_groups";

function useLocalList(key, fallback = []) {
  const [list, setList] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return fallback; }
  });
  const save = (next) => { setList(next); try { localStorage.setItem(key, JSON.stringify(next)); } catch {} };
  return [list, save];
}

export default function Rooms() {
  const { user } = useAuth();
  const [groups, setGroups] = useLocalList(LS_GROUPS, []);
  const [pins, setPins] = useLocalList(LS_PIN_GROUPS, []);
  const [current, setCurrent] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const s = getSocket();

  useEffect(() => { s.emit('chat:join', 'general'); }, [s]); // noop, placeholder

  const togglePin = (id) => {
    setPins(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [id, ...prev];
      return next;
    });
  };

  const ordered = useMemo(() => {
    const mapPin = new Set(pins);
    const arr = [...groups].sort((a,b) => {
      const ap = mapPin.has(a.id) ? 0 : 1;
      const bp = mapPin.has(b.id) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return (a.name || '').localeCompare(b.name || '');
    });
    return arr;
  }, [groups, pins]);

  function createGroup(data) {
    const id = `grp_${Date.now()}`;
    const g = { id, name: data.name, owner_id: user?.id || null, members: data.members || [] };
    setGroups(prev => [g, ...prev]);
    setCurrent(g);
  }

  return (
    <div className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-medium">Grupos</div>
        <button className="rounded bg-blue-600 px-3 py-1 text-sm text-white" onClick={()=>setOpenModal(true)}>+ Nuevo chat</button>
      </div>

      <div className="grid grid-cols-[260px_1fr] gap-4">
        <aside className="rounded border bg-white p-3">
          <input className="mb-2 w-full rounded border px-2 py-1 text-sm" placeholder="Buscar grupo…" />
          <div className="divide-y">
            {ordered.map(g => (
              <button
                key={g.id}
                onClick={()=>setCurrent(g)}
                className={`flex w-full items-center justify-between px-2 py-2 text-left text-sm hover:bg-gray-50 ${current?.id===g.id?'bg-blue-50':''}`}
              >
                <span className="truncate">{g.name}</span>
                <span onClick={(e)=>{e.stopPropagation(); togglePin(g.id);}} className="select-none text-amber-400" title="Favorito">★</span>
              </button>
            ))}
            {!ordered.length && <div className="px-2 py-8 text-center text-xs text-gray-400">No hay grupos. Crea uno nuevo.</div>}
          </div>
        </aside>

        <section className="rounded border bg-white p-4">
          {current ? (
            <>
              <div className="mb-2 text-sm">Grupo: <span className="font-medium">{current.name}</span></div>
              <div className="rounded border bg-gray-50 p-3 text-sm text-gray-500">
                Aquí iría el timeline del grupo (enlaza tu lógica de rooms).
              </div>
            </>
          ) : (
            <div className="rounded border bg-gray-50 p-6 text-center text-sm text-gray-500">
              Selecciona un grupo de la lista o crea uno nuevo con “+ Nuevo chat”.
            </div>
          )}
        </section>
      </div>

      {openModal && <NewChatModal open onClose={()=>setOpenModal(false)} onCreated={createGroup} />}
    </div>
  );
}
