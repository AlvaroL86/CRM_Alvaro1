import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../services/api";

function Modal({ open, onClose, children, title }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg w-full max-w-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="px-2 py-1 border rounded">X</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Users() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  // Crear
  const [openNew, setOpenNew] = useState(false);
  const [nu, setNu] = useState({ username:"", nombre:"", email:"", telefono:"", rol:"empleado", password:"" });

  // Editar
  const [openEdit, setOpenEdit] = useState(false);
  const [cu, setCu] = useState(null); // current user form

  async function cargar() {
    try {
      setErr("");
      const data = await apiGet('/usuarios');
      setRows(data);
    } catch (e) { setErr(e.message); }
  }
  useEffect(() => { cargar(); }, []);

  async function crear(e) {
    e.preventDefault();
    try {
      await apiPost('/usuarios', nu);
      setOpenNew(false);
      setNu({ username:"", nombre:"", email:"", telefono:"", rol:"empleado", password:"" });
      await cargar();
    } catch (e) { setErr(e.message); }
  }

  async function guardar(e) {
    e.preventDefault();
    try {
      const body = { ...cu };
      delete body.id; delete body.username; // username no editable aquí
      await apiPut(`/usuarios/${cu.id}`, body);
      setOpenEdit(false);
      setCu(null);
      await cargar();
    } catch (e) { setErr(e.message); }
  }

  async function desactivar(id) {
    if (!confirm('¿Desactivar usuario?')) return;
    try {
      await apiDelete(`/usuarios/${id}`);
      await cargar();
    } catch (e) { setErr(e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Usuarios</h2>
        <button onClick={() => setOpenNew(true)} className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Crear usuario
        </button>
      </div>
      {err && <p className="text-red-600">{err}</p>}

      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-800">
            <tr>
              <th className="p-2 text-left">Usuario</th>
              <th className="p-2 text-left">Nombre</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Teléfono</th>
              <th className="p-2 text-left">Rol</th>
              <th className="p-2 text-left">Estado</th>
              <th className="p-2 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(u => (
              <tr key={u.id} className="border-b text-gray-800">
                <td className="p-2">{u.username}</td>
                <td className="p-2">{u.nombre || '-'}</td>
                <td className="p-2">{u.email || '-'}</td>
                <td className="p-2">{u.telefono || '-'}</td>
                <td className="p-2">{u.rol}</td>
                <td className="p-2">{u.estado ? 'Activo':'Inactivo'}</td>
                <td className="p-2 space-x-2">
                  <button onClick={() => { setCu(u); setOpenEdit(true); }} className="px-2 py-1 bg-amber-500 text-white rounded">Editar</button>
                  <button onClick={() => desactivar(u.id)} className="px-2 py-1 bg-gray-600 text-white rounded">Desactivar</button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td className="p-3 text-gray-600" colSpan={7}>Sin usuarios.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal crear */}
      <Modal open={openNew} onClose={() => setOpenNew(false)} title="Crear usuario">
        <form onSubmit={crear} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className="border rounded p-2" placeholder="Usuario" value={nu.username} onChange={e=>setNu({...nu, username:e.target.value})} required />
          <input className="border rounded p-2" placeholder="Nombre" value={nu.nombre} onChange={e=>setNu({...nu, nombre:e.target.value})} />
          <input className="border rounded p-2" placeholder="Email" value={nu.email} onChange={e=>setNu({...nu, email:e.target.value})} />
          <input className="border rounded p-2" placeholder="Teléfono" value={nu.telefono} onChange={e=>setNu({...nu, telefono:e.target.value})} />
          <select className="border rounded p-2" value={nu.rol} onChange={e=>setNu({...nu, rol:e.target.value})}>
            <option value="empleado">empleado</option>
            <option value="supervisor">supervisor</option>
            <option value="admin">admin</option>
          </select>
          <input className="border rounded p-2" placeholder="Contraseña (opcional)" value={nu.password} onChange={e=>setNu({...nu, password:e.target.value})} />
          <div className="sm:col-span-2">
            <button className="px-3 py-2 bg-blue-600 text-white rounded">Crear</button>
          </div>
        </form>
      </Modal>

      {/* Modal editar */}
      <Modal open={openEdit} onClose={() => setOpenEdit(false)} title="Editar usuario">
        {cu && (
          <form onSubmit={guardar} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className="border rounded p-2 bg-gray-100" value={cu.username} readOnly />
            <input className="border rounded p-2" placeholder="Nombre" value={cu.nombre || ''} onChange={e=>setCu({...cu, nombre:e.target.value})} />
            <input className="border rounded p-2" placeholder="Email" value={cu.email || ''} onChange={e=>setCu({...cu, email:e.target.value})} />
            <input className="border rounded p-2" placeholder="Teléfono" value={cu.telefono || ''} onChange={e=>setCu({...cu, telefono:e.target.value})} />
            <select className="border rounded p-2" value={cu.rol} onChange={e=>setCu({...cu, rol:e.target.value})}>
              <option value="empleado">empleado</option>
              <option value="supervisor">supervisor</option>
              <option value="admin">admin</option>
            </select>
            <select className="border rounded p-2" value={cu.estado ? 1 : 0} onChange={e=>setCu({...cu, estado:Number(e.target.value)})}>
              <option value={1}>Activo</option>
              <option value={0}>Inactivo</option>
            </select>
            <input className="border rounded p-2" type="password" placeholder="Nueva contraseña (opcional)" onChange={e=>setCu({...cu, password:e.target.value})} />
            <div className="sm:col-span-2">
              <button className="px-3 py-2 bg-blue-600 text-white rounded">Guardar</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
