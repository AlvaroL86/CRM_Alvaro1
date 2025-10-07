// src/pages/chat/ChatGroups.jsx
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../services/api";

export default function ChatGroups({ onOpenGroup }) {
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [show, setShow] = useState(false);
  const [nombre, setNombre] = useState('');
  const [desc, setDesc] = useState('');
  const [sel, setSel] = useState({}); // userId -> true

  const load = async () => {
    try {
      const rows = await apiGet('/chat/rooms?type=grupo');
      setGroups(Array.isArray(rows) ? rows : []);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const openModal = async () => {
    try {
      const u = await apiGet('/chat/users');
      setUsers(Array.isArray(u) ? u : []);
    } catch {}
    setShow(true);
  };

  const toggle = (id) => setSel((p) => ({ ...p, [id]: !p[id] }));

  const create = async () => {
    try {
      const members = Object.keys(sel).filter(k => sel[k]);
      const g = await apiPost('/chat/rooms', { nombre, descripcion: desc, members });
      setShow(false); setNombre(''); setDesc(''); setSel({});
      await load();
      onOpenGroup?.(g.id, { tipo: 'grupo', title: g.nombre });
    } catch (e) {
      alert('No se pudo crear el grupo');
    }
  };

  return (
    <div className="rounded border bg-white">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="text-sm font-medium">Grupos</div>
        <button onClick={openModal} className="rounded bg-blue-600 px-2 py-1 text-xs text-white">+ Nuevo</button>
      </div>
      <div className="p-2">
        {!groups.length && <div className="py-6 text-center text-xs text-gray-400">Sin grupos.</div>}
        <ul className="space-y-1">
          {groups.map(g => (
            <li key={g.id}>
              <button onClick={() => onOpenGroup?.(g.id, { tipo: 'grupo', title: g.nombre })}
                      className="w-full truncate rounded px-2 py-1 text-left text-sm hover:bg-gray-50">
                #{g.nombre}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {show && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded bg-white p-4 shadow">
            <div className="mb-3 text-lg font-semibold">Nuevo grupo</div>
            <div className="space-y-2">
              <input className="w-full rounded border px-2 py-1" placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} />
              <textarea className="h-24 w-full rounded border px-2 py-1" placeholder="Descripción (opcional)" value={desc} onChange={e => setDesc(e.target.value)} />
              <div className="text-sm font-medium">Invitar (mínimo 1)</div>
              <div className="max-h-48 overflow-y-auto rounded border p-2">
                {!users.length && <div className="py-6 text-center text-xs text-gray-400">Sin usuarios</div>}
                {users.map(u => (
                  <label key={u.id} className="flex items-center gap-2 py-1">
                    <input type="checkbox" checked={!!sel[u.id]} onChange={() => toggle(u.id)} />
                    <span>{u.nombre || u.email || u.id}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button className="rounded px-3 py-2" onClick={() => setShow(false)}>Cancelar</button>
                <button className="rounded bg-blue-600 px-3 py-2 text-white" onClick={create}>Crear</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
