// src/pages/Chat.jsx
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "../services/api";
import ChatTabs from "./chat/ChatTabs";
import NewChatModal from "./chat/NewChatModal";

const HIDE_KEY = "chat_hide_presence";

export default function Chat() {
  const [online, setOnline] = useState([]);   // [{id, nombre}]
  const [modalOpen, setModalOpen] = useState(false);
  const [hidePresence, setHidePresence] = useState(() => {
    try { return JSON.parse(localStorage.getItem(HIDE_KEY) || "false"); } catch { return false; }
  });

  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Presencia: poll cada 20s
  useEffect(() => {
    let timer;
    const load = async () => {
      try {
        const data = await apiGet("/chat/online");
        setOnline(
          (data || []).map((u) => ({
            id: u.id,
            nombre: u.nombre || u.username || "Usuario",
          }))
        );
      } catch {}
    };
    load();
    timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, []);

  // Guardar preferencia ocultar/mostrar panel
  useEffect(() => {
    localStorage.setItem(HIDE_KEY, JSON.stringify(hidePresence));
  }, [hidePresence]);

  // Crear sala desde modal
  const handleCreate = async ({ name, type, members }) => {
    const payload = {
      name,
      type: type === "private" ? "privado" : "grupo",
      members: members || [],
    };
    const { id } = await apiPost("/chat/rooms", payload); // { id }
    setModalOpen(false);
    navigate(payload.type === "privado" ? "/chat/private" : "/chat/groups");
    // si quieres: navigate(`/chat/groups?select=${id}`)
  };

  return (
    <div className="space-y-4">
      {/* Tabs con el botón + en el propio componente */}
      <ChatTabs onNewChat={() => setModalOpen(true)} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {/* Conectados (colapsable) */}
        {!hidePresence && (
          <aside className="h-96 overflow-auto rounded bg-white p-3 shadow md:col-span-1">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Conectados</h3>
              <button
                className="text-xs text-gray-500 hover:underline"
                onClick={() => setHidePresence(true)}
                title="Ocultar panel"
              >
                Ocultar
              </button>
            </div>

            {online.length === 0 && (
              <div className="text-sm text-gray-500">Nadie conectado</div>
            )}
            {online.map((u) => (
              <div key={u.id} className="text-sm capitalize text-gray-800">
                • {u.nombre}
              </div>
            ))}

            <div className="mt-4 rounded border p-2 text-xs text-gray-500">
              {pathname.startsWith("/chat/groups") &&
                "Selecciona un grupo o crea uno nuevo."}
              {pathname.startsWith("/chat/private") &&
                "Selecciona un chat privado o crea uno nuevo."}
              {pathname === "/chat/saved" &&
                "Selecciona una sala guardada para continuar."}
            </div>
          </aside>
        )}

        {/* Contenido de la pestaña */}
        <main className={hidePresence ? "md:col-span-4" : "md:col-span-3"}>
          {hidePresence && (
            <div className="mb-2">
              <button
                className="text-xs text-gray-500 hover:underline"
                onClick={() => setHidePresence(false)}
                title="Mostrar panel Conectados"
              >
                Mostrar Conectados
              </button>
            </div>
          )}
          <Outlet />
        </main>
      </div>

      <NewChatModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
