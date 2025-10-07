import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../services/api";

export default function InviteToGroupModal({ roomId, preselectUserId, onClose }) {
  const [users, setUsers] = useState([]);
  const [sel, setSel] = useState({});
  useEffect(() => {
    (async () => {
      try {
        const list = await apiGet("/chat/users");
        setUsers(list || []);
        if (preselectUserId) setSel({ [preselectUserId]: true });
      } catch {}
    })();
  }, [preselectUserId]);
  const toggle = id => setSel(s => ({ ...s, [id]: !s[id] }));

  const submit = async () => {
    const userIds = Object.entries(sel).filter(([_, v]) => v).map(([k]) => k);
    try {
      await apiPost(`/chat/room/${roomId}/invite`, { userIds });
      onClose?.(true);
    } catch (e) {
      alert(e.message || "No se pudo invitar");
    }
  };

  return (
    <div>
      <h4>Invitar a grupo</h4>
      {users.map(u => (
        <div key={u.id}>
          <input type="checkbox" checked={!!sel[u.id]} onChange={() => toggle(u.id)} />
          {u.nombre || u.email}
        </div>
      ))}
      {!users.length && <div>Sin usuarios</div>}
      <button onClick={submit}>Invitar</button>
      <button onClick={onClose} style={{ marginLeft: 8 }}>Cancelar</button>
    </div>
  );
}
