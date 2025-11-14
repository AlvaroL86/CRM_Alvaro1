// src/pages/chat/Chat.jsx
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

function ConnectedItem({ u, onOpenPrivate, onInviteToGroup }) {
  const [open, setOpen] = useState(false);
  const openMenu = (e) => { e.preventDefault?.(); setOpen(true); };
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "4px 8px", borderBottom: "1px solid #f0f0f0", position: "relative",
      }}
      onContextMenu={openMenu}
    >
      <span>{u.nombre || u.user_id}</span>
      {open && (
        <div
          style={{
            position: "absolute", top: 24, left: 8, background: "#fff",
            border: "1px solid #ddd", boxShadow: "0 0 8px #bbb", padding: 6, zIndex: 10,
          }}
        >
          <button type="button" onClick={() => { setOpen(false); onOpenPrivate(u); }}>Abrir privado</button>
          <button type="button" onClick={() => { setOpen(false); onInviteToGroup(u); }}>Invitar a grupo</button>
          <button type="button" onClick={() => setOpen(false)} style={{ color: "grey" }}>Cerrar</button>
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

    const onPresence = (list) => setOnline(Array.isArray(list) ? list : []);
    const onMsg = (msg) => notifyOnMessage(msg);

    s.on("presence:list", onPresence);
    s.on("chat:message", onMsg);

    if (user?.id) {
      s.emit("auth:hello", { id: user.id, nombre: user.nombre || user.username || String(user.id) });
    }

    return () => {
      s.off("presence:list", onPresence);
      s.off("chat:message", onMsg);
    };
  }, [ready, isAuthenticated, user?.id, notifyOnMessage]);

  const filteredOnline = useMemo(
    () => (online || []).filter((u) => u.id && u.id !== user?.id),
    [online, user?.id]
  );

  const openPriv = async (u) => {
    try {
      const r = await apiPost(`/chat/rooms/private`, { userId: u.id });
      setSelected({ id: r.id, tipo: "privado", nombre: r.nombre });
      resetUnread(r.id);
    } catch (e) { alert(e.message || "No se pudo abrir el privado"); }
  };

  const inviteFromConnected = (u) => {
    setPreselectUser(u.id);
    if (selected?.id && selected?.tipo !== "privado" && selected?.id !== "general") {
      setInviteRoomId(selected.id);
    } else {
      alert("Abre un grupo y vuelve a invitar.");
    }
  };

  const onSelectRoom = (r) => {
    setSelected(r);
    if (r?.id) resetUnread(r.id);
  };

  const askDelete = (_roomId, doDelete) => setConfirmDelete({ open: true, doDelete });
  const onConfirmDelete = async () => {
    try { await confirmDelete.doDelete?.(); }
    finally { setConfirmDelete({ open: false, doDelete: null }); }
  };

  const isGroup = !!selected?.id && selected?.id !== "general" && selected?.tipo !== "privado";

  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)" }}>
      {/* Izquierda */}
      <div style={{ minWidth: 260, borderRight: "1px solid #eaeaea", padding: "0 16px", overflowY: "auto" }}>
        <div>
          <strong>Conectados</strong>
          {!filteredOnline.length && <div>Nadie conectado.</div>}
          {filteredOnline.map((u) => (
            <ConnectedItem key={u.id} u={u} onOpenPrivate={openPriv} onInviteToGroup={inviteFromConnected} />
          ))}
        </div>

        <Rooms
          selected={selected}
          onSelect={onSelectRoom}
          onInvite={(roomId) => { setInviteRoomId(roomId); setPreselectUser(null); }}
          onAskDelete={askDelete}
          getUnread={(roomId) => unreadCount(roomId)}
        />
      </div>

      {/* Centro */}
      <div style={{ flex: 2, padding: "0 20px" }}>
        <ChatThread
          room={selected.id === "general" ? "general" : selected.id}
          title={selected.nombre || "Chat"}
          activeRoomId={selected.id}
          onSeen={() => selected?.id && resetUnread(selected.id)}
          roomType={selected?.tipo}
        />
      </div>

      {/* Derecha */}
      <div style={{ minWidth: 250, borderLeft: "1px solid #eaeaea", padding: "0 16px", overflowY: "auto" }}>
        <strong>Detalle</strong>
        {isGroup ? (
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
