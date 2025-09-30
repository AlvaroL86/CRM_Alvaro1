// src/pages/chat/chat.jsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getSocket } from "../../socket";

// Vistas de chat
import ChatGeneral from "./ChatGeneral";
import ChatPrivate from "./ChatPrivate";
import ChatSaved from "./ChatSaved";
import Rooms from "./Rooms";

// Panel de conectados (tu componente)
import ConnectedPanel from "./ConnectedPanel";

// ===== Claves de localStorage =====
const LS_HIDE_PRESENCE = "chat_hide_presence";

// Tabs disponibles
const TABS = [
  { id: "general", label: "General" },
  { id: "guardados", label: "Guardados" },
  { id: "privados", label: "Privados" },
  { id: "grupos", label: "Grupos" },
];

export default function Chat() {
  const { user, ready, isAuthenticated } = useAuth();

  // Tab activa
  const [tab, setTab] = useState("general");

  // Mostrar/ocultar panel izquierda (persistente)
  const [showLeft, setShowLeft] = useState(() => {
    try {
      return localStorage.getItem(LS_HIDE_PRESENCE) !== "true";
    } catch {
      return true;
    }
  });

  // Lista de conectados
  const [onlineRaw, setOnlineRaw] = useState([]);

  // No leídos en privados (si tu backend emite eventos de unread)
  const [unreadPriv, setUnreadPriv] = useState(0);

  // Excluirme a mí de la lista y orden alfabético
  const online = useMemo(() => {
    const me = user?.id;
    const cleaned = (onlineRaw || []).filter((u) => u?.id && u.id !== me);
    cleaned.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
    return cleaned;
  }, [onlineRaw, user?.id]);

  // Toggle + persistencia
  const toggleLeft = () => {
    const next = !showLeft;
    setShowLeft(next);
    try {
      localStorage.setItem(LS_HIDE_PRESENCE, (!next).toString());
    } catch {}
  };

  // Socket: presencia y contadores
  useEffect(() => {
    if (!ready || !isAuthenticated) return;
    const s = getSocket();

    // Me anuncio (por si entro directo a /chat)
    if (user?.id) {
      s.emit("auth:hello", {
        id: user.id,
        nombre: user?.nombre || user?.username || String(user.id),
      });
    }

    // Protocolo NUEVO
    const onPresence = (list) => {
      setOnlineRaw(Array.isArray(list) ? list : []);
    };
    s.on("presence:list", onPresence);

    // Compat (ANTIGUO: { userId, name })
    const onCompatPresence = (oldList) => {
      const mapped = (oldList || []).map((x) => ({
        id: x.userId,
        nombre: x.name,
      }));
      setOnlineRaw(mapped);
    };
    s.on("online-users", onCompatPresence);

    // No leídos privados (si tu server lo emite)
    const onUnread = (n) => {
      const val = Number(n || 0);
      setUnreadPriv(Number.isFinite(val) && val >= 0 ? val : 0);
    };
    s.on("private:unread", onUnread);
    s.on("pm:unread", onUnread); // compat

    return () => {
      s.off("presence:list", onPresence);
      s.off("online-users", onCompatPresence);
      s.off("private:unread", onUnread);
      s.off("pm:unread", onUnread);
    };
  }, [ready, isAuthenticated, user?.id]);

  // Badge para la pestaña "Privados"
  const tabLabel = (t) => {
    if (t.id !== "privados") return t.label;
    return unreadPriv > 0 ? `${t.label} (${unreadPriv})` : t.label;
  };

  return (
    <div className="p-4">
      {/* Cabecera: tabs + estado conectados (solo contador) */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded px-3 py-1 text-sm ${
                tab === t.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {tabLabel(t)}
            </button>
          ))}
        </nav>

        <div className="text-xs text-gray-500">
          Conectados ({online.length})
        </div>
      </div>

      {/* Layout con panel colapsable real */}
      <div
        className={`grid gap-4 ${
          showLeft ? "grid-cols-[260px_1fr]" : "grid-cols-1"
        }`}
      >
        {/* Panel izquierda */}
        {showLeft && (
          <ConnectedPanel
            online={online}
            onHide={toggleLeft}
            meId={user?.id}
          />
        )}

        {/* Contenido principal */}
        <section className="min-w-0 rounded border bg-white">
          {/* Botón para volver a mostrar el panel (cuando está oculto) */}
          {!showLeft && (
            <div className="flex items-center justify-end p-2">
              <button
                onClick={toggleLeft}
                className="text-xs text-blue-600 hover:underline"
              >
                Mostrar panel
              </button>
            </div>
          )}

          {/* Render de la pestaña actual */}
          {tab === "general" && (
            <ChatGeneral
              showLeft={showLeft}
              onToggleLeft={toggleLeft}
              // pasa lo que necesites a tu ChatGeneral (ej: online si lo usas)
              online={online}
            />
          )}

          {tab === "guardados" && (
            <ChatSaved
              // si en guardados quieres usar conectados o pines, pásalos aquí
              online={online}
            />
          )}

          {tab === "privados" && (
            <ChatPrivate
              online={online}
              meId={user?.id}
              // cuando abras/lean privados puedes poner a cero:
              onClearUnread={() => setUnreadPriv(0)}
            />
          )}

          {tab === "grupos" && (
            <Rooms
              online={online}
              meId={user?.id}
            />
          )}
        </section>
      </div>
    </div>
  );
}
