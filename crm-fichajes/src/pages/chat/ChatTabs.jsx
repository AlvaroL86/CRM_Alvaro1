import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getSocket } from "../../socket";
import ConnectedPanel from "./ConnectedPanel";
import Rooms from "./Rooms";
import ChatThread from "./ChatThread";
import { apiPost } from "../../services/api";

export default function ChatTabs() {
  const { user, ready, isAuthenticated } = useAuth();

  const [online, setOnline] = useState([]);
  const [selected, setSelected] = useState({ id: "general", tipo: "general", nombre: "General" });
  const [showRight, setShowRight] = useState(() => localStorage.getItem('chat_hide_right') !== 'true');

  // menú contextual
  const [menu, setMenu] = useState(null); // { user, x, y }
  const menuRef = useRef(null);

  useEffect(() => {
    if (!ready || !isAuthenticated) return;
    const s = getSocket();

    const onPresence = (list) => setOnline(Array.isArray(list) ? list : []);
    s.on("presence:list", onPresence);
    if (user?.id) s.emit("auth:hello", { id: user.id, nombre: user.nombre || user.username || String(user.id) });

    return () => s.off("presence:list", onPresence);
  }, [ready, isAuthenticated, user?.id]);

  useEffect(() => {
    const close = (e) => {
      if (!menuRef.current || menuRef.current.contains(e.target)) return;
      setMenu(null);
    };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const openPrivate = async (u) => {
    try {
      const { id } = await apiPost('/chat/private', { toUserId: u.id });
      setSelected({ id, tipo: 'privado', nombre: u.nombre || 'Privado' });
      setMenu(null);
    } catch (e) { console.warn('privado:', e.message); }
  };

  const toggleRight = () => {
    const next = !showRight;
    setShowRight(next);
    localStorage.setItem('chat_hide_right', (!next).toString());
  };

  return (
    <div className="p-4 h-[calc(100vh-110px)]">
      <div className={`grid h-full ${showRight ? 'grid-cols-[260px_1fr_240px]' : 'grid-cols-[260px_1fr]'} gap-3`}>
        {/* Izquierda */}
        <div className="flex min-h-0 flex-col gap-3">
          <ConnectedPanel
            meId={user?.id}
            list={online}
            onOpenMenu={(u, el) => {
              const rect = el.getBoundingClientRect();
              setMenu({ user: u, x: rect.right + 6, y: rect.top });
            }}
          />
          <Rooms
            selected={selected}
            onSelect={(room) => setSelected(room)}
          />
        </div>

        {/* Centro */}
        <section className="min-w-0 rounded border bg-white">
          <ChatThread
            room={selected.id === 'general' ? 'general' : selected.id}
            title={selected.nombre || 'Chat'}
          />
        </section>

        {/* Derecha */}
        {showRight && (
          <aside className="rounded border bg-white">
            <div className="flex items-center justify-between border-b px-3 py-2 text-sm">
              <div className="font-semibold">Detalle</div>
              <button className="text-blue-600 hover:underline" onClick={toggleRight}>Ocultar</button>
            </div>
            <div className="p-3 text-sm">
              <div className="mb-2">
                <div className="text-xs text-gray-500">Sala</div>
                <div className="font-medium">{selected.nombre}</div>
              </div>
              <div className="text-xs text-gray-500">
                Participantes del grupo aparecerán aquí cuando el endpoint de miembros esté listo.
              </div>
            </div>
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
          <div className="border-b px-3 py-2 text-sm font-medium">{menu.user?.nombre || menu.user?.id}</div>
          <button className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100" onClick={() => openPrivate(menu.user)}>Abrir chat privado</button>
          <button className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100" onClick={() => { console.log('Invitar a grupo'); setMenu(null); }}>Invitar a grupo</button>
          <a className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100" href={`mailto:`} onClick={()=>setMenu(null)}>Enviar email</a>
          <a className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100" href={`tel:`} onClick={()=>setMenu(null)}>Llamar</a>
        </div>
      )}

      {!showRight && (
        <button className="fixed bottom-4 right-4 rounded bg-blue-600 px-3 py-2 text-sm text-white shadow" onClick={toggleRight}>
          Mostrar detalle
        </button>
      )}
    </div>
  );
}
