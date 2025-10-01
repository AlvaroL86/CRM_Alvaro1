// src/pages/chat/ChatPrivate.jsx
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getSocket } from "../../socket";
import { apiGet } from "../../services/api";

/** Genera un id de sala privada estable entre dos usuarios */
function makePrivRoomId(a, b) {
  const A = String(a ?? "");
  const B = String(b ?? "");
  return `priv:${[A, B].sort().join("_")}`;
}

export default function ChatPrivate({ peer, onPeerChange, online = [] }) {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const scroller = useRef(null);

  // autoscroll al final
  useEffect(() => {
    if (!scroller.current) return;
    scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [msgs.length]);

  useEffect(() => {
    if (!user?.id || !peer?.id) return;

    const roomId = makePrivRoomId(user.id, peer.id);
    const s = getSocket();

    // nos anunciamos y nos unimos a la sala (también al reconectar)
    const join = () => {
      s.emit("auth:hello", { id: user.id, nombre: user?.nombre || user?.username || "" });
      s.emit("chat:join", { roomId });
    };
    join();
    s.on("connect", join);

    // histórico de los últimos 200
    apiGet(`/chat/messages?room=${encodeURIComponent(roomId)}&limit=200`)
      .then((rows) => {
        const mapped = (rows || []).map((r) => ({
          id: r.id || r.created_at || Math.random(),
          room_id: roomId,
          text: r.text,
          from: r.from,
          created_at: r.created_at,
        }));
        setMsgs(mapped);
      })
      .catch(() => setMsgs([]));

    // realtime
    const onMsg = (m) => {
      if (m?.room_id !== roomId) return;
      setMsgs((prev) => [...prev, m]);
    };
    s.on("chat:message", onMsg);

    return () => {
      s.off("chat:message", onMsg);
      s.off("connect", join);
      s.emit("chat:leave", { roomId });
    };
  }, [user?.id, peer?.id]);

  function send() {
    const t = text.trim();
    if (!t || !user?.id || !peer?.id) return;

    const roomId = makePrivRoomId(user.id, peer.id);
    const s = getSocket();

    s.emit("chat:send-room", {
      roomId,
      message: {
        text: t,
        from: { id: user.id, nombre: user?.nombre || user?.username || "" },
      },
    });

    setText("");
  }

  function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  // UI
  if (!peer?.id) {
    return (
      <div className="p-4 text-sm text-gray-500">
        Selecciona un usuario de la lista de “Conectados” para abrir un chat privado.
      </div>
    );
  }

  const peerName = peer?.nombre || peer?.username || peer?.id;

  return (
    <div className="flex h-[70vh] min-h-[420px] flex-col">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Chat privado con <span className="font-medium">{peerName}</span>
        </div>
        <select
          className="rounded border px-2 py-1 text-sm"
          value={peer?.id}
          onChange={(e) => {
            const next = online.find((u) => String(u.id) === e.target.value);
            onPeerChange?.(next || null);
          }}
        >
          {[peer, ...online.filter((u) => u.id !== peer.id)].map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre || u.username || u.id}
            </option>
          ))}
        </select>
      </div>

      <div
        ref={scroller}
        className="flex-1 overflow-y-auto rounded border bg-white p-3"
      >
        {msgs.map((m) => (
          <div key={m.id} className="mb-3">
            <div className="text-xs text-gray-500">
              {m.from?.nombre || m.from?.id || "Usuario"} ·{" "}
              {new Date(m.created_at).toLocaleTimeString()}
            </div>
            <div>{m.text}</div>
          </div>
        ))}
        {!msgs.length && (
          <div className="text-gray-400">No hay mensajes.</div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <textarea
          className="flex-1 rounded border p-2"
          rows={2}
          placeholder="Escribe un mensaje…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
        />
        <button
          onClick={send}
          className="rounded bg-blue-600 px-3 py-2 text-white"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
