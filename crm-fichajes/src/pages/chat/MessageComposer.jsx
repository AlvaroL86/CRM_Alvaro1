import { useEffect, useRef, useState } from "react";
import { getSocket } from "../../socket";
import { apiPost } from "../../services/api";

export default function MessageComposer({ activeRoomId, onSent }) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]); // File[]
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // Pegar desde portapapeles
  const onPaste = (e) => {
    const items = e.clipboardData?.items || [];
    const picked = [];
    for (const it of items) {
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

  // Drag & drop
  const onDrop = (e) => {
    e.preventDefault();
    const picked = Array.from(e.dataTransfer.files || []);
    if (picked.length) setFiles((prev) => [...prev, ...picked]);
  };
  const onDragOver = (e) => e.preventDefault();

  // Adjuntar desde input
  const onPick = (e) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length) setFiles((prev) => [...prev, ...picked]);
    e.target.value = "";
  };

  // Dictado a texto (Web Speech API – Chrome)
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

  // Grabar audio (MediaRecorder)
  const toggleRecord = async () => {
    if (recording) {
      // parar
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
        const f = new File([blob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
        setFiles((prev) => [...prev, f]);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setRecording(true);
    } catch (e) {
      alert("No se pudo acceder al micrófono.");
    }
  };

  // Subir adjuntos y enviar mensaje
  const send = async () => {
    if (!activeRoomId) return;
    if (!text.trim() && files.length === 0) return;

    let uploaded = [];
    if (files.length) {
      setUploading(true);
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      try {
        const resp = await apiPost(`/chat/upload`, form, { isFormData: true });
        uploaded = resp?.files || [];
      } catch (e) {
        alert(e.message || "Error subiendo adjuntos");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const s = getSocket();

    // 1) Enviar texto (si lo hay)
    if (text.trim()) {
      s.emit("chat:send-room", {
        roomId: activeRoomId,
        message: { text: text.trim() }
      });
    }
    // 2) Enviar cada archivo como mensaje propio
    for (const f of uploaded) {
      s.emit("chat:send-room", {
        roomId: activeRoomId,
        message: {
          text: "",                 // opcional
          tipo: f.tipo || "archivo",
          file_url: f.file_url
        }
      });
    }

    setText("");
    setFiles([]);
    onSent?.();
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="border-t p-2">
      {/* Adjuntos preview */}
      {!!files.length && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((f, i) => {
            const isImg = f.type?.startsWith?.("image/");
            return (
              <div key={i} className="flex items-center gap-2 rounded border px-2 py-1">
                {isImg ? (
                  <img src={URL.createObjectURL(f)} alt="" className="h-8 w-8 rounded object-cover" />
                ) : (
                  <span className="inline-block h-8 w-8 rounded bg-gray-200 text-center leading-8 text-xs">
                    {f.type.startsWith("audio/") ? "🎙" : "📎"}
                  </span>
                )}
                <span className="max-w-[180px] truncate text-xs">{f.name}</span>
                <button className="text-red-600" onClick={() => removeFile(i)} title="Quitar">
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Zona de drop + caja de texto */}
      <div
        className="flex items-end gap-2 rounded border px-2 py-2"
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <textarea
          className="min-h-[40px] w-full flex-1 resize-none outline-none"
          placeholder={recording ? "Grabando… pulsa el icono para detener" : "Escribe un mensaje… (Ctrl+V para pegar archivos/imagenes)"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={onPaste}
          rows={2}
        />

        {/* Botones */}
        <div className="flex items-center gap-1 pb-1">
          <label className="cursor-pointer rounded border px-2 py-1 text-sm hover:bg-gray-50" title="Adjuntar archivo">
            📎
            <input type="file" multiple className="hidden" onChange={onPick} />
          </label>

          <button
            className={`rounded px-2 py-1 text-sm ${recording ? "bg-red-600 text-white" : "border hover:bg-gray-50"}`}
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

      <div className="mt-1 text-[11px] text-gray-500">Arrastra archivos aquí o usa 📎. Soportado: imágenes, audio (graba con 🎤) y otros adjuntos.</div>
    </div>
  );
}
