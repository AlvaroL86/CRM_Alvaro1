// src/pages/chat/InputBar.jsx
import { lazy, Suspense, useEffect, useRef, useState } from "react";

const EmojiPicker = lazy(() => import("emoji-picker-react"));

export default function InputBar({
  value,
  onChange,
  onSend,
  placeholder = "Escribe un mensaje…",
  disabled = false,
}) {
  const taRef = useRef(null);
  const fileRef = useRef(null);
  const [showEmoji, setShowEmoji] = useState(false);

  // autoresize textarea (máx 96px)
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 96) + "px";
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend?.();
    }
  };

  return (
    <div className="border-t bg-white p-2">
      <div className="relative flex items-end gap-2">
        {/* Emoji */}
        <div className="relative">
          <button
            type="button"
            className="rounded border px-2 py-1 text-xl"
            title="Emoji"
            onClick={() => setShowEmoji((v) => !v)}
            disabled={disabled}
          >
            😊
          </button>
          {showEmoji && (
            <div className="absolute bottom-10 z-20">
              <Suspense
                fallback={
                  <div className="rounded border bg-white p-2 text-xs">
                    Cargando…
                  </div>
                }
              >
                <EmojiPicker
                  onEmojiClick={(e) => {
                    onChange?.((value || "") + e.emoji);
                    setShowEmoji(false);
                  }}
                />
              </Suspense>
            </div>
          )}
        </div>

        {/* Adjuntar (placeholder) */}
        <button
          type="button"
          className="rounded border px-2 py-1"
          title="Adjuntar (próximamente)"
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
        >
          📎
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={() =>
            alert("Subida de archivos: backend pendiente de integrar.")
          }
        />

        {/* Dictado / Audio (placeholders) */}
        <button
          type="button"
          className="rounded border px-2 py-1"
          title="Dictado (próximamente)"
          onClick={() => alert("Dictado próximamente")}
          disabled={disabled}
        >
          🎤
        </button>
        <button
          type="button"
          className="rounded border px-2 py-1"
          title="Audio (próximamente)"
          onClick={() => alert("Audio próximamente")}
          disabled={disabled}
        >
          🔊
        </button>

        {/* Input */}
        <div className="flex-1">
          <textarea
            ref={taRef}
            rows={1}
            className="w-full max-h-24 resize-none rounded border px-3 py-2 text-sm leading-5 outline-none focus:ring-2 focus:ring-blue-200"
            placeholder={placeholder}
            value={value || ""}
            onChange={(e) => onChange?.(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
        </div>

        {/* Enviar */}
        <button
          type="button"
          className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          onClick={() => onSend?.()}
          disabled={disabled}
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
