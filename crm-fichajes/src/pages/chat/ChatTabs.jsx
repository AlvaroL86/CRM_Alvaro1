import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getSocket } from "../../socket";
import Rooms from "./Rooms";
import ChatThread from "./ChatThread";
import ChatMembersPanel from "./ChatMembersPanel";
import ConnectedPanel from "./ConnectedPanel";
import useUnread from "./useUnread";
import { apiPost } from "../../services/api";

export default function ChatTabs() {
  const { user, ready, isAuthenticated } = useAuth();

  const [online, setOnline] = useState([]);
  const [selected, setSelected] = useState({ id: "general", tipo: "general", nombre: "General" });
  const [showRight, setShowRight] = useState(() => localStorage.getItem("chat_hide_right") !== "true");

  // 🔔 Unread + notificaciones (aquí faltaba)
  const { unreadCount, resetUnread, notifyOnMessage } = useUnread(selected.id);

  // menú contextual
  const [menu, setMenu] = useState(null); // { user, x, y }
  const menuRef = useRef(null);

  useEffect(() => {
    if (!ready || !isAuthenticated) return;
    const s = getSocket();

    const onPresence = (list) => setOnline(Array.isArray(list) ? list : []);
    const onMsg = (msg) => notifyOnMessage(msg);

    s.on("presence:list", onPresence);
    s.on("chat:message", onMsg);

    if (user?.id)
      s.emit("auth:hello", { id: user.id, nombre: user.nombre || user.username || String(user.id) });

    return () => {
      s.off("presence:list", onPresence);
      s.off("chat:message", onMsg);
    };
  }, [ready, isAuthenticated, user?.id, notifyOnMessage]);

  useEffect(() => {
    const close = (e) => {
      if (!menuRef.current || menuRef.current.contains(e.target)) return;
      setMenu(null);
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const filteredOnline = useMemo(
    () => (online || []).filter((u) => u.id && u.id !== user?.id),
    [online, user?.id]
  );

  const openPrivate = async (u) => {
    try {
      // Si usas /chat/rooms/private en backend, usa eso:
      const r = await apiPost("/chat/rooms/private", { userId: u.id });
      setSelected({ id: r.id, tipo: "privado", nombre: r.nombre });
      setMenu(null);
      resetUnread(r.id);
    } catch (e) {
      console.warn("privado:", e.message);
    }
  };

  const toggleRight = () => {
    const next = !showRight;
    setShowRight(next);
    localStorage.setItem("chat_hide_right", (!next).toString());
  };

  const onSelect = (room) => {
    setSelected(room);
    if (room?.id) resetUnread(room.id);
  };

  const isGroup =
    !!selected?.id && selected.id !== "general" && selected?.tipo !== "privado";

  return (
    <div className="p-4 h-[calc(100vh-110px)]">
      <div className={`grid h-full ${showRight ? "grid-cols-[260px_1fr_240px]" : "grid-cols-[260px_1fr]"} gap-3`}>
        {/* Izquierda */}
        <div className="flex min-h-0 flex-col gap-3">
          <ConnectedPanel
            meId={user?.id}
            list={filteredOnline}
            onOpenMenu={(u, el) => {
              const rect = el.getBoundingClientRect();
              setMenu({ user: u, x: rect.right + 6, y: rect.top });
            }}
          />
          <Rooms
            selected={selected}
            onSelect={onSelect}
            getUnread={(roomId) => unreadCount(roomId)}
          />
        </div>

        {/* Centro */}
        <section className="min-w-0 rounded border bg-white">
          <ChatThread
            room={selected.id === "general" ? "general" : selected.id}
            title={selected.nombre || "Chat"}
            activeRoomId={selected.id}
            roomType={selected?.tipo === "privado" ? "privado" : "grupos"}  // ⬅️ para sonidos
            onSeen={() => selected?.id && resetUnread(selected.id)}
          />
        </section>

        {/* Derecha */}
        {showRight && (
          <aside className="min-w-0 rounded border bg-white p-4">
            <strong>Detalle</strong>
            {isGroup ? (
              <ChatMembersPanel roomId={selected.id} />
            ) : (
              <div>
                <div>Sala: {selected?.nombre}</div>
                <div>Selecciona un grupo para ver y gestionar miembros.</div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Menú contextual conectados */}
      {menu && (
        <div
          ref={menuRef}
          className="fixed z-50 w-48 rounded border bg-white shadow"
          style={{ top: menu.y, left: menu.x }}
        >
          <div className="border-b px-3 py-2 text-sm font-medium">
            {menu.user?.nombre || menu.user?.id}
          </div>
          <button
            className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
            onClick={() => openPrivate(menu.user)}
          >
            Abrir chat privado
          </button>
          <a className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100" href={`mailto:`} onClick={() => setMenu(null)}>Enviar email</a>
          <a className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100" href={`tel:`} onClick={() => setMenu(null)}>Llamar</a>
        </div>
      )}

      {!showRight && (
        <button
          className="fixed bottom-4 right-4 rounded bg-blue-600 px-3 py-2 text-sm text-white shadow"
          onClick={toggleRight}
        >
          Mostrar detalle
        </button>
      )}
    </div>
  );
}
