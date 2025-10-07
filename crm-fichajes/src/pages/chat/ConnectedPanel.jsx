// src/pages/chat/ConnectedPanel.jsx
import { useMemo, useState } from "react";
import { apiPost } from "../../services/api";

export async function openPrivateWith(userId) {
  return apiPost(`/chat/rooms/private`, { userId });
}

function Row({ u, onOpen }) {
  const [menu, setMenu] = useState(null);
  const onCtx = (e) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  };
  return (
    <div className="relative">
      <button
        onClick={() => onOpen?.(u)}
        onContextMenu={onCtx}
        className="flex w-full items-center justify-between rounded px-2 py-1 text-sm hover:bg-gray-50"
        title="Abrir privado"
      >
        <span className="truncate">{u.nombre || u.id}</span>
        <span className="ml-2 inline-block h-2 w-2 rounded-full bg-green-500" />
      </button>

      {menu && (
        <div
          style={{ top: menu.y, left: menu.x }}
          className="fixed z-50 rounded border bg-white shadow"
          onMouseLeave={() => setMenu(null)}
        >
          <button className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
            onClick={() => onOpen?.(u)}>💬 Privado</button>
          <button className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
            onClick={() => alert("Invitar a grupo: modal pendiente")}>➕ Invitar a grupo</button>
          <button className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
            onClick={() => window.open(`mailto:${u.email||''}`,'_self')}>✉️ Enviar email</button>
          <button className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
            onClick={() => alert("Videollamada próximamente")}>🎥 Videollamada</button>
        </div>
      )}
    </div>
  );
}

export default function ConnectedPanel({ me, list = [], onOpenPrivate }) {
  const filtered = useMemo(() => (list||[]).filter(x => x.id && x.id !== me?.id), [list, me?.id]);
  return (
    <div className="rounded border bg-white">
      <div className="border-b px-3 py-2 text-sm font-semibold">Conectados</div>
      <div className="max-h-48 overflow-y-auto p-2">
        {!filtered.length && <div className="py-6 text-center text-xs text-gray-400">Nadie conectado.</div>}
        <ul className="space-y-1">
          {filtered.map(u => (
            <li key={u.id}><Row u={u} onOpen={onOpenPrivate} /></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
