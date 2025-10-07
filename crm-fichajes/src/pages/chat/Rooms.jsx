import { useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPost } from "../../services/api";

// Efecto parpadeo para el icono del contador de mensajes no leídos
const blinkStyle = `
@keyframes blink-red {
  0% { background: red; }
  50% { background: #ff9999; }
  100% { background: red; }
}
.msg-unread-blink {
  animation: blink-red 1s infinite;
  color: white;
  border-radius: 50%;
  display: inline-block;
  padding: 0 6px;
  font-weight: bold;
  margin-left: 6px;
}
`;

if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = blinkStyle;
  document.head.appendChild(style);
}

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

  const togglePin = id => setPins(old => (old.includes(id) ? old.filter(x => x !== id) : [...old, id]));
  const sorter = (a, b) => {
    const pa = pins.includes(a.id) ? 0 : 1, pb = pins.includes(b.id) ? 0 : 1;
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

  const askDelete = room => {
    const doDelete = async () => {
      await apiDelete(`/chat/rooms/${room.id}`);
      await refresh();
      if (selected?.id === room.id) onSelect?.({ id: "general", tipo: "general", nombre: "General" });
    };
    onAskDelete?.(room.id, doDelete);
  };

  return (
    <div>
      <h3>General</h3>
      <RoomItem
        key="general"
        room={{ id: "general", nombre: "General" }}
        active={selected?.id === "general"}
        unread={getUnread?.("general") || 0}
        onClick={() => onSelect?.({ id: "general", tipo: "general", nombre: "General" })}
        pinned={pins.includes("general")}
        onTogglePin={() => togglePin("general")}
      />
      <h4>Grupos</h4>
      {gruposSorted.map(r => (
        <RoomItem
          key={r.id}
          room={r}
          active={selected?.id === r.id}
          unread={getUnread?.(r.id) || 0}
          onClick={() => onSelect?.({ id: r.id, tipo: "grupos", nombre: r.nombre })}
          onInvite={() => onInvite?.(r.id)}
          onDelete={() => askDelete(r)}
          pinned={pins.includes(r.id)}
          onTogglePin={() => togglePin(r.id)}
        />
      ))}
      {!gruposSorted.length && <div>Sin grupos</div>}
      <h4>Privados</h4>
      {privadosSorted.map(r => (
        <RoomItem
          key={r.id}
          room={r}
          active={selected?.id === r.id}
          unread={getUnread?.(r.id) || 0}
          onClick={() => onSelect?.({ id: r.id, tipo: "privado", nombre: r.nombre })}
          pinned={pins.includes(r.id)}
          onTogglePin={() => togglePin(r.id)}
        />
      ))}
      {!privadosSorted.length && <div>Sin privados</div>}
      {creating && <CreateGroupModal onClose={() => setCreating(false)} onCreate={doCreate} />}
      <button onClick={() => setCreating(true)} style={{ marginTop: 14 }}>Nuevo grupo</button>
    </div>
  );
}

function RoomItem({ room, active, onClick, unread = 0, onInvite, onDelete, pinned, onTogglePin }) {
  return (
    <div
      style={{
        background: active ? "#e7e7ff" : "#fff",
        marginBottom: 6,
        padding: "6px 10px",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        cursor: "pointer",
        boxShadow: active ? "0 0 4px #7799ef" : "none"
      }}
      onClick={onClick}
    >
      <span style={{flexGrow: 1}}>{room.nombre}</span>
      {!!unread && <span className="msg-unread-blink">{unread}</span>}
      <button onClick={onTogglePin} style={{ marginLeft: 8 }}>{pinned ? "★" : "☆"}</button>
      {onInvite && <button onClick={e => { e.stopPropagation(); onInvite(); }} style={{ marginLeft: 8 }}>+</button>}
      {onDelete && <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{ marginLeft: 8, color: "red" }}>✖</button>}
    </div>
  );
}

// Modal crear grupo (nombre + selección usuarios)
function CreateGroupModal({ onClose, onCreate }) {
  const [nombre, setNombre] = useState("");
  const [users, setUsers] = useState([]);
  const [sel, setSel] = useState({});
  useEffect(() => {
    (async () => {
      try { setUsers(await apiGet("/chat/users")); } catch {}
    })();
  }, []);
  const toggle = id => setSel(s => ({ ...s, [id]: !s[id] }));
  const submit = () =>
    onCreate?.({
      nombre,
      members: Object.entries(sel).filter(([_, v]) => v).map(([k]) => k),
    });

  return (
    <div className="modal">
      <h4>Nuevo grupo</h4>
      <input
        type="text"
        value={nombre}
        onChange={e => setNombre(e.target.value)}
        placeholder="Nombre"
        style={{ marginBottom: 10 }}
      />
      <div>
        <strong>Seleccionar participantes:</strong>
        {users.map(u => (
          <div key={u.id}>
            <input type="checkbox" checked={!!sel[u.id]} onChange={() => toggle(u.id)} />
            {u.nombre || u.email}
          </div>
        ))}
      </div>
      {!users.length && <div>Sin usuarios</div>}
      <button onClick={submit}>Crear grupo</button>
      <button onClick={onClose} style={{ marginLeft: 8 }}>Cancelar</button>
    </div>
  );
}
