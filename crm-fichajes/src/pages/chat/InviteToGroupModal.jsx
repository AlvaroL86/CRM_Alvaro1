import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../../services/api";

export default function InviteToGroupModal({ roomId, preselectUserId = null, onClose }) {
  const [users, setUsers] = useState([]);       // candidatos
  const [selected, setSelected] = useState(new Set());
  const [term, setTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  // Carga candidatos (intenta plural y si falla singular / fallback general)
  const loadCandidates = async () => {
    setLoading(true); setErr("");
    try {
      try {
        const r = await apiGet(`/chat/rooms/${roomId}/invitable`);
        setUsers(Array.isArray(r) ? r : []);
      } catch {
        try {
          const r = await apiGet(`/chat/room/${roomId}/invitable`);
          setUsers(Array.isArray(r) ? r : []);
        } catch {
          // Fallback muy básico: todos los usuarios
          const r = await apiGet(`/usuarios`);
          setUsers(Array.isArray(r) ? r : []);
        }
      }
    } catch (e) {
      setErr(e.message || "No se pudieron cargar usuarios invitable.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, [roomId]);

  // Preselección si llega por props
  useEffect(() => {
    if (preselectUserId) setSelected(new Set([preselectUserId]));
  }, [preselectUserId]);

  const toggle = (uid) => {
    const next = new Set(selected);
    if (next.has(uid)) next.delete(uid);
    else next.add(uid);
    setSelected(next);
  };

  const visible = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u => {
      const s = `${u.nombre || ""} ${u.email || ""} ${u.id || ""}`.toLowerCase();
      return s.includes(q);
    });
  }, [users, term]);

  const invite = async () => {
    if (!selected.size) return;
    setSending(true); setErr("");
    const payload = { userIds: Array.from(selected) };
    try {
      try {
        await apiPost(`/chat/rooms/${roomId}/members`, payload);
      } catch {
        await apiPost(`/chat/room/${roomId}/members`, payload);
      }
      onClose?.();
    } catch (e) {
      setErr(e.message || "No se pudo invitar.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-base font-semibold">Invitar a grupo</h3>
          <button className="text-gray-500 hover:text-gray-800" onClick={onClose}>✕</button>
        </div>

        <div className="px-4 py-3">
          <input
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar por nombre o email…"
            className="mb-3 w-full rounded border px-3 py-2 text-sm outline-none focus:ring"
          />

          <div className="max-h-64 overflow-auto rounded border">
            {loading ? (
              <div className="p-3 text-sm text-gray-500">Cargando…</div>
            ) : err ? (
              <div className="p-3 text-sm text-red-600">{err}</div>
            ) : visible.length === 0 ? (
              <div className="p-3 text-sm text-gray-500">Sin resultados</div>
            ) : (
              <ul className="divide-y">
                {visible.map((u) => {
                  const label = u.nombre || u.email || u.id;
                  const checked = selected.has(u.id);
                  return (
                    <li
                      key={u.id}
                      className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-50"
                      onClick={() => toggle(u.id)}
                      title={label}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(u.id)}
                        className="h-4 w-4"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="truncate">{label}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
          <div className="text-sm text-gray-500">
            {selected.size ? `${selected.size} seleccionado(s)` : "Nadie seleccionado"}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
              onClick={onClose}
              disabled={sending}
            >
              Cancelar
            </button>
            <button
              className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              onClick={invite}
              disabled={sending || selected.size === 0}
              title={selected.size === 0 ? "Selecciona al menos un usuario" : "Invitar"}
            >
              {sending ? "Invitando…" : "Invitar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
