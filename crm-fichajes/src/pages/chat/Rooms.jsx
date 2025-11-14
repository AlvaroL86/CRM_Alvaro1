// src/pages/chat/Rooms.jsx
import { useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPost } from "../../services/api";
import { useSoundPrefs } from "../../context/SoundPrefsContext";

const PIN_KEY = "chat_pins_v2";

import { SoundPrefsProvider } from "../../context/SoundPrefsContext";

export default function Rooms({ selected, onSelect, onInvite, onAskDelete, getUnread }) {
  return (
    <SoundPrefsProvider>
      <RoomsContent selected={selected} onSelect={onSelect} onInvite={onInvite} onAskDelete={onAskDelete} getUnread={getUnread} />
    </SoundPrefsProvider>
  );
}

function RoomsContent({ selected, onSelect, onInvite, onAskDelete, getUnread }) {
  const [grupos, setGrupos] = useState([]);
  const [privados, setPrivados] = useState([]);
  const [creating, setCreating] = useState(false);
  const [pins, setPins] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PIN_KEY) || "[]"); } catch { return []; }
  });

  const { isRoomMuted, toggleRoomMute } = useSoundPrefs();

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

  const togglePin = (id) =>
    setPins((old) => (old.includes(id) ? old.filter((x) => x !== id) : [...old, id]));

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
      onSelect?.({ id: r.id, tipo: "grupos", nombre: r.nombre });
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
    <div>
      <h3 style={{ margin: "8px 0 6px" }}>General</h3>
      <RoomItem
        key="general"
        room={{ id: "general", nombre: "General" }}
        active={selected?.id === "general"}
        unread={getUnread?.("general") || 0}
        onClick={() => onSelect?.({ id: "general", tipo: "general", nombre: "General" })}
        pinned={pins.includes("general")}
        onTogglePin={() => togglePin("general")}
        muted={false}
        onToggleMute={() => {}}
      />

      <h4 style={{ margin: "10px 0 6px" }}>Grupos</h4>
      {gruposSorted.map((r) => (
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
          muted={isRoomMuted(r.id)}
          onToggleMute={() => toggleRoomMute(r.id)}
        />
      ))}
      {!gruposSorted.length && <div>Sin grupos</div>}

      <h4 style={{ margin: "10px 0 6px" }}>Privados</h4>
      {privadosSorted.map((r) => (
        <RoomItem
          key={r.id}
          room={r}
          active={selected?.id === r.id}
          unread={getUnread?.(r.id) || 0}
          onClick={() => onSelect?.({ id: r.id, tipo: "privado", nombre: r.nombre })}
          pinned={pins.includes(r.id)}
          onTogglePin={() => togglePin(r.id)}
          muted={isRoomMuted(r.id)}
          onToggleMute={() => toggleRoomMute(r.id)}
        />
      ))}
      {!privadosSorted.length && <div>Sin privados</div>}

      {creating && <CreateGroupModal onClose={() => setCreating(false)} onCreate={doCreate} />}
      <button onClick={() => setCreating(true)} style={{ marginTop: 14 }}>Nuevo grupo</button>
    </div>
  );
}

function RoomItem({ room, active, onClick, unread = 0, onInvite, onDelete, pinned, onTogglePin, muted, onToggleMute }) {
  return (
    <div
      style={{
        background: active ? "#eef4ff" : "#fff",
        marginBottom: 6,
        padding: "6px 10px",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        cursor: "pointer",
        boxShadow: active ? "0 0 4px #9cb6ff" : "none",
        gap: 8,
      }}
      onClick={onClick}
    >
      <span style={{ flexGrow: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {room.nombre}
      </span>

      {!!unread && (
        <span
          title={`${unread} sin leer`}
          style={{
            minWidth: 18, height: 18, lineHeight: "18px",
            background: "#ef4444", color: "white",
            borderRadius: 9, textAlign: "center", fontSize: 11,
          }}
        >
          {unread}
        </span>
      )}

      {/* Mute / Unmute */}
      <button
        type="button"
        title={muted ? "Activar sonido en esta sala" : "Silenciar esta sala"}
        onClick={(e) => { e.stopPropagation(); onToggleMute?.(); }}
        style={{ border: "none", background: "transparent", cursor: "pointer" }}
      >
        {muted ? "🔇" : "🔈"}
      </button>

      {/* Pin */}
      <button type="button" onClick={(e) => { e.stopPropagation(); onTogglePin?.(); }}
        title={pinned ? "Desanclar" : "Anclar"} style={{ border: "none", background: "transparent", cursor: "pointer" }}>
        {pinned ? "★" : "☆"}
      </button>

      {/* Invite/Delete sólo en grupos */}
      {onInvite && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onInvite(); }}
          title="Invitar usuarios" style={{ border: "none", background: "transparent", cursor: "pointer" }}>
          ＋
        </button>
      )}
      {onDelete && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Eliminar grupo" style={{ border: "none", background: "transparent", color: "red", cursor: "pointer" }}>
          ✖
        </button>
      )}
    </div>
  );
}

