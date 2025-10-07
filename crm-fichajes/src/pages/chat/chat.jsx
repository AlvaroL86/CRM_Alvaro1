import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getSocket } from "../../socket";
import ChatThread from "./ChatThread";
import Rooms from "./Rooms";
import useUnread from "./useUnread";
import InviteToGroupModal from "./InviteToGroupModal";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import ChatMembersPanel from "./ChatMembersPanel";
import { apiPost } from "../../services/api";

// Componente usuarios conectados
function ConnectedItem({ u, onOpenPrivate, onInviteToGroup }) {
  const [open, setOpen] = useState(false);
  const openMenu = e => { e.preventDefault?.(); setOpen(true); };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 8px",
        borderBottom: "1px solid #f0f0f0"
      }}
      onContextMenu={openMenu}
    >
      <span>{u.nombre || u.user_id}</span>
      {open && (
        <div style={{
          position: "absolute",
          background: "#fff",
          border: "1px solid #ddd",
          boxShadow: "0 0 8px #bbb",
          padding: 6,
          zIndex: 10
        }}>
          <button onClick={() => { setOpen(false); onOpenPrivate(u); }}>Abrir privado</button>
          <button onClick={() => { setOpen(false); onInviteToGroup(u); }}>Invitar a grupo</button>
          <button onClick={() => setOpen(false)} style={{ color: "grey" }}>Cerrar</button>
        </div>
      )}
    </div>
  );
}

export default function Chat() {
  const { user, ready, isAuthenticated } = useAuth();
  const [online, setOnline] = useState([]);
  const [selected, setSelected] = useState({ id: "general", tipo: "general", nombre: "General" });
  const [inviteRoomId, setInviteRoomId] = useState(null);
  const [preselectUser, setPreselectUser] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, doDelete: null });
  const { unreadCount, resetUnread, notifyOnMessage } = useUnread(selected.id);

  useEffect(() => {
    if (!ready || !isAuthenticated) return;
    const s = getSocket();
    const onPresence = list => setOnline(Array.isArray(list) ? list : []);
    s.on("presence:list", onPresence);
    if (user?.id) s.emit("auth:hello", { id: user.id, nombre: user.nombre || user.username || String(user.id) });
    const onMsg = msg => notifyOnMessage(msg);
    s.on("chat:message", onMsg);
    return () => {
      s.off("presence:list", onPresence);
      s.off("chat:message", onMsg);
    };
  }, [ready, isAuthenticated, user?.id, notifyOnMessage]);

  const filteredOnline = useMemo(() =>
    (online || []).filter(u => u.id && u.id !== user?.id), [online, user?.id]);

  // Abrir chat privado desde contexto
  const openPriv = async u => {
    try {
      const r = await apiPost(`/chat/rooms/private`, { userId: u.id });
      setSelected({ id: r.id, tipo: 'privado', nombre: r.nombre });
      resetUnread(r.id);
    } catch (e) {
      alert(e.message || "No se pudo abrir el privado");
    }
  };

  // Invitar desde conectados
  const inviteFromConnected = u => {
    setPreselectUser(u.id);
    if (selected.tipo === 'grupos') setInviteRoomId(selected.id);
    else alert("Abre un grupo y vuelve a invitar.");
  };

  // Seleccionar sala (recibe objeto con tipo, se asegura en Rooms.jsx)
  const onSelectRoom = r => {
    console.log("Seleccion SELECTED:", r);
    setSelected(r);
    resetUnread(r.id);
  };

  const askDelete = (_roomId, doDelete) => setConfirmDelete({ open: true, doDelete });
  const onConfirmDelete = async () => {
    try { await confirmDelete.doDelete?.(); }
    finally { setConfirmDelete({ open: false, doDelete: null }); }
  };

  console.log("render selected global:", selected);

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* Panel izquierdo: salas y conectados */}
      <div style={{ minWidth: 260, borderRight: "1px solid #eaeaea", padding: "0 16px" }}>
        <div>
          <strong>Conectados</strong>
          {!filteredOnline.length && <div>Nadie conectado.</div>}
          {filteredOnline.map(u => (
            <ConnectedItem
              key={u.id}
              u={u}
              onOpenPrivate={openPriv}
              onInviteToGroup={inviteFromConnected}
            />
          ))}
        </div>
        <Rooms
          selected={selected}
          onSelect={onSelectRoom}
          onInvite={roomId => { setInviteRoomId(roomId); setPreselectUser(null); }}
          onAskDelete={askDelete}
          getUnread={roomId => unreadCount(roomId)}
        />
      </div>
      {/* Panel central: mensajes */}
      <div style={{ flex: 2, padding: "0 20px" }}>
        <ChatThread
          room={selected.id === "general" ? "general" : selected.id}
          title={selected.nombre || "Chat"}
          activeRoomId={selected.id}
          onSeen={() => resetUnread(selected.id)}
        />
      </div>
      {/* Panel derecho: detalle grupo/miembros */}
      <div style={{ minWidth: 250, borderLeft: "1px solid #eaeaea", padding: "0 16px" }}>
        <strong>Detalle</strong>
        {selected && selected.tipo === 'grupos' && selected.id ? (
          <ChatMembersPanel roomId={selected.id} />
        ) : (
          <div>
            <div>Sala: {selected?.nombre}</div>
            <div>Selecciona un grupo para ver y gestionar miembros.</div>
          </div>
        )}
      </div>
      {/* Modales */}
      {inviteRoomId && (
        <InviteToGroupModal
          roomId={inviteRoomId}
          preselectUserId={preselectUser}
          onClose={() => { setInviteRoomId(null); setPreselectUser(null); }}
        />
      )}
      {confirmDelete.open && (
        <ConfirmDeleteModal
          open={true}
          onCancel={() => setConfirmDelete({ open: false, doDelete: null })}
          onConfirm={onConfirmDelete}
        />
      )}
    </div>
  );
}
