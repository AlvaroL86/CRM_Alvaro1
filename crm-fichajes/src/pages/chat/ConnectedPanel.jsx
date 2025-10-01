// src/pages/chat/ConnectedPanel.jsx
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', { transports: ['websocket'] });

export default function ConnectedPanel() {
  const [list, setList] = useState([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    socket.emit('auth:hello', { id: u.id, nombre: u.nombre });

    const onPresence = (arr) => setList(arr || []);
    socket.on('presence:list', onPresence);
    return () => socket.off('presence:list', onPresence);
  }, []);

  return (
    <div className={`transition-all ${collapsed ? 'w-10' : 'w-72'} overflow-hidden`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium">Conectados</h3>
        <button className="text-sm text-blue-600" onClick={() => setCollapsed(v => !v)}>
          {collapsed ? 'Mostrar' : 'Ocultar'}
        </button>
      </div>

      {!collapsed && (
        <div className="rounded border bg-white">
          {list.length === 0 ? (
            <div className="text-sm text-gray-500 p-3">Nadie conectado.</div>
          ) : (
            <ul className="divide-y">
              {list.map(u => (
                <li key={u.id} className="p-2 hover:bg-slate-50 flex items-center justify-between">
                  <span>{u.nombre || u.id}</span>
                  {/* TODO: menú contextual (privado/invitar/llamar…) */}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
