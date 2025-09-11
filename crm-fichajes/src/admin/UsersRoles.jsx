// src/pages/admin/UsersRoles.jsx
import { useEffect, useState, useMemo } from "react";
import { apiGet, apiPut } from "../../services/api";

export default function UsersRoles() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [loadingId, setLoadingId] = useState(null);
  const [q, setQ] = useState("");

  const load = async () => {
    setErr("");
    try {
      const data = await apiGet("/usuarios");
      const norm = (Array.isArray(data) ? data : []).map((u, i) => ({
        id: u.id ?? u.user_id ?? i + 1,
        username:
          u.username ??
          u.user ??
          (u.email ? u.email.split("@")[0] : "") ??
          "",
        nombre: u.nombre ?? u.name ?? "",
        email: u.email ?? "",
        rol: String(u.rol ?? u.role ?? "empleado").toLowerCase(),
        nif: u.nif ?? u.nif_empresa ?? u.empresa_nif ?? "",
        estado:
          typeof u.estado === "boolean"
            ? u.estado
            : Number(u.estado ?? 1) === 1,
      }));
      setRows(norm);
    } catch (e) {
      setErr(e.message || "Error cargando usuarios");
      setRows([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.username.toLowerCase().includes(s) ||
        (r.nombre || "").toLowerCase().includes(s) ||
        (r.email || "").toLowerCase().includes(s) ||
        (r.nif || "").toLowerCase().includes(s) ||
        (r.rol || "").toLowerCase().includes(s)
    );
  }, [rows, q]);

  const changeRole = async (id, rol) => {
    try {
      setLoadingId(id);
      await apiPut(`/usuarios/${id}/rol`, { rol });
      await load();
    } catch (e) {
      alert(e.message || "No se pudo cambiar el rol");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <h2 className="text-2xl font-bold text-gray-800">Usuarios (roles)</h2>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, email, NIF o rol…"
          className="w-full rounded border px-3 py-2 md:w-80"
        />
      </div>

      {err && (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="overflow-x-auto rounded bg-white shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr className="text-left">
              <th className="p-2">Usuario</th>
              <th className="p-2">Nombre</th>
              <th className="p-2">Email</th>
              <th className="p-2">NIF</th>
              <th className="p-2">Rol</th>
              <th className="p-2">Cambiar rol</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-2">{u.username || "-"}</td>
                <td className="p-2 capitalize">{u.nombre || "-"}</td>
                <td className="p-2">{u.email || "-"}</td>
                <td className="p-2">{u.nif || "-"}</td>
                <td className="p-2 capitalize">{u.rol}</td>
                <td className="p-2">
                  <select
                    className="rounded border px-2 py-1 text-sm"
                    defaultValue={u.rol}
                    disabled={loadingId === u.id}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                  >
                    {/* Usa los mismos roles que tu CRUD principal */}
                    <option value="empleado">empleado</option>
                    <option value="supervisor">supervisor</option>
                    <option value="admin">admin</option>
                  </select>
                  {loadingId === u.id && (
                    <span className="ml-2 text-xs text-gray-500">Guardando…</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="p-3 text-gray-500" colSpan={6}>
                  Sin usuarios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">
        * Solo <b>admin</b> y opcionalmente <b>supervisor</b> deberían poder
        ver esta pantalla. Ajusta la ruta con <code>roles</code> en tu
        <code>PrivateRoute</code>.
      </p>
    </div>
  );
}