function CreateGroupModal({ onClose, onCreate }) {
  const [nombre, setNombre] = useState("");
  const [users, setUsers] = useState([]);
  const [sel, setSel] = useState(new Map());
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try { setUsers(await apiGet("/chat/users")); }
      catch (e) { setErr(e.message || "No se pudieron cargar usuarios"); }
      finally { setLoading(false); }
    })();
  }, []);

  const toggle = (u) => {
    const next = new Map(sel);
    next.has(u.id) ? next.delete(u.id) : next.set(u.id, u);
    setSel(next);
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter(u => (`${u.nombre || ""} ${u.email || ""} ${u.id}`).toLowerCase().includes(s));
  }, [q, users]);

  const submit = () =>
    nombre.trim() &&
    onCreate?.({ nombre: nombre.trim(), members: Array.from(sel.keys()) });

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{ width: "100%", maxWidth: 520, background: "#fff", borderRadius: 8, boxShadow: "0 10px 30px rgba(0,0,0,.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 600 }}>Crear grupo</div>
          <button type="button" onClick={onClose} title="Cerrar" style={{ border: "none", background: "transparent" }}>✕</button>
        </div>

        <div style={{ padding: 16 }}>
          <label style={{ display: "block", fontSize: 12, color: "#666" }}>Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="p. ej. Soporte, Ventas..."
            style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, marginTop: 4 }}
          />

          <div style={{ height: 10 }} />

          <label style={{ display: "block", fontSize: 12, color: "#666" }}>Seleccionar participantes</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o email…"
            style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, marginTop: 4 }}
          />

          {sel.size > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {Array.from(sel.values()).map(u => (
                <span key={u.id} style={{ background: "#eef4ff", color: "#245", borderRadius: 999, padding: "4px 8px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {u.nombre || u.email || u.id}
                  <button type="button" onClick={() => toggle(u)} title="Quitar" style={{ color: "#245", border: "none", background: "transparent" }}>×</button>
                </span>
              ))}
            </div>
          )}

          <div style={{ height: 8 }} />

          <div style={{ border: "1px solid #eee", borderRadius: 6, maxHeight: 240, overflow: "auto" }}>
            {loading ? (
              <div style={{ padding: 12, color: "#666", fontSize: 14 }}>Cargando…</div>
            ) : err ? (
              <div style={{ padding: 12, color: "#b00", fontSize: 14 }}>{err}</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 12, color: "#666", fontSize: 14 }}>Sin resultados</div>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {filtered.map(u => {
                  const checked = sel.has(u.id);
                  const label = u.nombre || u.email || u.id;
                  return (
                    <li key={u.id}
                        onClick={() => toggle(u)}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", cursor: "pointer", borderBottom: "1px solid #f2f2f2", background: checked ? "#f7fbff" : "#fff" }}>
                      <input type="checkbox" readOnly checked={checked} />
                      <span style={{ fontSize: 14 }}>{label}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div style={{ padding: 12, borderTop: "1px solid #eee", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose} style={{ border: "1px solid #ddd", background: "#fff", borderRadius: 6, padding: "8px 12px" }}>Cancelar</button>
          <button type="button" onClick={submit} disabled={!nombre.trim()} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, padding: "8px 12px", opacity: nombre.trim() ? 1 : .6 }}>
            Crear grupo
          </button>
        </div>
      </div>
    </div>
  );
}
