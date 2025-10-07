import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "../../services/api";

export default function ChatMembersPanel({ roomId }) {
  const [list, setList] = useState([]);
  const refresh = async () => { try { setList(await apiGet(`/chat/room/${roomId}/members`)); } catch {} };
  useEffect(()=>{ if (roomId) refresh(); }, [roomId]);

  const setRole = async (uid, rol) => {
    try { await apiPatch(`/chat/room/${roomId}/members/${uid}`, { rol }); refresh(); }
    catch (e) { alert(e.message || "No se pudo actualizar"); }
  };

  return (
    <div className="p-3 text-sm">
      <div className="mb-2 text-xs text-gray-500">Miembros</div>
      <ul className="space-y-1">
        {list.map(m=>(
          <li key={m.user_id} className="flex items-center justify-between rounded px-2 py-1 hover:bg-gray-50">
            <div className="truncate">{m.rol === 'admin' ? "👑 " : ""}{m.nombre || m.email || m.user_id}</div>
            <div className="ml-2 text-xs">
              {m.rol === 'admin'
                ? <button className="rounded border px-2 py-0.5" onClick={()=>setRole(m.user_id,'miembro')}>Quitar admin</button>
                : <button className="rounded border px-2 py-0.5" onClick={()=>setRole(m.user_id,'admin')}>Hacer admin</button>}
            </div>
          </li>
        ))}
      </ul>
      {!list.length && <div className="text-xs text-gray-400">Sin miembros</div>}
    </div>
  );
}
