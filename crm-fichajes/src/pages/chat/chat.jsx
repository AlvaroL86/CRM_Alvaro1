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
    <div className="relative">
      <button className="flex w-full items-center justify-between rounded px-2 py-1 text-sm hover:bg-gray-50"
        onClick={()=>setOpen(v=>!v)} onContextMenu={openMenu} title="Opciones">
        <span className="truncate">{u.nombre || u.id}</span>
        <span className="ml-2 inline-block h-2 w-2 rounded-full bg-green-500" />
      </button>
      {open && (
        <div className="absolute left-0 z-10 mt-1 w-44 rounded border bg-white text-sm shadow">
          <button className="block w-full px-2 py-1 text-left hover:bg-gray-50" onClick={()=>{setOpen(false); onOpenPrivate?.(u);}}>Privado</button>
          <button className="block w-full px-2 py-1 text-left hover:bg-gray-50" onClick={()=>{setOpen(false); onInviteToGroup?.(u);}}>Invitar a grupo</button>
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
    s.on("presence:list", onPresence);

    if (user?.id) s.emit("auth:hello", { id: user.id, nombre: user.nombre || user.username || String(user.id) });

    const onMsg = (msg) => notifyOnMessage(msg);
    s.on("chat:message", onMsg);

    return () => {
      s.off("presence:list", onPresence);
      s.off("chat:message", onMsg);
    };
  }, [ready, isAuthenticated, user?.id, notifyOnMessage]);

  const filteredOnline = useMemo(() => (online || []).filter(u => u.id && u.id !== user?.id), [online, user?.id]);

  const openPriv = async (u) => {
    try {
      const r = await apiPost(`/chat/rooms/private`, { userId: u.id });
      setSelected({ id: r.id, tipo: 'privado', nombre: r.nombre });
      resetUnread(r.id);
    } catch (e) { alert(e.message || "No se pudo abrir el privado"); }
  };

  const inviteFromConnected = (u) => {
    setPreselectUser(u.id);
    if (selected.tipo === 'grupos') setInviteRoomId(selected.id);
    else alert("Abre un grupo y vuelve a invitar.");
  };

  const onSelectRoom = (r) => { setSelected(r); resetUnread(r.id); };

  const askDelete = (_roomId, doDelete) => setConfirmDelete({ open: true, doDelete });
  const onConfirmDelete = async () => { try { await confirmDelete.doDelete?.(); } finally { setConfirmDelete({ open: false, doDelete: null }); } };

  return (
    <div className="p-4 h-[calc(100vh-90px)]">
      <div className="grid h-full grid-cols-[260px_1fr_260px] gap-3">
        <aside className="flex min-h-0 flex-col rounded border bg-white">
          <div className="border-b px-3 py-2 text-sm font-semibold">Conectados</div>
          <div className="max-h-48 overflow-y-auto p-2">
            {!filteredOnline.length && <div className="py-6 text-center text-xs text-gray-400">Nadie conectado.</div>}
            <ul className="space-y-1">
              {filteredOnline.map(u => (
                <li key={u.id}>
                  <ConnectedItem u={u} onOpenPrivate={openPriv} onInviteToGroup={inviteFromConnected} />
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t" />
          <div className="flex-1 min-h-0 overflow-y-auto p-2">
            <Rooms
              selected={selected}
              onSelect={onSelectRoom}
              onInvite={(roomId)=>{ setInviteRoomId(roomId); setPreselectUser(null); }}
              onAskDelete={askDelete}
              getUnread={(roomId)=>unreadCount(roomId)}
            />
          </div>
        </aside>

        <section className="min-w-0 rounded border bg-white">
          <ChatThread
            room={selected.id === "general" ? "general" : selected.id}
            title={selected.nombre || "Chat"}
            activeRoomId={selected.id}
            onSeen={() => resetUnread(selected.id)}
          />
        </section>

        <aside className="rounded border bg-white">
          <div className="border-b px-3 py-2 text-sm font-semibold">Detalle</div>
          {selected.tipo === 'grupos'
            ? <ChatMembersPanel roomId={selected.id} />
            : (
              <div className="p-3 text-sm">
                <div className="mb-2">
                  <div className="text-xs text-gray-500">Sala</div>
                  <div className="font-medium">{selected.nombre}</div>
                </div>
                <div className="text-xs text-gray-500">Selecciona un grupo para ver y gestionar miembros.</div>
              </div>
            )}
        </aside>
      </div>

      {inviteRoomId && (
        <InviteToGroupModal
          roomId={inviteRoomId}
          preselectUserId={preselectUser}
          onClose={()=>{ setInviteRoomId(null); setPreselectUser(null); }}
        />
      )}
      {confirmDelete.open && (
        <ConfirmDeleteModal title="¿Eliminar grupo?" onCancel={()=>setConfirmDelete({ open:false, doDelete:null })} onConfirm={onConfirmDelete} />
      )}
    </div>
  );
}
