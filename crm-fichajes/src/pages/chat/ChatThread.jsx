import { useEffect, useRef, useState } from "react";
import { apiGet } from "../../services/api";
import { getSocket } from "../../socket";
import InputBar from "./InputBar";
import { useAuth } from "../../context/AuthContext";

export default function ChatThread({ room, title, activeRoomId, onSeen }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await apiGet(`/chat/messages?room=${encodeURIComponent(room)}&limit=200`);
        if (!alive) return;
        setItems(Array.isArray(data) ? data : []);
        scrollBottom();
        onSeen?.();
      } catch (e) {
        console.warn("historial:", e.message);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  useEffect(() => {
    const s = getSocket();
    s.emit("auth:hello", {});
    s.emit("chat:join", { room });

    const onMsg = (msg) => {
      if (!msg?.room_id) return;
      setItems((prev) => [...prev, msg]);
      scrollBottom();
    };
    s.on("chat:message", onMsg);

    return () => {
      s.off("chat:message", onMsg);
      s.emit("chat:leave", { room });
    };
  }, [room]);

  const scrollBottom = () => {
    requestAnimationFrame(() => {
      try { listRef.current?.scrollTo({ top: 9e9, behavior: "smooth" }); } catch {}
    });
  };

  const send = () => {
    const t = String(text || "").trim();
    if (!t) return;
    getSocket().emit("chat:send", { room, text: t });
    setText("");
  };

  const author = (m) => {
    if (m.user_id && user?.id && m.user_id === user.id) return "Tú";
    if (m.from?.nombre) return m.from.nombre;
    if (m.from_nombre) return m.from_nombre;
    return "";
  };

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b bg-white px-3 py-2 text-sm font-semibold">{title}</div>
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto bg-white p-3">
        {!items.length ? (
          <div className="py-10 text-center text-gray-400">No hay mensajes.</div>
        ) : (
          <ul className="space-y-2">
            {items.map((m) => (
              <li key={m.id} className="rounded bg-blue-50 p-3">
                <div className="text-xs text-gray-500">
                  {author(m)} {author(m) && "·"} {formatTime(m?.created_at)}
                </div>
                <div className="mt-1 whitespace-pre-wrap leading-5">{m.text}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="border-t bg-white p-2">
        <InputBar value={text} onChange={setText} onSend={send} />
      </div>
    </div>
  );
}

function formatTime(iso) {
  try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}
