// src/pages/chat/Rooms.jsx
import { useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "../../services/api";
import { getSocket } from "../../socket";

export default function Rooms({ roomId, title = "Sala" }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef(null);
  const joinedRef = useRef(null);
  const seen = useRef(new Set());
  const fileInputRef = useRef(null);

  // eco optimista
  const pendingByClientId = useRef(new Set());

  // respuesta/cita
  const [replyTo, setReplyTo] = useState(null);

  // menú contextual
  const [ctxMenu, setCtxMenu] = useState(null); // {id,x,y}

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  // Join + historial + RT
  useEffect(() => {
    const s = getSocket();

    if (joinedRef.current) s.emit("chat:leave", { roomId: joinedRef.current });

    setMsgs([]);
    seen.current = new Set();
    if (!roomId) return;

    s.emit("chat:join", { roomId });
    joinedRef.current = roomId;

    (async () => {
      try {
        const data = await apiGet(
          `/chat/history?room=${encodeURIComponent(roomId)}&limit=50`
        );
        const norm = (data?.messages || [])
          .slice()
          .reverse()
          .map((m, i) => ({
            id: m.id || `h-${i}`,
            clientId: null,
            from: m.nombre || m.username || m.from?.nombre || "Desconocido",
            text: m.text || m.cuerpo || m.body || "",
            at: m.created_at || m.at,
            type: m.type || "text",
            fileUrl: m.file_url || null,
            replyToId: m.reply_to_id || null,
          }));
        norm.forEach((n) => seen.current.add(String(n.id)));
        setMsgs(norm);
      } catch (e) {
        console.error("history", e);
      }
    })();

    function onMsg(msg) {
      const r = msg.room_id || msg.roomId;
      if (r !== roomId) return;

      // si es mi eco (clientId ya visto) -> quita el temporal y no dupliques
      if (msg.clientId && pendingByClientId.current.has(msg.clientId)) {
        setMsgs((prev) => prev.filter((m) => m.clientId !== msg.clientId));
        pendingByClientId.current.delete(msg.clientId);
      }

      const item = {
        id: msg.id || msg.created_at || `${Date.now()}-${Math.random()}`,
        clientId: msg.clientId || null,
        from: msg.nombre || msg.username || msg.from?.nombre || "Anónimo",
        text: msg.text || msg.cuerpo || msg.body || "",
        at: msg.created_at || msg.at || new Date().toISOString(),
        type: msg.type || "text",
        fileUrl: msg.file_url || null,
        replyToId: msg.replyToId || msg.reply_to_id || null,
      };
      const key = String(item.id);
      if (seen.current.has(key)) return;
      seen.current.add(key);
      setMsgs((prev) => [...prev, item]);
    }

    s.on("chat:message", onMsg);
    return () => s.off("chat:message", onMsg);
  }, [roomId]);

  // ===== enviar (eco optimista con clientId) =====
  const sendText = async () => {
    const t = text.trim();
    if (!t || !roomId || sending) return;
    setSending(true);

    const clientId = `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    pendingByClientId.current.add(clientId);

    // eco temporal
    const temp = {
      id: clientId,
      clientId,
      from: "Yo",
      text: t,
      at: new Date().toISOString(),
      type: "text",
      _temp: true,
      replyToId: replyTo?.id || null,
    };
    setMsgs((prev) => [...prev, temp]);
    setText("");
    setReplyTo(null);

    try {
      await apiPost("/chat/messages", { roomId, text: t, clientId, replyToId: temp.replyToId });
    } catch (e) {
      setMsgs((prev) => prev.filter((m) => m.id !== clientId));
      pendingByClientId.current.delete(clientId);
      alert("No se pudo enviar el mensaje");
    } finally {
      setSending(false);
    }
  };

  function onSubmit(e) {
    e.preventDefault();
    sendText();
  }

  // ================== Adjuntos ==================
  const onPickFiles = () => fileInputRef.current?.click();

  const uploadFile = async (file) => {
    // Necesitas un endpoint de subida que te devuelva { url, type, filename }
    const form = new FormData();
    form.append("file", file);
    form.append("roomId", roomId);

    const res = await fetch(`/upload`, {
      method: "POST",
      body: form,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("crm_token") || ""}`,
      },
    });
    if (!res.ok) throw new Error("No se pudo subir el archivo");
    const data = await res.json(); // { url, type, filename }
    await apiPost("/chat/messages", {
      roomId,
      text: data.filename || file.name,
      type: data.type || "file",
      fileUrl: data.url,
    });
  };

  const onFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      try {
        await uploadFile(f);
      } catch (err) {
        console.error(err);
      }
    }
    e.target.value = "";
  };

  // Pegar imagen desde el portapapeles
  const onPaste = async (e) => {
    if (!e.clipboardData) return;
    const item = Array.from(e.clipboardData.items || []).find((i) =>
      i.type.startsWith("image/")
    );
    if (item) {
      const file = item.getAsFile();
      if (file) {
        try {
          await uploadFile(file);
        } catch (err) {
          console.error(err);
        }
        e.preventDefault();
      }
    }
  };

  // ================== Emoji picker (icono + buscador) ==================
  const [openEmoji, setOpenEmoji] = useState(false);
  const [emojiQ, setEmojiQ] = useState("");
  const EMOJIS = [
    "😀","😃","😄","😁","😆","😅","😂","🤣","😊","🙂","😉","😍","🥰","😘","😚","😎",
    "🤩","🤗","🤔","🤨","😐","🙄","😴","😇","😢","😭","😡","😤","👍","👎","🙏","👏","🙌",
    "🔥","🎉","💯","✨","🌟","💡","📎","📷","🖼️"
  ];
  const listFilter = EMOJIS.filter((e) =>
    emojiQ ? e.toLowerCase().includes(emojiQ.toLowerCase()) : true
  );

  // ================== Audio (grabación) ==================
  const mediaRef = useRef({ rec: null, chunks: [] });
  const [recording, setRecording] = useState(false);

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      mediaRef.current = { rec, chunks: [] };
      rec.ondataavailable = (ev) => {
        if (ev.data.size) mediaRef.current.chunks.push(ev.data);
      };
      rec.onstop = async () => {
        const blob = new Blob(mediaRef.current.chunks, { type: "audio/webm" });
        const file = new File([blob], `audio-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        try {
          await uploadFile(file);
        } catch (e) {
          console.error(e);
        }
        setRecording(false);
      };
      rec.start();
      setRecording(true);
    } catch (e) {
      console.error("mic error", e);
      alert("No se pudo acceder al micrófono");
    }
  };
  const stopRec = () => mediaRef.current.rec?.stop();

  // ================== utilidades UI ==================
  const copy = async (txt) => {
    try {
      await navigator.clipboard.writeText(txt);
    } catch {}
  };
  const forward = (m) =>
    alert(`Pendiente implementar reenvío:\n\n"${m.text}"`);

  const openContext = (e, m) => {
    e.preventDefault();
    setCtxMenu({ id: m.id, x: e.clientX, y: e.clientY });
  };
  const closeContext = () => setCtxMenu(null);

  return (
    <div className="space-y-3" onClick={closeContext}>
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>

      <div className="relative bg-white rounded shadow p-3 h-80 overflow-auto border">
        {roomId ? (
          msgs.map((m) => (
            <div
              key={m.id}
              className="relative text-gray-800 text-sm mb-1"
              onContextMenu={(e) => openContext(e, m)}
            >
              <b className="capitalize">{m.from}:</b>{" "}
              {m.type === "file" && m.fileUrl ? (
                m.fileUrl.match(/\.(png|jpg|jpeg|gif|webp)$/i) ? (
                  <a href={m.fileUrl} target="_blank" rel="noreferrer">
                    <img
                      src={m.fileUrl}
                      alt=""
                      className="inline-block max-h-40 rounded"
                    />
                  </a>
                ) : (
                  <a
                    href={m.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline"
                  >
                    {m.text || "archivo"}
                  </a>
                )
              ) : (
                m.text
              )}

              {/* Menú contextual */}
              {ctxMenu?.id === m.id && (
                <div
                  className="fixed z-50 w-44 rounded-md border bg-white p-1 shadow"
                  style={{ left: ctxMenu.x + 4, top: ctxMenu.y + 4 }}
                >
                  <button
                    className="block w-full px-2 py-1 text-left hover:bg-gray-100"
                    onClick={() => {
                      setReplyTo(m);
                      closeContext();
                    }}
                  >
                    Responder
                  </button>
                  <button
                    className="block w-full px-2 py-1 text-left hover:bg-gray-100"
                    onClick={() => {
                      copy(m.text || "");
                      closeContext();
                    }}
                  >
                    Copiar
                  </button>
                  <button
                    className="block w-full px-2 py-1 text-left hover:bg-gray-100"
                    onClick={() => {
                      forward(m);
                      closeContext();
                    }}
                  >
                    Reenviar
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-sm text-gray-500">
            Selecciona o crea una sala…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Cita / respuesta */}
      {replyTo && (
        <div className="rounded border-l-4 border-blue-400 bg-blue-50 px-3 py-2 text-xs text-blue-800">
          Respondiendo a <b>{replyTo.from}</b>: {replyTo.text}
          <button
            className="ml-2 text-blue-600"
            onClick={() => setReplyTo(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Barra de acciones + input */}
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        {/* izquierda: +, emojis, clip, micro */}
        <div className="flex items-center gap-2">
          {/* + (futuras acciones) */}
          <button
            type="button"
            className="rounded-full w-9 h-9 grid place-items-center border"
            title="Acciones"
          >
            ＋
          </button>

          {/* Emoji (icono + popover con buscador) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenEmoji((v) => !v)}
              className="rounded-full w-9 h-9 grid place-items-center border hover:bg-gray-50"
              title="Emojis"
            >
              {/* icono carita */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" />
                <circle cx="9" cy="10" r="1" fill="currentColor" />
                <circle cx="15" cy="10" r="1" fill="currentColor" />
                <path
                  d="M8 15c1.2 1 2.8 1.5 4 1.5s2.8-.5 4-1.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            {openEmoji && (
              <div className="absolute z-50 mt-2 w-64 rounded-xl border bg-white p-2 shadow-xl">
                <input
                  className="mb-2 w-full rounded border px-2 py-1 text-sm"
                  placeholder="Buscar emoji…"
                  value={emojiQ}
                  onChange={(e) => setEmojiQ(e.target.value)}
                  autoFocus
                />
                <div className="max-h-48 overflow-auto grid grid-cols-8 gap-1">
                  {listFilter.map((e) => (
                    <button
                      key={e}
                      type="button"
                      className="h-8 w-8 rounded hover:bg-gray-100"
                      onClick={() => {
                        setText((t) => t + e);
                        setOpenEmoji(false);
                      }}
                    >
                      {e}
                    </button>
                  ))}
                  {listFilter.length === 0 && (
                    <div className="col-span-8 py-6 text-center text-xs text-gray-500">
                      Sin resultados
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Adjuntar */}
          <button
            type="button"
            className="rounded-full w-9 h-9 grid place-items-center border"
            onClick={onPickFiles}
            title="Adjuntar"
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={onFilesSelected}
          />

          {/* Micrófono */}
          {!recording ? (
            <button
              type="button"
              className="rounded-full w-9 h-9 grid place-items-center border"
              onClick={startRec}
              title="Grabar audio"
            >
              🎙️
            </button>
          ) : (
            <button
              type="button"
              className="rounded-full w-9 h-9 grid place-items-center border bg-red-500 text-white"
              onClick={stopRec}
              title="Detener"
            >
              ■
            </button>
          )}
        </div>

        {/* input */}
        <input
          className="flex-1 rounded border px-3 py-2"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={onPaste}
          placeholder={roomId ? "Escribe un mensaje..." : "Selecciona una sala…"}
          disabled={!roomId || sending}
        />

        {/* enviar */}
        <button
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          disabled={!roomId || !text.trim() || sending}
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
