import { useState } from "react";

export default function ConfirmDeleteModal({ title="¿Eliminar?", onCancel, onConfirm }) {
  const [txt, setTxt] = useState("");
  const ok = txt.trim().toUpperCase() === "DELETE";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
      <div className="w-full max-w-md rounded bg-white p-4 shadow">
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        <p className="text-sm text-gray-600">Escribe <b>DELETE</b> para confirmar.</p>
        <input className="mt-2 w-full rounded border px-2 py-1" value={txt} onChange={(e)=>setTxt(e.target.value)} />
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded border px-3 py-1" onClick={onCancel}>Cancelar</button>
          <button className="rounded bg-red-600 px-3 py-1 text-white disabled:opacity-50" disabled={!ok} onClick={onConfirm}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}
