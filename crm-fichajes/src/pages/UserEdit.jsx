import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiGet, apiPost } from "../services/api";

export default function UserEdit() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [menus, setMenus] = useState([]);
  const [perms, setPerms] = useState([]);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setErr(""); setOk("");
        const u = await apiGet(`/usuarios/${id}`);
        setUser(u);
        const { menus, permisos } = await apiGet(`/menus/permisos/${id}`);
        setMenus(menus);
        setPerms(permisos);
      } catch (e) { setErr(e.message); }
    })();
  }, [id]);

  function getPerm(menu_key) {
    return perms.find(p => p.menu_key === menu_key) || { can_view: 0, can_edit: 0 };
  }
  function toggle(menu_key, field) {
    const idx = perms.findIndex(p => p.menu_key === menu_key);
    const next = [...perms];
    if (idx === -1) next.push({ menu_key, can_view: field==='can_view'?1:0, can_edit: field==='can_edit'?1:0 });
    else next[idx] = { ...next[idx], [field]: next[idx][field] ? 0 : 1 };
    setPerms(next);
  }

  async function guardarPermisos() {
    try {
      setErr(""); setOk("");
      await apiPost(`/menus/permisos/${id}`, { permisos: perms });
      setOk("Permisos guardados.");
    } catch (e) { setErr(e.message); }
  }

  if (!user) return <p className="text-gray-600">Cargando...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Editar usuario</h2>
      {err && <p className="text-red-600">{err}</p>}
      {ok && <p className="text-green-700">{ok}</p>}

      <div className="bg-white p-4 rounded shadow grid grid-cols-1 sm:grid-cols-2 gap-3 text-gray-800">
        <div><b>Usuario:</b> {user.username}</div>
        <div><b>Nombre:</b> {user.nombre}</div>
        <div><b>Email:</b> {user.email || '-'}</div>
        <div><b>Teléfono:</b> {user.telefono || '-'}</div>
        <div><b>Rol:</b> {user.rol}</div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold text-gray-800 mb-3">Permisos de menú</h3>
        <div className="space-y-2">
          {menus.map(m => {
            const p = getPerm(m.menu_key);
            return (
              <div key={m.menu_key} className="flex items-center justify-between border-b py-2 text-gray-800">
                <div>
                  <div className="font-medium">{m.label}</div>
                  <div className="text-sm text-gray-500">{m.path || '-'}</div>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!p.can_view} onChange={() => toggle(m.menu_key,'can_view')} />
                    Ver
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!p.can_edit} onChange={() => toggle(m.menu_key,'can_edit')} />
                    Editar
                  </label>
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={guardarPermisos} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Guardar permisos
        </button>
      </div>
    </div>
  );
}
