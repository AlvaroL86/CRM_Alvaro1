import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiGet, apiPatch, apiDelete } from "../../services/api";
import InviteToGroupModal from "./InviteToGroupModal";

// Icono simple (SVG) para eliminar
function TrashIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M9 3h6a1 1 0 0 1 1 1v1h5v2h-1v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7H3V5h5V4a1 1 0 0 1 1-1Zm2 3h2V5h-2v1ZM8 9h2v10H8V9Zm6 0h2v10h-2V9Z" />
    </svg>
  );
}

export default function ChatMembersPanel({ roomId }) {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Intenta plural y si falla usa singular (robusto a cambios en backend)
  const fetchMembers = async (rid) => {
    try {
      console.log("[members] GET /chat/rooms/%s/members", rid);
      return await apiGet(`/chat/rooms/${rid}/members`);
    } catch (e1) {
      console.warn("[members] plural failed, trying singular:", e1?.message || e1);
      return await apiGet(`/chat/room/${rid}/members`);
    }
  };

  const refresh = async () => {
    if (!roomId) { setList([]); setIsAdmin(false); return; }
    setLoading(true); setErr("");
    try {
      const resp = await fetchMembers(roomId);
      const rows = Array.isArray(resp) ? resp : [];
      setList(rows);
      setIsAdmin(rows.some(m => m.user_id === user?.id && m.rol === "admin"));
    } catch (e) {
      console.error("[members] error:", e);
      setErr(e?.message || "No se pudieron cargar los miembros.");
      setList([]); setIsAdmin(false);
    } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, [roomId, user?.id]);

  const setRole = async (uid, rol) => {
    try {
      await apiPatch(`/chat/rooms/${roomId}/members/${uid}`, { rol });
    } catch {
      await apiPatch(`/chat/room/${roomId}/members/${uid}`, { rol });
    } finally {
      refresh();
    }
  };

  const removeMember = async (uid) => {
    try {
      await apiDelete(`/chat/rooms/${roomId}/members/${uid}`);
    } catch {
      await apiDelete(`/chat/room/${roomId}/members/${uid}`);
    } finally {
      refresh();
    }
  };

  const onAskRemove = async (uid, label) => {
    const ok = window.confirm(`¿Eliminar a "${label}" del grupo?`);
    if (!ok) return;
    await removeMember(uid);
  };

  return (
    <div style={{ minWidth: 220 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h3 style={{ margin: 0 }}>Miembros</h3>
        {isAdmin && (
          <button onClick={() => setShowInvite(true)} style={{ fontSize: 14 }}>
            + Añadir
          </button>
        )}
      </div>

      {loading && <div>Cargando...</div>}
      {err && <div style={{ color: "crimson" }}>{err}</div>}

      {!loading && !err && (
        <div>
          {list.length > 0 ? (
            list.map((m) => {
              const label = m.nombre || m.email || m.user_id;
              const canEdit = isAdmin;
              const canDelete = isAdmin && m.rol !== "admin";

              return (
                <div
                  key={m.user_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 0",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  {/* Columna izquierda: nombre */}
                  <div style={{ flex: 1, minWidth: 0, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {m.rol === "admin" ? "👑 " : ""}
                    {label}
                  </div>

                  {/* Controles (derecha) */}
                  {canEdit && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <select
                        value={m.rol}
                        onChange={(e) => setRole(m.user_id, e.target.value)}
                        style={{ minWidth: 110 }}
                        title={m.user_id === user?.id ? "No puedes cambiar tu propio rol" : "Cambiar rol"}
                        disabled={m.user_id === user?.id}
                      >
                        <option value="admin">Admin</option>
                        <option value="miembro">Miembro</option>
                      </select>

                      {canDelete && (
                        <button
                          title="Eliminar miembro"
                          aria-label="Eliminar miembro"
                          onClick={() => onAskRemove(m.user_id, label)}
                          style={{
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            padding: 4,
                            color: "#999",
                            lineHeight: 0,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#d11")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "#999")}
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div>Sin miembros</div>
          )}
        </div>
      )}

      {showInvite && (
        <InviteToGroupModal
          roomId={roomId}
          preselectUserId={null}
          onClose={() => { setShowInvite(false); refresh(); }}
        />
      )}
    </div>
  );
}
