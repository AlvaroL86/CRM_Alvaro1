// src/pages/chat/Rooms.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getSocket } from "../../socket";
import NewChatModal from "./NewChatModal";

/* ===== persistencia en localStorage (lista de grupos y pins) ===== */
const LS_GROUPS = "chat_groups";
const LS_PIN_GROUPS = "chat_pinned_groups";
const histKey = (id) => `chat_group_${id}_history`;

function useLocalGroups() {
  const [groups, setGroups] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_GROUPS) || "[]"); } catch { return []; }
  });
  function save(next) {
    setGroups(next);
    try { localStorage.setItem(LS_GROUPS, JSON.stringify(next)); } catch {}
  }
  return [groups, save];
}
function usePinned() {
  const [pins, setPins] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_PIN_GROUPS) || "[]"); } catch { return []; }
  });
  function toggle(id) {
    setPins((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev];
      try { localStorage.setItem(LS_PIN_GROUPS, JSON.stringify(next)); } catch {}
      return next;
    });
  }
  return [pins, toggle];
}
function loadHist(id) {
  try { return JSON.parse(localStorage.getItem(histKey(id)) || "[]"); } catch { return []; }
}
function saveHist(id, arr) {
  try {
    const trimmed = Array.isArray(arr) ? arr.slice(-200) : [];
    localStorage.setItem(histKey(id), JSON.stringify(trimmed));
  } catch {}
}

/* ==== Composer mini (reutilizo la del general) ==== */
function Composer({ onSend }) {
  const [t, setT] = useState("");
  function send() {
    const s = t.trim();
    if (!s) return;
    onSend({ text: s });
    setT("");
  }
  function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); send();
    }
  }
  return (
    <div className="mt-3 flex gap-2">
      <textarea
        className="flex-1 rounded border p-2"
        rows={2}
        placeholder="Escribe un mensaje…"
        value={t}
        onChange={(e) => setT(e.target.value)}
        onKeyDown={onKey}
      />
      <button onClick={send} className="rounded bg-blue-600 px-3 py-2 text-white">
        Enviar
      </button>
    </div>
  );
}

export default function Rooms() {
  const { user } = useAuth();
  const [groups, setGroups] = useLocalGroups();
  const [pins, togglePin] = usePinned();
  const [filter, setFilter] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [activeId, setActiveId] = useState(groups[0]?.id || null);
  const active = useMemo(() => groups.find((g) => g.id === activeId) || null, [groups, activeId]);

  const [msgs, setMsgs] = useState(active ? loadHist(active.id) : []);
  const scroller = useRef(null);

  // autoscroll
  useEffect(() => {
    if (!scroller.current) return;
    scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [msgs.length, activeId]);

  // cuando cambia de grupo, cargamos su histórico local
  useEffect(() => {
    if (!active) { setMsgs([]); return; }
    setMsgs(loadHist(active.id));
  }, [active?.id]);

  // socket listeners por room seleccionada
  useEffect(() => {
    if (!active) return;
    const s = getSocket();
    s.emit("chat:join", active.id);

    const onNew = (m) => {
      if (m?.room_id !== active.id) return;
      setMsgs((prev) => {
        const next = [...prev, m].slice(-200);
        saveHist(active.id, next);
        return next;
      });
    };
    s.on("chat:message", onNew);

    return () => {
      s.off("chat:message", onNew);
      s.emit("chat:leave", { roomId: active.id });
    };
  }, [active?.id]);

  function handleSend({ text }) {
    if (!active) return;
    const s = getSocket();
    s.emit("chat:send", { room: active.id, text });
    // eco
    const mine = {
      id: Date.now(),
      room_id: active.id,
      text,
      from: { id: user?.id, nombre: user?.nombre || user?.username },
      created_at: new Date().toISOString(),
    };
    setMsgs((prev) => {
      const next = [...prev, mine].slice(-200);
      saveHist(active.id, next);
      return next;
    });
  }

  function createGroup(payload) {
    // payload: { name, members: [{id,name}] }
    const g = { id: `grp-${Date.now()}`, name: payload.name, members: payload.members || [] };
    const next = [g, ...groups];
    setGroups(next);
    setActiveId(g.id);
    setOpenModal(false);
  }

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = [...groups].sort((a, b) => {
      const ap = pins.includes(a.id) ? 0 : 1;
      const bp = pins.includes(b.id) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return a.name.localeCompare(b.name);
    });
    if (!q) return list;
    return list.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, pins, filter]);

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-lg font-semibold">Grupos</div>
        <button className="rounded bg-blue-600 px-3 py-2 text-white" onClick={() => setOpenModal(true)}>
          + Nuevo chat
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[18rem_1fr]">
        {/* columna izquierda: lista de grupos */}
        <div>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="mb-2 w-full rounded border p-2"
            placeholder="Buscar grupo…"
          />
          <div className="space-y-2">
            {filtered.map((g) => (
              <div key={g.id}
                   className={`flex items-center justify-between rounded border px-2 py-2 ${activeId === g.id ? "bg-blue-50 border-blue-300" : "bg-white"}`}>
                <button onClick={() => setActiveId(g.id)} className="truncate text-left">
                  {g.name}
                </button>
                <button title={pins.includes(g.id) ? "Desfijar" : "Fijar"} onClick={() => togglePin(g.id)}>★</button>
              </div>
            ))}
            {!filtered.length && <div className="text-sm text-gray-400">No hay grupos. Crea uno nuevo.</div>}
          </div>
        </div>

        {/* columna derecha: room activa */}
        <div className="rounded border bg-white p-3">
          {active ? (
            <>
              <div className="mb-2 text-sm text-gray-600">
                Grupo: <b>{active.name}</b>
              </div>
              {!!active.members?.length && (
                <div className="mb-3 text-xs text-gray-500">
                  Participantes: {active.members.map(m => m.name || m.id).join(", ")}
                </div>
              )}

              <div ref={scroller} className="h-[48vh] overflow-y-auto rounded border p-3">
                {msgs.map((m) => (
                  <div key={(m.id || "") + (m.created_at || "")} className="mb-3">
                    <div className="text-xs text-gray-500">
                      {(m.from?.nombre || m.from?.id || "Usuario")} · {new Date(m.created_at).toLocaleTimeString()}
                    </div>
                    <div>{m.text}</div>
                  </div>
                ))}
                {!msgs.length && <div className="text-gray-400">No hay mensajes.</div>}
              </div>

              <Composer onSend={handleSend} />
            </>
          ) : (
            <div className="text-gray-500">Selecciona un grupo de la lista o crea uno nuevo con “+ Nuevo chat”.</div>
          )}
        </div>
      </div>

      {openModal && (
        <NewChatModal
          open={openModal}
          onClose={() => setOpenModal(false)}
          onCreated={createGroup}
          onlineList={[]} // si quieres pasar conectados reales, inyecta aquí
        />
      )}
    </div>
  );
}
