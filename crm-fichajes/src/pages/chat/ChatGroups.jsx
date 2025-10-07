import { useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "../../services/api";
import { getSocket } from "../../socket";
import InputBar from "./InputBar";

export default function ChatGroups() {
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState(null); // {id,nombre}
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [showModal, setShowModal] = useState(false);
  const listRef = useRef(null);

  // cargar grupos
  const loadGroups = async () => {
    try {
      const data = await apiGet(`/chat/rooms?type=grupos`);
      setGroups(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn("grupos:", e.message);
    }
  };
  useEffect(() => { loadGroups(); }, []);

  // histórico + socket del grupo seleccionado
  useEffect(() => {
    let alive = true;
    if (!selected?.id) { setMsgs([]); return; }

    (async () => {
      try {
        const data = await apiGet(`/chat/messages?room=${selected.id}&limit=200`);
        if (!alive) return;
        setMsgs(Array.isArray(data) ? data : []);
        scrollBottom();
      } catch (e) {
        console.warn("historial grupo:", e.message);
      }
    })();

    const s = getSocket();
    s.emit("chat:join", { room: selected.id });
    const onMsg = (m) => {
      if ((m?.room_id || m?.roomId) === selected.id) {
        setMsgs((p) => [...p, m]);
        scrollBottom();
      }
    };
    s.on("chat:message", onMsg);

    return () => {
      alive = false;
      s.off("chat:message", onMsg);
      s.emit("chat:leave", { room: selected?.id });
    };
  }, [selected?.id]);

  const send = async () => {
    const t = String(text || "").trim();
    if (!t || !selected?.id) return;
    const s = getSocket();
    if (s?.connected) s.emit("chat:send", { room: selected.id, text: t });
    try { await apiPost("/chat/messages", { room: selected.id, text: t }); } catch {}
    setText("");
  };

  const scrollBottom = () => requestAnimationFrame(() => { try { listRef.current?.scrollTo({ top: 1e9 }); } catch {} });

  const createGroup = async ({ nombre, descripcion }) => {
    const res = await apiPost(`/chat/rooms`, { nombre, descripcion });
    await loadGroups();
    setSelected(res);
    setShowModal(false);
  };

  return (
    <div className="grid h-full grid-cols-[260px_1fr] gap-4">
      <aside className="rounded border bg-white">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="text-sm font-medium">Grupos</div>
          <button className="text-xs text-blue-600 hover:underline" onClick={() => setShowModal(true)}>+ Nuevo</button>
        </div>
        <div className="p-2">
          <input className="mb-2 w-full rounded border px-2 py-1 text-sm" placeholder="Buscar grupo…" />
          <ul className="space-y-1">
            {groups.map(g => (
              <li key={g.id}>
                <button
                  className={`w-full rounded px-2 py-1 text-left text-sm hover:bg-gray-50 ${selected?.id === g.id ? "bg-blue-50" : ""}`}
                  onClick={() => setSelected(g)}
                >
                  <span className="mr-1">#</span>{g.nombre}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <section className="flex min-w-0 flex-col">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="text-sm font-medium">
            {selected ? `Grupo: ${selected.nombre}` : "Selecciona un grupo"}
          </div>
          {selected && (
            <div className="text-xs text-gray-500">
              Participantes: (pendiente API)
              <button className="ml-2 rounded border px-2 py-1 text-xs" disabled>Añadir</button>
            </div>
          )}
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto rounded border bg-white p-3">
          <div className="mx-auto w-full max-w-3xl">
            {!selected ? (
              <div className="py-10 text-center text-gray-400">Selecciona un grupo de la lista o crea uno nuevo.</div>
            ) : msgs.length === 0 ? (
              <div className="py-10 text-center text-gray-400">No hay mensajes.</div>
            ) : (
              <ul className="space-y-2">
                {msgs.map(m => (
                  <li key={m.id} className="rounded bg-gray-50 p-2">
                    <div className="text-[11px] text-gray-400">
                      {m.from?.nombre || m.user_id} · {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">{m.text}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mx-auto w-full max-w-3xl">
          <InputBar value={text} onChange={setText} onSend={send} placeholder="Escribe al grupo…" />
        </div>
      </section>

      {showModal && <CreateGroupModal onClose={() => setShowModal(false)} onCreate={createGroup} />}
    </div>
  );
}

function CreateGroupModal({ onClose, onCreate }) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded bg-white p-4 shadow">
        <div className="mb-3 text-base font-semibold">Nuevo grupo</div>
        <div className="space-y-2">
          <label className="block text-sm">
            Nombre
            <input className="mt-1 w-full rounded border px-2 py-1" value={nombre} onChange={(e)=>setNombre(e.target.value)} />
          </label>
          <label className="block text-sm">
            Descripción (opcional)
            <textarea className="mt-1 w-full rounded border px-2 py-1" rows={3} value={descripcion} onChange={(e)=>setDescripcion(e.target.value)} />
          </label>
          <div className="text-xs text-gray-500">Participantes: (UI lista cuando esté la API `chat_room_members`).</div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded border px-3 py-1" onClick={onClose}>Cancelar</button>
          <button
            className="rounded bg-blue-600 px-3 py-1 text-white"
            onClick={() => onCreate({ nombre: nombre.trim(), descripcion: descripcion.trim() })}
            disabled={!nombre.trim()}
          >
            Crear
          </button>
        </div>
      </div>
    </div>
  );
}
