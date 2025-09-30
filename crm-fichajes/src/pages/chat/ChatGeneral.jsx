import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getSocket } from "../../socket";
import { BASE_URL } from "../../services/api";

export default function ChatGeneral() {
  const { user, ready, isAuthenticated } = useAuth();
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [before, setBefore] = useState(null); // para “cargar historial”
  const scroller = useRef(null);
  const seen = useRef(new Set());

  // autoscroll
  useEffect(() => {
    if (!scroller.current) return;
    scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [msgs.length]);

  // helper para no repetir
  function pushIfNew(m) {
    const key = `${m.id || m.created_at}-${m.room_id}-${m.text}`;
    if (seen.current.has(key)) return;
    seen.current.add(key);
    setMsgs((prev) => [...prev, m]);
  }

  // cargas iniciales + socket
  useEffect(() => {
    if (!ready || !isAuthenticated || !user?.id) return;

    const s = getSocket();
    const name = user?.nombre || user?.username || String(user.id);

    s.emit("auth:hello", { id: user.id, nombre: name });
    s.emit("chat:join", "general");

    // SOLO protocolo nuevo
    const onMsg = (m) => (m?.room_id === "general") && pushIfNew(m);
    s.on("chat:message", onMsg);

    // histórico desde API persistente
    loadHistory(true);

    return () => {
      s.off("chat:message", onMsg);
      s.emit("chat:leave", { roomId: "general" });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, isAuthenticated, user?.id]);

  async function loadHistory(initial = false) {
    const qs = new URLSearchParams({
      room: "general",
      limit: "200",
      ...(before ? { before } : {}),
    });
    try {
      const r = await fetch(`${BASE_URL}/chat/messages?${qs}`);
      if (!r.ok) return;
      const rows = await r.json();        // ascendente
      if (!Array.isArray(rows)) return;
      if (initial) {
        seen.current.clear();
        setMsgs(rows);
      } else {
        // prepend
        setMsgs((prev) => [...rows, ...prev]);
      }
      if (rows.length) setBefore(rows[0].created_at);
    } catch {}
  }

  function send() {
    const t = text.trim();
    if (!t) return;
    const s = getSocket();
    // SOLO evento nuevo
    s.emit("chat:send", { room: "general", text: t });
    setText("");
  }

  function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="grid gap-4 grid-cols-1">
      <div className="mb-2 text-sm text-gray-500">Sala: General</div>

      <div className="flex flex-col rounded border bg-white">
        <button
          className="self-start m-2 text-xs text-blue-600 hover:underline"
          onClick={() => loadHistory(false)}
        >
          Cargar historial…
        </button>

        <div ref={scroller} className="h-[56vh] overflow-y-auto px-4 pb-4">
          {msgs.map((m) => (
            <div key={`${m.id}-${m.created_at}`} className="mb-3">
              <div className="text-xs text-gray-500">
                {(m.from?.nombre || m.from?.id || "Usuario")} ·{" "}
                {new Date(m.created_at).toLocaleTimeString()}
              </div>
              <div>{m.text}</div>
            </div>
          ))}
          {!msgs.length && <div className="text-gray-400">No hay mensajes.</div>}
        </div>

        <div className="flex gap-2 border-t p-3">
          <textarea
            className="flex-1 rounded border p-2"
            rows={2}
            placeholder="Escribe un mensaje…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
          />
          <button onClick={send} className="rounded bg-blue-600 px-3 py-2 text-white">
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
