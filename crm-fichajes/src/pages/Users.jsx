// src/pages/Users.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  apiGet, apiPost, apiPatch, apiDelete, BASE_URL as API_BASE, readUser as apiReadUser,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";

const ROLES = ["empleado", "supervisor", "admin"];
const ESTADOS = [{ value: 1, label: "Activo" }, { value: 0, label: "Inactivo" }];

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded bg-white shadow-lg">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="rounded border px-2 py-1 text-sm">X</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export default function Users() {
  const navigate = useNavigate();
  const { user: sessionUser } = useAuth();

  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState(null);

  const [openNew, setOpenNew] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  const [nu, setNu] = useState({
    username: "", nombre: "", email: "", telefono: "", rol: "empleado",
    password: "", estado: 1, nif: "",
  });

  const [cu, setCu] = useState({
    id: "", username: "", nombre: "", email: "", telefono: "",
    rol: "empleado", password: "", estado: 1, nif: "",
  });

  useEffect(() => {
    if (sessionUser?.nif) setNu((p) => ({ ...p, nif: sessionUser.nif }));
  }, [sessionUser]);

  const canCreate = useMemo(() => {
    const r = (sessionUser?.rol || "").toLowerCase();
    return r === "admin" || r === "supervisor";
  }, [sessionUser]);

  async function load() {
    setErr(""); setLoading(true);
    try {
      const data = await apiGet("/usuarios");
      setRows(Array.isArray(data) ? data : []);
      setMe(apiReadUser());
    } catch (e) { setErr(e.message || "Error al cargar usuarios"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const desactivar = async (id, nuevoEstado) => {
    if (!confirm(nuevoEstado === 1 ? "¿Activar usuario?" : "¿Desactivar usuario?")) return;
    setLoading(true); setErr("");
    try { await apiPatch(`/usuarios/${id}`, { estado: nuevoEstado }); await load(); }
    catch (e) { setErr(e.message || "Error al cambiar estado"); }
    finally { setLoading(false); }
  };

  const onCreate = async (e) => {
    e.preventDefault(); setErr("");
    if (!nu.username?.trim() || !nu.password?.trim() || !nu.email?.trim() || !nu.telefono?.trim()) {
      setErr("username, password, email y teléfono son obligatorios"); return;
    }
    setLoading(true);
    try {
      const payload = {
        username: nu.username.trim(), nombre: nu.nombre?.trim() || "",
        email: nu.email.trim(), telefono: nu.telefono.trim(),
        rol: nu.rol, password: nu.password, estado: Number(nu.estado) ? 1 : 0,
        nif: (nu.nif || "").trim(),
      };
      const out = await apiPost("/usuarios", payload);
      setOpenNew(false);
      setNu({ username:"", nombre:"", email:"", telefono:"", rol:"empleado", password:"", estado:1, nif: sessionUser?.nif || "" });
      await load();
    } catch (e) {
      const m = String(e.message || "");
      if (m.includes("username_duplicado")) setErr("El usuario ya existe");
      else if (m.includes("email_duplicado")) setErr("Ese email ya está en uso");
      else if (m.includes("telefono_duplicado")) setErr("Ese teléfono ya está en uso");
      else if (m.includes("nif_obligatorio")) setErr("Debes indicar el NIF de empresa");
      else setErr(m || "Error al crear");
    } finally { setLoading(false); }
  };

  const onSaveEdit = async (e) => {
    e.preventDefault(); setErr("");
    if (!cu.id) return;
    setLoading(true);
    try {
      const payload = {
        username: cu.username?.trim(), nombre: cu.nombre?.trim(), email: cu.email?.trim(),
        telefono: cu.telefono?.trim(), rol: cu.rol, estado: Number(cu.estado) ? 1 : 0,
        nif: (cu.nif || "").trim(),
      };
      if (cu.password?.trim()) payload.password = cu.password.trim();
      await apiPatch(`/usuarios/${cu.id}`, payload);
      setOpenEdit(false); await load();
    } catch (e) {
      const m = String(e.message || "");
      if (m.includes("username_duplicado")) setErr("El usuario ya existe");
      else if (m.includes("email_duplicado")) setErr("Ese email ya está en uso");
      else if (m.includes("telefono_duplicado")) setErr("Ese teléfono ya está en uso");
      else if (m.includes("nif_obligatorio")) setErr("Debes indicar el NIF de empresa");
      else setErr(m || "Error al guardar");
    } finally { setLoading(false); }
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Usuarios</h2>
          <p className="text-xs text-gray-500">API: {API_BASE} · Yo: {me ? `${me.username || me.nombre} · rol:${me.rol} · nif:${me.nif||"—"}` : "(sin whoami)"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={load} disabled={loading} className="rounded border px-3 py-2 text-sm">Recargar</button>
          <button onClick={() => navigate("/admin/users-roles")} className="rounded border px-3 py-2 text-sm">Roles y permisos</button>
          {canCreate && (
            <button onClick={() => setOpenNew(true)} className="rounded bg-blue-600 px-3 py-2 text-sm text-white">
              Nuevo usuario
            </button>
          )}
        </div>
      </div>

      {err && <div className="mb-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-800">{err}</div>}

      <div className="overflow-x-auto rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="p-2">Usuario</th><th className="p-2">Nombre</th><th className="p-2">Email</th>
              <th className="p-2">Teléfono</th><th className="p-2">Rol</th><th className="p-2">Estado</th><th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-2">{u.username}</td>
                <td className="p-2">{u.nombre}</td>
                <td className="p-2">{u.email}</td>
                <td className="p-2">{u.telefono}</td>
                <td className="p-2">{u.rol}</td>
                <td className="p-2">
                  {Number(u.estado) ? <span className="rounded bg-green-100 px-2 py-0.5 text-green-800">Activo</span>
                                     : <span className="rounded bg-gray-200 px-2 py-0.5 text-gray-700">Inactivo</span>}
                </td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => { setCu({
                        id: u.id, username: u.username || "", nombre: u.nombre || "", email: u.email || "",
                        telefono: u.telefono || "", rol: u.rol || "empleado", password: "", estado: Number(u.estado) ? 1 : 0,
                        nif: u.nif || "",
                      }); setOpenEdit(true); }}
                      className="rounded bg-amber-500 px-2 py-1 text-white">Editar</button>
                    <button onClick={() => desactivar(u.id, Number(u.estado) ? 0 : 1)}
                            className="rounded bg-gray-600 px-2 py-1 text-white">
                      {Number(u.estado) ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr><td className="p-4 text-center text-gray-500" colSpan={7}>Sin usuarios.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* NUEVO */}
      <Modal open={openNew} onClose={() => setOpenNew(false)} title="Crear usuario">
        <form onSubmit={onCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input className="rounded border p-2" placeholder="username *" value={nu.username} onChange={(e)=>setNu({...nu,username:e.target.value})}/>
          <input className="rounded border p-2" placeholder="Nombre" value={nu.nombre} onChange={(e)=>setNu({...nu,nombre:e.target.value})}/>
          <input className="rounded border p-2" placeholder="Email *" value={nu.email} onChange={(e)=>setNu({...nu,email:e.target.value})}/>
          <input className="rounded border p-2" placeholder="Teléfono *" value={nu.telefono} onChange={(e)=>setNu({...nu,telefono:e.target.value})}/>
          <PasswordInput value={nu.password} onChange={(e)=>setNu({...nu,password:e.target.value})} placeholder="Password *" required />
          <input className="rounded border p-2" placeholder="NIF empresa *" value={nu.nif} onChange={(e)=>setNu({...nu,nif:e.target.value})}/>
          <select className="rounded border p-2" value={nu.rol} onChange={(e)=>setNu({...nu,rol:e.target.value})}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select className="rounded border p-2" value={nu.estado} onChange={(e)=>setNu({...nu,estado:Number(e.target.value)})}>
            {ESTADOS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
          </select>
          <div className="sm:col-span-2">
            <button disabled={loading} className="rounded bg-blue-600 px-3 py-2 text-white">Crear</button>
          </div>
        </form>
      </Modal>

      {/* EDITAR */}
      <Modal open={openEdit} onClose={() => setOpenEdit(false)} title="Editar usuario">
        <form onSubmit={onSaveEdit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input className="rounded border p-2" placeholder="username" value={cu.username} onChange={(e)=>setCu({...cu,username:e.target.value})}/>
          <input className="rounded border p-2" placeholder="Nombre" value={cu.nombre} onChange={(e)=>setCu({...cu,nombre:e.target.value})}/>
          <input className="rounded border p-2" placeholder="Email" value={cu.email} onChange={(e)=>setCu({...cu,email:e.target.value})}/>
          <input className="rounded border p-2" placeholder="Teléfono" value={cu.telefono} onChange={(e)=>setCu({...cu,telefono:e.target.value})}/>
          <PasswordInput value={cu.password} onChange={(e)=>setCu({...cu,password:e.target.value})} placeholder="Password (opcional)" />
          <input className="rounded border p-2" placeholder="NIF empresa *" value={cu.nif} onChange={(e)=>setCu({...cu,nif:e.target.value})}/>
          <select className="rounded border p-2" value={cu.rol} onChange={(e)=>setCu({...cu,rol:e.target.value})}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select className="rounded border p-2" value={cu.estado} onChange={(e)=>setCu({...cu,estado:Number(e.target.value)})}>
            {ESTADOS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
          </select>
          <div className="sm:col-span-2">
            <button disabled={loading} className="rounded bg-blue-600 px-3 py-2 text-white">Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
