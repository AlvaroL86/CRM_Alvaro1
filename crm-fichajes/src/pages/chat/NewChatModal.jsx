import { useEffect, useState } from "react";

export default function NewChatModal({ open, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [membersText, setMembersText] = useState(""); // coma separada (ids o nombres)

  useEffect(() => {
    if (!open) { setName(""); setDesc(""); setMembersText(""); }
  }, [open]);

  if (!open) return null;

  function submit(e) {
    e.preventDefault();
    const members = membersText.split(',').map(s => s.trim()).filter(Boolean);
    if (!name.trim()) return;
    onCreated?.({ name: name.trim(), description: desc.trim(), members });
    onClose?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} className="w-full max-w-lg rounded bg-white p-4 shadow">
        <div className="mb-3 text-lg font-semibold">Nuevo chat de grupo</div>

        <label className="mb-2 block text-sm">Nombre del grupo</label>
        <input className="mb-3 w-full rounded border px-3 py-2" value={name} onChange={e=>setName(e.target.value)} />

        <label className="mb-2 block text-sm">Descripción (opcional)</label>
        <textarea className="mb-3 w-full rounded border px-3 py-2" rows={2} value={desc} onChange={e=>setDesc(e.target.value)} />

        <label className="mb-2 block text-sm">Miembros (separados por coma)</label>
        <input className="mb-4 w-full rounded border px-3 py-2" placeholder="alvaro, laura, ..." value={membersText} onChange={e=>setMembersText(e.target.value)} />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border px-3 py-2">Cancelar</button>
          <button type="submit" className="rounded bg-blue-600 px-3 py-2 text-white">Crear</button>
        </div>
      </form>
    </div>
  );
}
