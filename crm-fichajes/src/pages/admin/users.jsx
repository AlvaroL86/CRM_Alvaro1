// src/pages/admin/Users.jsx
import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../services/api";

function Modal({ open, onClose, children, title }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 bg-black/30 grid place-items-center">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-black">✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export default function Users() {
  const [rows, setRows] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    id: null, username: "", nombre: "", email: "", telefono: "",
    rol: "empleado", estado: 1, password: ""
  });

  const rolOptions = useMemo(() => roles.map(r => ({ value: r.slug, label: r.nombre || r.slug })), [roles]);

  const load = async () => {
    setErr(""); setLoading(true);
    try {
      const [u, r] = await Promise.all([apiGet("/usuarios"), apiGet("/roles")]);
      setRows(Array.isArray(u) ? u : []);
      setRoles(Array.isArray(r) ? r : []);
    } catch (e) {
      setErr(e.message || "Error al cargar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onNew = () => {
    setForm({ id: null, username: "", nombre: "", email: "", telefono: "", rol: rolOptions[0]?.value || "empleado", estado: 1, password: "" });
    setOpen(true);
  };

  const onEdit = (u) => {
    setForm({ id: u.id, username: u.username, nombre: u.nombre, email: u.email, telefono: u.telefono, rol: u.rol, estado: Number(u.estado) ? 1 : 0, password: "" });
    setOpen(true);
  };

  const onSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        username: form.username.trim(),
        nombre: form.nombre || "",
        email: form.email || "",
        telefono: form.telefono || "",
        rol: form.rol,
        estado: Number(form.estado) ? 1 : 0,
      };
      if (form.password) payload.password = form.password;

      if (form.id) await apiPatch(`/usuarios/${form.id}`, payload);
      else await apiPost(`/usuarios`, { ...payload, password: form.password || "123456" });

      setOpen(false);
      await load();
    } catch (e) {
      alert(e.message || "No se pudo guardar");
    }
  };

  const toggleEstado = async (u) => {
    try {
      await apiPatch(`/usuarios/${u.id}`, { estado: u.estado ? 0 : 1 });
      await load();
    } catch (e) {
      alert(e.message);
    }
  };

  const onDelete = async (u) => {
    if (!confirm(`Eliminar definitivamente al usuario "${u.username}"?`)) return;
    try {
      await apiDelete(`/usuarios/${u.id}`);
      await load();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-gray-500 text-sm">Gestiona los usuarios y su rol.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="rounded-lg bg-slate-100 px-3 py-2 hover:bg-slate-200">Recargar</button>
          <button onClick={onNew} className="rounded-lg bg-blue-600 text-white px-3 py-2 hover:bg-blue-700">Nuevo usuario</button>
        </div>
      </div>

      {err && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{err}</div>}
      {loading && <div className="text-gray-500">Cargando...</div>}

      {!loading && (
        <div className="overflow-x-auto rounded-xl bg-white shadow">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="p-3 text-left">Usuario</th>
                <th className="p-3 text-left">Nombre</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Teléfono</th>
                <th className="p-3 text-left">Rol</th>
                <th className="p-3 text-left">Estado</th>
                <th className="p-3 text-left w-44">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={7} className="p-4 text-gray-500">Sin usuarios.</td></tr>}
              {rows.map(u => (
                <tr key={u.id} className="border-t">
                  <td className="p-3">{u.username}</td>
                  <td className="p-3">{u.nombre}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.telefono}</td>
                  <td className="p-3 capitalize">{u.rol}</td>
                  <td className="p-3">{u.estado ? "Activo" : "Inactivo"}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => onEdit(u)} className="rounded bg-amber-500 px-3 py-1 text-white hover:bg-amber-600">Editar</button>
                      <button onClick={() => toggleEstado(u)} className="rounded bg-slate-700 px-3 py-1 text-white hover:bg-slate-800">
                        {u.estado ? "Desactivar" : "Activar"}
                      </button>
                      <button onClick={() => onDelete(u)} className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? "Editar usuario" : "Nuevo usuario"}>
        <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-600">Usuario</label>
            <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </div>
          <div>
            <label className="text-sm text-gray-600">Nombre</label>
            <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-gray-600">Email</label>
            <input type="email" className="mt-1 w-full rounded-lg border px-3 py-2" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-gray-600">Teléfono</label>
            <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-gray-600">Rol</label>
            <select className="mt-1 w-full rounded-lg border px-3 py-2"
              value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
              {rolOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600">Estado</label>
            <select className="mt-1 w-full rounded-lg border px-3 py-2"
              value={form.estado} onChange={(e) => setForm({ ...form, estado: Number(e.target.value) })}>
              <option value={1}>Activo</option>
              <option value={0}>Inactivo</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm text-gray-600">{form.id ? "Nueva contraseña (opcional)" : "Contraseña"}</label>
            <input className="mt-1 w-full rounded-lg border px-3 py-2" type="text"
              placeholder={form.id ? "Dejar vacío para no cambiarla" : "Mínimo 6 caracteres"}
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg bg-slate-100 px-3 py-2 hover:bg-slate-200">Cancelar</button>
            <button className="rounded-lg bg-blue-600 text-white px-3 py-2 hover:bg-blue-700">Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
