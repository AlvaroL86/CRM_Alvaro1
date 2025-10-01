// src/pages/chat/InputBar.jsx
import { useState, lazy, Suspense } from "react";

const EmojiPicker = lazy(() => import('emoji-picker-react'));

export default function InputBar({ value, onChange, onSend }) {
  const [openEmoji, setOpenEmoji] = useState(false);

  const handleEmoji = (e) => {
    const emoji = e?.emoji || '';
    onChange(value + emoji);
  };

  const send = () => {
    if (String(value).trim()) onSend(String(value).trim());
  };

  return (
    <div className="relative mt-2 flex items-start gap-2">
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          className="rounded px-2 py-1 text-xl"
          title="Emojis"
          onClick={() => setOpenEmoji(v => !v)}
        >😊</button>

        <button type="button" className="rounded px-2 py-1" title="Adjuntar archivo">📎</button>
        <button type="button" className="rounded px-2 py-1" title="Dictar">🎤</button>
        <button type="button" className="rounded px-2 py-1" title="Audio">🔊</button>
        {/* vídeo lo dejamos preparado */}
        {/* <button type="button" className="rounded px-2 py-1" title="Video">📹</button> */}
      </div>

      <div className="flex-1">
        <textarea
          rows={2}
          className="w-full rounded border px-3 py-2"
          placeholder="Escribe un mensaje..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }}}
        />
      </div>

      <button onClick={send} className="h-10 rounded bg-blue-600 px-4 text-white mt-2">Enviar</button>

      {openEmoji && (
        <div className="absolute -top-2 left-0 z-20 translate-y-[-100%] rounded border bg-white shadow">
          <Suspense fallback={<div className="p-2 text-sm">Cargando…</div>}>
            <EmojiPicker onEmojiClick={handleEmoji} lazyLoadEmojis />
          </Suspense>
        </div>
      )}
    </div>
  );
}
