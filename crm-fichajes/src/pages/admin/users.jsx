// src/pages/admin/Users.jsx
import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPut } from "../../services/api";

const LIST_ENDPOINTS = ["/usuarios", "/admin/usuarios", "/users", "/admin/users"];
const ROLE_ENDPOINT_PATTERNS = [
  (id, rol) => [`/usuarios/${id}/rol`, { rol }],
  (id, rol) => [`/admin/usuarios/${id}/rol`, { rol }],
  (id, rol) => [`/users/${id}/role`, { role: rol }],
  (id, rol) => [`/admin/users/${id}/role`, { role: rol }],
  // fallback ultra-genérico por si tu back actualiza con PUT al recurso principal
  (id, rol) => [`/usuarios/${id}`, { rol }],
  (id, rol) => [`/admin/usuarios/${id}`, { rol }],
];

export default function Users() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      let data = null;
      let lastErr = null;
      for (const ep of LIST_ENDPOINTS) {
        try {
          const res = await apiGet(ep);
          if (Array.isArray(res)) {
            data = res;
            break;
          }
        } catch (e) {
          lastErr = e;
        }
      }
      if (!Array.isArray(data)) {
        throw lastErr || new Error("No se pudieron obtener los usuarios.");
      }

      // normaliza
      const norm = (data || []).map((u, i) => ({
        id: u.id || u.user_id || u.uuid || u._id || i + 1,
        nombre: u.nombre || u.name || u.username || u.email || `user_${i + 1}`,
        email: u.email || "",
        rol: (u.rol || u.role || "usuario").toLowerCase(),
        nif: u.nif || u.nif_empresa || u.tax_id || "",
      }));
      setRows(norm);
    } catch (e) {
      setErr(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((u) => {
      return (
        (u.nombre || "").toLowerCase().includes(term) ||
        (u.email || "").toLowerCase().includes(term) ||
        (u.rol || "").toLowerCase().includes(term)
      );
    });
  }, [rows, q]);

  const changeRole = async (id, rol) => {
    try {
      let ok = false;
      let lastErr = null;
      for (const build of ROLE_ENDPOINT_PATTERNS) {
        const [ep, body] = build(id, rol);
        try {
          await apiPut(ep, body);
          ok = true;
          break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (!ok) throw lastErr || new Error("No se pudo actualizar el rol.");
      await load();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Usuarios</h2>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, email o rol…"
            className="border rounded px-3 py-1.5 text-sm"
          />
          <button
            onClick={load}
            className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50"
            disabled={loading}
          >
            {loading ? "Cargando…" : "Reintentar"}
          </button>
        </div>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="bg-white rounded shadow overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="p-2">Nombre</th>
              <th className="p-2">Email</th>
              <th className="p-2">Rol</th>
              <th className="p-2">NIF</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-2 capitalize">{u.nombre}</td>
                <td className="p-2">{u.email}</td>
                <td className="p-2 capitalize">{u.rol}</td>
                <td className="p-2">{u.nif || "-"}</td>
                <td className="p-2">
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    defaultValue={u.rol}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                  >
                    <option value="usuario">usuario</option>
                    <option value="supervisor">supervisor</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="p-3 text-gray-500" colSpan={5}>
                  {loading ? "Cargando…" : "No hay usuarios"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">
        * Cambia el rol aquí. Solo <b>admin</b> y <b>supervisor</b> verán las
        aprobaciones/controles avanzados.
      </p>
    </div>
  );
}
