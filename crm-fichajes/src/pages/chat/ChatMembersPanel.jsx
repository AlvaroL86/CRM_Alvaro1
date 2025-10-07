import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiGet, apiPatch, apiDelete } from "../../services/api";
import InviteToGroupModal from "./InviteToGroupModal";

export default function ChatMembersPanel({ roomId }) {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const refresh = async () => {
    try {
      const resp = await apiGet(`/chat/room/${roomId}/members`);
      setList(resp || []);
      // Solo muestra controles admins si el usuario es admin en esa sala
      setIsAdmin((resp || []).some(m => m.user_id === user?.id && m.rol === 'admin'));
    } catch (e) {
      setList([]);
      setIsAdmin(false);
    }
  };

  useEffect(() => { if (roomId) refresh(); }, [roomId]);

  const setRole = async (uid, rol) => {
    try {
      await apiPatch(`/chat/room/${roomId}/members/${uid}`, { rol });
      refresh();
    } catch (e) { alert(e.message || "No se pudo actualizar"); }
  };

  const removeMember = async uid => {
    try {
      await apiDelete(`/chat/room/${roomId}/members/${uid}`);
      refresh();
    } catch (e) { alert(e.message || "No se pudo eliminar miembro"); }
  };

  return (
    <div style={{ minWidth: 220 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3>Miembros</h3>
        {isAdmin && (
          <button onClick={() => setShowInvite(true)} style={{ fontSize: 14 }}>+ Añadir</button>
        )}
      </div>
      <div>
        {list.length > 0 ? (
          list.map(m => (
            <div key={m.user_id} style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
              borderBottom: "1px solid #eee",
              paddingBottom: 4,
              paddingTop: 4
            }}>
              <b>{m.rol === 'admin' ? "👑 " : ""}{m.nombre || m.email || m.user_id}</b>
              {isAdmin && (
                <>
                  <select
                    value={m.rol}
                    onChange={e => setRole(m.user_id, e.target.value)}
                    style={{ marginLeft: 8 }}
                    disabled={m.user_id === user?.id}
                  >
                    <option value="admin">Admin</option>
                    <option value="miembro">Miembro</option>
                  </select>
                  {m.rol !== 'admin' && (
                    <button
                      style={{ color: "red", marginLeft: 8 }}
                      onClick={() => removeMember(m.user_id)}
                    >
                      Eliminar
                    </button>
                  )}
                </>
              )}
            </div>
          ))
        ) : <div>Sin miembros</div>}
      </div>
      {showInvite &&
        <InviteToGroupModal
          roomId={roomId}
          preselectUserId={null}
          onClose={() => { setShowInvite(false); refresh(); }}
        />
      }
    </div>
  );
}
