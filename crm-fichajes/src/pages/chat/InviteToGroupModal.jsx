import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../services/api";

export default function InviteToGroupModal({ roomId, preselectUserId, onClose }) {
  const [users, setUsers] = useState([]);
  const [sel, setSel] = useState({});

  useEffect(()=>{ (async()=>{
    try {
      const list = await apiGet("/chat/users");
      setUsers(list || []);
      if (preselectUserId) setSel({ [preselectUserId]: true });
    } catch {}
  })(); }, [preselectUserId]);

  const toggle = (id) => setSel(s => ({...s, [id]: !s[id]}));

  const submit = async () => {
    const userIds = Object.entries(sel).filter(([,v])=>v).map(([k])=>k);
    try {
      await apiPost(`/chat/room/${roomId}/invite`, { userIds });
      onClose?.(true);
    } catch (e) {
      alert(e.message || "No se pudo invitar");
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
      <div className="w-full max-w-lg rounded bg-white p-4 shadow">
        <h3 className="mb-3 text-lg font-semibold">Invitar a grupo</h3>
        <div className="max-h-60 overflow-auto rounded border p-2">
          {users.map(u=>(
            <label key={u.id} className="flex items-center gap-2 py-0.5 text-sm">
              <input type="checkbox" checked={!!sel[u.id]} onChange={()=>toggle(u.id)} /> {u.nombre || u.email}
            </label>
          ))}
          {!users.length && <div className="text-xs text-gray-500">Sin usuarios</div>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded border px-3 py-1" onClick={()=>onClose?.(false)}>Cancelar</button>
          <button className="rounded bg-blue-600 px-3 py-1 text-white" onClick={submit}>Invitar</button>
        </div>
      </div>
    </div>
  );
}
