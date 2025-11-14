// src/pages/chat/ChatThread.jsx
import { useEffect, useRef, useState } from "react";
import { apiGet, apiPostForm, BASE_URL } from "@/services/api";
import { getSocket } from "@/socket";
import { useAuth } from "@/context/AuthContext";
import { useSoundPrefs, SoundPrefsButton } from "@/context/SoundPrefsContext";

/* ------------ utils ------------- */
function toAbsolute(url) {
  if (!url) return url;
  try {
    if (/^https?:\/\//i.test(url)) return url;
    return `${BASE_URL}${url}`;
  } catch {
    return url;
  }
}

function inferTipo(msg) {
  if (msg?.tipo) return msg.tipo;
  const u = (msg?.file_url || "").toLowerCase();
  if (!u) return "texto";
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(u)) return "imagen";
  if (/\.(mp3|wav|ogg|m4a|webm)$/.test(u)) return "audio";
  if (/\.(mp4|webm|mov|mkv|avi)$/.test(u)) return "video";
  return "archivo";
}

function copyToClipboardUrl(url) {
  try {
    navigator.clipboard.writeText(url);
  } catch {}
}
function downloadFile(url) {
  const a = document.createElement("a");
  a.href = url;
  a.download = "";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/* ============ componente ============ */
export default function ChatThread({
  room, // "general" o roomId
  title,
  activeRoomId, // id real de la sala actual (opcional)
  onSeen,
  roomType = "grupos", // 'grupos' | 'privado'
}) {
  return (
    <ChatThreadContent
      room={room}
      title={title}
      activeRoomId={activeRoomId}
      onSeen={onSeen}
      roomType={roomType}
    />
  );
}

function ChatThreadContent({
  room,
  title,
  activeRoomId,
  onSeen,
  roomType = "grupos",
}) {
  const { user } = useAuth();
  const { isRoomMuted, play } = useSoundPrefs();

  const [items, setItems] = useState([]);

  // Composer
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]); // File[]
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);

  const listRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  /* --------- Historial --------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await apiGet(
          `/chat/messages?room=${encodeURIComponent(room)}&limit=200`
        );
        if (!alive) return;
        setItems(Array.isArray(data) ? data : []);
        scrollBottom();
        onSeen?.();
      } catch (e) {
        console.warn("historial:", e.message);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  /* --------- Socket --------- */
  useEffect(() => {
    const s = getSocket();
    s.emit("auth:hello", {});
    s.emit("chat:join", { room });

    const onMsg = (msg) => {
      if (!msg?.room_id) return;
      setItems((prev) => [...prev, msg]);

      // Sonido: solo si no es tuyo; respeta silencio por sala y DND (SoundPrefs)
      if (msg.user_id !== user?.id && !isRoomMuted(msg.room_id)) {
        play(roomType === "privado" ? "private" : "group");
      }

      scrollBottom();
    };
    s.on("chat:message", onMsg);

    return () => {
      s.off("chat:message", onMsg);
      s.emit("chat:leave", { room });
    };
  }, [room, roomType, user?.id, isRoomMuted, play]);

  const scrollBottom = () => {
    requestAnimationFrame(() => {
      try {
        listRef.current?.scrollTo({ top: 9e9, behavior: "smooth" });
      } catch {}
    });
  };

  /* --------- Pegar/drag&drop/adjuntar --------- */
  const onPaste = (e) => {
    const its = e.clipboardData?.items || [];
    const picked = [];
    for (const it of its) {
      if (it.kind === "file") {
        const f = it.getAsFile();
        if (f) picked.push(f);
      }
    }
    if (picked.length) {
      e.preventDefault();
      setFiles((prev) => [...prev, ...picked]);
    }
  };
  const onDrop = (e) => {
    e.preventDefault();
    const picked = Array.from(e.dataTransfer.files || []);
    if (picked.length) setFiles((prev) => [...prev, ...picked]);
  };
  const onDragOver = (e) => e.preventDefault();
  const onPick = (e) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length) setFiles((prev) => [...prev, ...picked]);
    e.target.value = "";
  };
  const removeFile = (idx) =>
    setFiles((prev) => prev.filter((_, i) => i !== idx));

  /* --------- Dictado --------- */
  const startDictate = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return alert("Dictado no soportado en este navegador.");
    const rec = new SR();
    rec.lang = "es-ES";
    rec.interimResults = true;
    rec.onresult = (ev) => {
      let final = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        final += ev.results[i][0].transcript;
      }
      setText((t) => (t ? t + " " : "") + final.trim());
    };
    rec.onerror = () => rec.stop();
    rec.onend = () => {};
    rec.start();
  };

  /* --------- Grabación de audio --------- */
  const toggleRecord = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const f = new File([blob], `audio-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        setFiles((prev) => [...prev, f]);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setRecording(true);
    } catch {
      alert("No se pudo acceder al micrófono.");
    }
  };

  /* --------- Envío --------- */
  const send = async () => {
    const s = getSocket();
    const t = String(text || "").trim();
    if (!t && files.length === 0) return;

    // 1) Subir adjuntos si hay
    let uploaded = [];
    if (files.length) {
      setUploading(true);
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      try {
        const resp = await apiPostForm(`/chat/upload`, form);
        uploaded = resp?.files || [];
      } catch (e) {
        alert(e.message || "Error subiendo adjuntos");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    // 2) Enviar texto (si lo hay)
    if (t) s.emit("chat:send", { room, text: t });

    // 3) Enviar cada adjunto como mensaje propio
    for (const f of uploaded) {
      s.emit("chat:send", {
        room,
        text: "",
        tipo: f.tipo || "archivo",
        file_url: f.file_url,
      });
    }

    setText("");
    setFiles([]);
  };

  // ENTER envía; Shift+Enter salto
  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const author = (m) => {
    if (m.user_id && user?.id && m.user_id === user.id) return "Tú";
    if (m.from?.nombre) return m.from.nombre;
    if (m.from_nombre) return m.from_nombre;
    return "";
  };

  // Mensaje con miniaturas y acciones
  const renderMessageBody = (m) => {
    const tipo = inferTipo(m);
    const abs = toAbsolute(m.file_url);

    if (tipo === "imagen" && abs) {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            marginTop: 8,
          }}
        >
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: 8,
              overflow: "hidden",
              border: "1px solid #e5e7eb",
              background: "#fff",
              flexShrink: 0,
            }}
          >
            <img
              src={abs}
              alt="imagen"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            {m.text && (
              <div className="whitespace-pre-wrap leading-5">{m.text}</div>
            )}
            <div
              style={{ marginTop: 8, display: "flex", gap: 10, fontSize: 13 }}
            >
              <a href={abs} target="_blank" rel="noreferrer">
                Ver
              </a>
              <button
                onClick={() => copyToClipboardUrl(abs)}
                style={{ textDecoration: "underline" }}
              >
                Copiar
              </button>
              <button
                onClick={() => downloadFile(abs)}
                style={{ textDecoration: "underline" }}
              >
                Descargar
              </button>
            </div>
          </div>
        </div>
      );
    }
    if (tipo === "audio" && abs) {
      return (
        <div className="mt-2">
          <audio controls src={abs} />
          {m.text && (
            <div className="mt-2 whitespace-pre-wrap leading-5">{m.text}</div>
          )}
          <div style={{ marginTop: 6, display: "flex", gap: 10, fontSize: 13 }}>
            <a href={abs} target="_blank" rel="noreferrer">
              Abrir
            </a>
            <button
              onClick={() => downloadFile(abs)}
              style={{ textDecoration: "underline" }}
            >
              Descargar
            </button>
          </div>
        </div>
      );
    }
    if (tipo === "video" && abs) {
      return (
        <div className="mt-2">
          <video
            controls
            src={abs}
            style={{
              maxWidth: 380,
              maxHeight: 220,
              borderRadius: 6,
              border: "1px solid #eee",
            }}
          />
          {m.text && (
            <div className="mt-2 whitespace-pre-wrap leading-5">{m.text}</div>
          )}
          <div style={{ marginTop: 6, display: "flex", gap: 10, fontSize: 13 }}>
            <a href={abs} target="_blank" rel="noreferrer">
              Abrir
            </a>
            <button
              onClick={() => downloadFile(abs)}
              style={{ textDecoration: "underline" }}
            >
              Descargar
            </button>
          </div>
        </div>
      );
    }
    if (abs && tipo === "archivo") {
      return (
        <div className="mt-2">
          <a
            href={abs}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 underline"
          >
            Descargar archivo
          </a>
          {m.text && (
            <div className="mt-2 whitespace-pre-wrap leading-5">{m.text}</div>
          )}
        </div>
      );
    }
    return <div className="mt-1 whitespace-pre-wrap leading-5">{m.text}</div>;
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header con botón de sonido */}
      <div className="sticky top-0 z-10 border-b bg-white px-3 py-2 text-sm font-semibold">
        {title}
        <span style={{ float: "right" }}>
          <SoundPrefsButton />
        </span>
      </div>

      {/* Lista de mensajes */}
      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto bg-white p-3"
        style={{ height: "calc(100vh - 260px)" }}
      >
        {!items.length ? (
          <div className="py-10 text-center text-gray-400">
            No hay mensajes.
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((m) => (
              <li key={m.id} className="rounded bg-blue-50 p-3">
                <div className="text-xs text-gray-500">
                  {author(m)} {author(m) && "·"} {formatTime(m?.created_at)}
                </div>
                {renderMessageBody(m)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Composer */}
      <div className="border-t bg-white p-2">
        {!!files.length && (
          <div className="mb-2 flex flex-wrap gap-2">
            {files.map((f, i) => {
              const isImg = f.type?.startsWith?.("image/");
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded border px-2 py-1"
                >
                  {isImg ? (
                    <img
                      src={URL.createObjectURL(f)}
                      alt=""
                      className="h-8 w-8 rounded object-cover"
                    />
                  ) : (
                    <span className="inline-block h-8 w-8 rounded bg-gray-200 text-center leading-8 text-xs">
                      {f.type.startsWith("audio/") ? "🎙" : "📎"}
                    </span>
                  )}
                  <span className="max-w-[180px] truncate text-xs">
                    {f.name}
                  </span>
                  <button
                    className="text-red-600"
                    onClick={() => removeFile(i)}
                    title="Quitar"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div
          className="flex items-end gap-2 rounded border px-2 py-2"
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <textarea
            className="min-h-[40px] w-full flex-1 resize-none outline-none"
            placeholder={
              recording
                ? "Grabando… pulsa 🎤 para detener"
                : "Escribe… (Enter para enviar · Shift+Enter salto · Ctrl+V para pegar archivos/imagenes)"
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={onPaste}
            onKeyDown={onKeyDown}
            rows={2}
          />

          <div className="flex items-center gap-1 pb-1">
            <label
              className="cursor-pointer rounded border px-2 py-1 text-sm hover:bg-gray-50"
              title="Adjuntar archivo"
            >
              📎
              <input
                type="file"
                multiple
                className="hidden"
                onChange={onPick}
              />
            </label>

            <button
              className={`rounded px-2 py-1 text-sm ${
                recording ? "bg-red-600 text-white" : "border hover:bg-gray-50"
              }`}
              onClick={toggleRecord}
              title={recording ? "Detener grabación" : "Grabar audio"}
            >
              🎤
            </button>

            <button
              className="rounded border px-2 py-1 text-sm hover:bg-gray-50"
              onClick={startDictate}
              title="Dictar a texto"
            >
              🗣
            </button>

            <button
              className="ml-1 rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50"
              onClick={send}
              disabled={uploading || (!text.trim() && files.length === 0)}
            >
              {uploading ? "Subiendo…" : "Enviar"}
            </button>
          </div>
        </div>

        <div className="mt-1 text-[11px] text-gray-500">
          Arrastra archivos aquí o usa 📎. Soportado: imágenes, audio (🎤) y
          otros adjuntos. Dictado con 🗣. Enter envía; Shift+Enter inserta salto.
        </div>
      </div>
    </div>
  );
}
