// src/pages/chat/ChatGeneral.jsx
import { useEffect, useRef, useState } from "react";
import { apiGet } from "../../services/api";
import { getSocket } from "../../socket";
import InputBar from "./InputBar";

export default function ChatGeneral() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const listRef = useRef(null);

  // Cargar los últimos 200 al montar
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await apiGet(`/chat/messages?room=general&limit=200`);
        if (!alive) return;
        setMessages(Array.isArray(data) ? data : []);
        scrollBottom();
      } catch (e) {
        console.warn("historial general:", e.message);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Socket en tiempo real
  useEffect(() => {
    const s = getSocket();
    // anuncia identidad si no lo hizo login view
    s.emit("auth:hello", {}); // el back puede ignorar si ya la tiene
    // join por alias (el back lo resuelve)
    s.emit("chat:join", { room: "general" });

    const onMsg = (msg) => {
      // si llega mensaje del back ya resuelto, lo pintamos
      if (msg && (msg.room_id || msg.roomId)) {
        setMessages((prev) => [...prev, normalize(msg)]);
        scrollBottom();
      }
    };
    s.on("chat:message", onMsg);

    return () => {
      s.off("chat:message", onMsg);
      s.emit("chat:leave", { room: "general" });
    };
  }, []);

  const send = () => {
    const t = String(text || "").trim();
    if (!t) return;
    const s = getSocket();
    s.emit("chat:send", { room: "general", text: t });
    setText("");
  };

  const scrollBottom = () => {
    requestAnimationFrame(() => {
      try { listRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }); } catch {}
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={listRef} className="flex-1 overflow-y-auto rounded border bg-white p-3">
        {messages.length === 0 ? (
          <div className="py-10 text-center text-gray-400">No hay mensajes.</div>
        ) : (
          <ul className="space-y-1">
            {messages.map((m) => (
              <li key={m.id} className="text-sm">
                <span className="text-gray-500">{m?.from?.nombre || m.user_id || "—"}</span>
                <span className="text-gray-400"> · {formatTime(m?.created_at)}</span>
                <div>{m.text}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <InputBar value={text} onChange={setText} onSend={send} />
    </div>
  );
}

function normalize(m) {
  return {
    id: m.id,
    room_id: m.room_id || m.roomId,
    user_id: m.user_id || m.userId,
    text: m.text ?? m.cuerpo ?? "",
    created_at: m.created_at || m.createdAt || new Date().toISOString(),
    from: m.from || null,
  };
}

function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}
