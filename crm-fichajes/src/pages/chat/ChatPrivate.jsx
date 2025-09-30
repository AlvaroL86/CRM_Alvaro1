// src/pages/chat/ChatPrivate.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getSocket } from "../../socket";

const PINS_KEY = "chat_private_pins";

function readPins() {
  try { return JSON.parse(localStorage.getItem(PINS_KEY) || "[]"); } catch { return []; }
}
function writePins(arr) {
  try { localStorage.setItem(PINS_KEY, JSON.stringify(arr)); } catch {}
}

function roomIdFor(a, b) {
  const [x, y] = [String(a), String(b)].sort();
  return `pm:${x}:${y}`;
}

export default function ChatPrivate({ openWithUser, onOpened }) {
  const { user } = useAuth();
  const [peer, setPeer] = useState(null);       // {id,nombre}
  const [room, setRoom] = useState(null);       // string
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [pins, setPins] = useState(() => readPins());
  const scroller = useRef(null);
  const seen = useRef(new Set());

  // abrir con usuario recibido desde el panel
  useEffect(() => {
    if (!openWithUser?.id || !user?.id) return;
    const r = roomIdFor(user.id, openWithUser.id);
    setPeer({ id: openWithUser.id, nombre: openWithUser.nombre });
    setRoom(r);
    setMsgs([]);
    onOpened?.();
  }, [openWithUser?.id]);

  // join/leave room + listeners
  useEffect(() => {
    if (!room) return;
    const s = getSocket();
    s.emit("chat:join", room);

    const onMsg = (m) => {
      if (m?.room_id !== room) return;
      const key = m.id || `${m.room_id}|${m.from?.id}|${m.text}|${m.created_at}`;
      if (seen.current.has(key)) return;
      seen.current.add(key);
      setMsgs((p) => [...p, m]);
    };
    s.on("chat:message", onMsg);

    return () => {
      s.off("chat:message", onMsg);
      s.emit("chat:leave", { roomId: room });
    };
  }, [room]);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [msgs.length]);

  function send() {
    const t = text.trim();
    if (!t || !room) return;
    getSocket().emit("chat:send", { room, text: t });
    setText("");
  }
  function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function togglePin() {
    if (!peer?.id) return;
    const set = new Set(pins);
    set.has(peer.id) ? set.delete(peer.id) : set.add(peer.id);
    const arr = [...set];
    setPins(arr);
    writePins(arr);
  }

  const isPinned = useMemo(() => (peer?.id ? pins.includes(peer.id) : false), [pins, peer?.id]);

  return (
    <div className="p-4">
      <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
        <div>
          Chat privado {peer ? <>con <strong>{peer.nombre || peer.id}</strong></> : "(selecciona un usuario)"}
        </div>
        {peer && (
          <button
            className={`text-sm ${isPinned ? "text-yellow-500" : "text-gray-400"}`}
            onClick={togglePin}
            title={isPinned ? "Quitar de favoritos" : "Marcar como favorito"}
          >
            ★
          </button>
        )}
      </div>

      <div className="h-[60vh] overflow-y-auto rounded border bg-white p-3" ref={scroller}>
        {!peer && <div className="text-gray-400">Elige un usuario en el panel de la izquierda.</div>}
        {peer && msgs.map((m) => (
          <div key={m.id || `${m.room_id}-${m.created_at}-${m.text}`} className="mb-3">
            <div className="text-xs text-gray-500">
              {m.from?.nombre || m.from?.id || "Usuario"} · {new Date(m.created_at).toLocaleTimeString()}
            </div>
            <div>{m.text}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          rows={2}
          placeholder={peer ? "Escribe un mensaje…" : "Selecciona primero un usuario…"}
          className="flex-1 rounded border p-2"
          disabled={!peer}
        />
        <button
          onClick={send}
          disabled={!peer}
          className={`rounded px-3 py-2 text-white ${peer ? "bg-blue-600" : "bg-gray-400"}`}
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
