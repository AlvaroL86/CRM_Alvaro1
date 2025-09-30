// src/pages/chat/NewChatModal.jsx
import { useEffect, useState } from "react";

export default function NewChatModal({ open, onClose, onCreated, onlineList = [] }) {
  const [name, setName] = useState("");
  const [membersText, setMembersText] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    setMembersText("");
  }, [open]);

  function ok() {
    const members = membersText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((n, i) => ({ id: `u-${i}-${n}`, name: n }));
    if (!name.trim()) return;
    onCreated?.({ name: name.trim(), members });
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[480px] rounded bg-white p-4 shadow">
        <div className="mb-3 text-lg font-semibold">Nuevo chat grupal</div>

        <label className="mb-1 block text-sm">Nombre del grupo</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-3 w-full rounded border p-2"
          placeholder="Soporte, Ventas, Proyecto A…"
        />

        <label className="mb-1 block text-sm">Participantes (separados por coma)</label>
        <input
          value={membersText}
          onChange={(e) => setMembersText(e.target.value)}
          className="mb-4 w-full rounded border p-2"
          placeholder="Laura, Pedro, Marta"
        />

        <div className="flex justify-end gap-2">
          <button className="rounded border px-3 py-2" onClick={onClose}>Cancelar</button>
          <button className="rounded bg-blue-600 px-3 py-2 text-white" onClick={ok}>Crear</button>
        </div>
      </div>
    </div>
  );
}
