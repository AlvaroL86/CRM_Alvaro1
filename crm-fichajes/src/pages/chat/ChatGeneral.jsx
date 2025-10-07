// src/pages/chat/ChatGeneral.jsx
import { useEffect, useRef, useState } from "react";
import { apiGet } from "../../services/api";
import { getSocket } from "../../socket";
import InputBar from "./InputBar";
import { useAuth } from "../../context/AuthContext";

export default function ChatGeneral({ room = "general", onResolvedRoomId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [resolved, setResolved] = useState(null);
  const listRef = useRef(null);

  // Carga historial (al cambiar de sala)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await apiGet(`/chat/messages?room=${encodeURIComponent(room)}&limit=200`);
        if (!alive) return;
        const rid = rows?.[0]?.room_id || null; // si no hay msgs, no sabemos; el socket nos lo dirá
        setResolved(rid);
        onResolvedRoomId?.(rid);
        setMessages(Array.isArray(rows) ? rows : []);
        toBottom(true);
      } catch (e) {
        console.warn('historial:', e?.message || e);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  // Socket: join + escuchar
  useEffect(() => {
    const s = getSocket();
    if (user?.id) s.emit("auth:hello", { id: user.id, nombre: user.nombre, nif: user.nif });
    s.emit("chat:join", { room });

    const onJoined = (data) => {
      if (data?.room && data.room.toLowerCase() === String(room).toLowerCase()) {
        setResolved(data.roomId);
        onResolvedRoomId?.(data.roomId);
      }
    };
    const onMsg = (msg) => {
      if (!msg?.room_id) return;
      // Solo si es la sala actual (resuelta)
      const roomId = resolved || msg.room_id;
      if (msg.room_id === roomId) {
        setMessages((prev) => [...prev, msg]);
        toBottom();
      }
    };

    s.on('chat:joined', onJoined);
    s.on('chat:message', onMsg);
    return () => {
      s.off('chat:joined', onJoined);
      s.off('chat:message', onMsg);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, resolved, user?.id]);

  const toBottom = (instantly = false) => {
    requestAnimationFrame(() => {
      try {
        listRef.current?.scrollTo({ top: 999999, behavior: instantly ? 'auto' : 'smooth' });
      } catch {}
    });
  };

  const send = (t) => {
    const s = getSocket();
    s.emit('chat:send', { room, text: t });
    setText('');
  };

  return (
    <div className="flex h-[calc(100vh-260px)] flex-col rounded border bg-white">
      <div ref={listRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="py-10 text-center text-gray-400">No hay mensajes.</div>
        ) : (
          <ul className="space-y-2">
            {messages.map((m) => (
              <li key={m.id} className="rounded bg-sky-50 px-3 py-2">
                <div className="mb-1 text-xs text-gray-500">
                  <span className="font-medium">{m?.from?.nombre || m.user_id}</span>
                  <span className="ml-2 opacity-70">{formatTime(m.created_at)}</span>
                </div>
                <div className="whitespace-pre-wrap text-sm">{m.text}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <InputBar value={text} onChange={setText} onSend={send} />
    </div>
  );
}

function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}
