import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../services/api";

function Chip({ children, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700 ring-1 ring-blue-200">
      {children}
      <button onClick={onRemove} className="text-blue-500 hover:text-blue-700">✕</button>
    </span>
  );
}

function useDebouncedValue(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function NewChatModal({ open, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("private"); // private | group
  const [picked, setPicked] = useState([]);    // [{id, nombre, username, email}]
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const debounced = useDebouncedValue(q, 250);

  // Buscar invitables
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const data = await apiGet(`/usuarios/invitables?q=${encodeURIComponent(debounced)}`);
        setResults(data || []);
      } catch {
        setResults([]);
      }
    })();
  }, [debounced, open]);

  useEffect(() => {
    if (open) {
      setErr("");
      setPicked([]);
      setQ("");
      setResults([]);
      setType("private");
      setName("");
    }
  }, [open]);

  const togglePick = (u) => {
    setPicked((prev) =>
      prev.some(x => x.id === u.id)
        ? prev.filter(x => x.id !== u.id)
        : [...prev, u]
    );
  };

  const removePick = (id) => setPicked((prev) => prev.filter((x) => x.id !== id));

  const canCreate =
    type === "private" ? picked.length === 1
    : type === "group" ? picked.length >= 2
    : false;

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!name.trim()) return setErr("El nombre es obligatorio.");
    if (!canCreate) {
      return setErr(type === "private"
        ? "El chat privado necesita exactamente 1 persona."
        : "Selecciona al menos 2 personas para el grupo.");
    }

    setLoading(true);
    try {
      const members = picked.map(p => p.id);
      const payload = { name, type: type === "private" ? "privado" : "grupo", members };
      const data = await apiPost("/chat/rooms", payload); // { id }
      onCreate?.(data || { id: null, type: payload.type });
      onClose?.();
    } catch (e2) {
      setErr(e2.message || "No se pudo crear el chat.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={(e)=>e.target===e.currentTarget && onClose?.()}>
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-base font-semibold text-gray-900">Crear nuevo chat</h3>
          <button onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-gray-100">✕</button>
        </div>

        <form onSubmit={submit} className="space-y-4 px-5 py-4">
          {err && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs text-gray-600">Nombre</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Equipo Soporte"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Tipo</label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="private">Privado (1 a 1)</option>
                <option value="group">Grupo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-600">Añadir personas</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              placeholder="Escribe para buscar (nombre, usuario o email)…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            <div className="mt-2 max-h-40 overflow-auto rounded-lg border">
              {results.length === 0 ? (
                <div className="p-3 text-sm text-gray-500">Sin resultados</div>
              ) : (
                results.map((p) => (
                  <label key={p.id} className="flex cursor-pointer items-center justify-between border-b px-3 py-2 last:border-0 hover:bg-gray-50">
                    <div>
                      <div className="text-sm font-medium text-gray-800">{p.label || p.nombre || p.username}</div>
                      <div className="text-xs text-gray-500">{p.username || p.email}</div>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={picked.some(x => x.id === p.id)}
                      onChange={() => togglePick(p)}
                    />
                  </label>
                ))
              )}
            </div>

            {picked.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {picked.map((p) => (
                  <Chip key={p.id} onRemove={() => removePick(p.id)}>
                    {p.label || p.nombre || p.username}
                  </Chip>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
              Cancelar
            </button>
            <button disabled={loading || !canCreate} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Creando…" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
