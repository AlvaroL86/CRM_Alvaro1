// src/pages/admin/UsersRoles.jsx
import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../../services/api";

/**
 * Definición de módulos/acciones disponibles
 * - Cada módulo tiene "label", y un diccionario de acciones.
 * - El UI solo muestra acciones cuando el módulo está "activo".
 */
const MODULES = {
  dashboard: { label: "Dashboard", actions: { view: "Ver Dashboard" } },
  chat:      { label: "Chat",      actions: { view: "Ver chat", send: "Enviar mensajes", manage: "Gestionar chats" } },
  fichajes:  { label: "Fichajes",  actions: { listar: "Listar", crear: "Crear", aprobar: "Aprobar" } },
  clientes:  { label: "Clientes",  actions: { listar: "Listar", crear: "Crear", editar: "Editar", eliminar: "Eliminar" } },
  tickets:   { label: "Tickets",   actions: { listar: "Listar", crear: "Crear", editar: "Editar", cerrar: "Cerrar" } },
  usuarios:  { label: "Usuarios",  actions: { usersview: "Ver usuarios", userscreate: "Crear usuarios", usersedit: "Editar usuarios", usersdelete: "Eliminar usuarios" } },
};

const emptyPerms = () => ({
  modules: Object.fromEntries(Object.keys(MODULES).map(k => [k, { active: false, actions: {} }]))
});

function Switch({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex h-6 w-11 items-center rounded-full transition ${checked ? "bg-blue-600" : "bg-slate-300"}`}
    >
      <span className={`h-5 w-5 bg-white rounded-full transition ${checked ? "translate-x-5" : "translate-x-1"}`} />
    </button>
  );
}

export default function UsersRoles() {
  const [roles, setRoles] = useState([]);
  const [sel, setSel] = useState(null); // slug seleccionado
  const [form, setForm] = useState({ slug: "", nombre: "", descripcion: "", permisos: emptyPerms() });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr(""); setLoading(true);
    try {
      const data = await apiGet("/roles");
      setRoles(Array.isArray(data) ? data : []);
      if (data?.length && !sel) setSel(data[0].slug);
    } catch (e) { setErr(e.message || "Error al cargar"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!sel) return;
    const r = roles.find(x => x.slug === sel);
    if (r) {
      setForm({
        slug: r.slug,
        nombre: r.nombre || r.slug,
        descripcion: r.descripcion || "",
        permisos: normalizePerms(r.permisos),
      });
    }
  }, [sel, roles]);

  const normalizePerms = (p) => {
    const base = emptyPerms();
    const src = p?.modules || {};
    for (const k of Object.keys(base.modules)) {
      const m = src[k] || {};
      base.modules[k].active = !!m.active;
      base.modules[k].actions = { ...(m.actions || {}) };
    }
    return base;
  };

  const onNewRole = async () => {
    const slug = prompt("Slug del nuevo rol (minúsculas, sin espacios):")?.trim();
    if (!slug) return;
    try {
      await apiPost("/roles", { slug, nombre: slug, descripcion: "", permisos: emptyPerms() });
      await load();
      setSel(slug);
    } catch (e) {
      alert(e.message || "No se pudo crear el rol");
    }
  };

  const onDeleteRole = async () => {
    if (!sel) return;
    if (!confirm(`Eliminar rol "${sel}"?`)) return;
    try {
      await apiDelete(`/roles/${sel}`);
      await load();
      setSel(null);
    } catch (e) {
      alert(e.message);
    }
  };

  const onSave = async () => {
    try {
      await apiPut(`/roles/${form.slug}`, {
        nombre: form.nombre || form.slug,
        descripcion: form.descripcion || "",
        permisos: form.permisos,
      });
      await load();
      alert("Guardado");
    } catch (e) {
      alert(e.message || "No se pudo guardar");
    }
  };

  const toggleModule = (k, v) => {
    setForm(f => ({ ...f, permisos: {
      ...f.permisos,
      modules: { ...f.permisos.modules, [k]: { ...f.permisos.modules[k], active: v } }
    }}));
  };

  const toggleAction = (k, action, v) => {
    setForm(f => {
      const mod = f.permisos.modules[k];
      const actions = { ...(mod.actions || {}) };
      actions[action] = v;
      return { ...f, permisos: { ...f.permisos, modules: { ...f.permisos.modules, [k]: { ...mod, actions }}}};
    });
  };

  const selectAll = (k, v) => {
    const all = {};
    Object.keys(MODULES[k].actions).forEach(a => all[a] = !!v);
    setForm(f => {
      const mod = f.permisos.modules[k];
      return { ...f, permisos: { ...f.permisos, modules: { ...f.permisos.modules, [k]: { ...mod, actions: all }}}};
    });
  };

  const current = useMemo(() => roles.find(r => r.slug === sel), [roles, sel]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Lista izquierda */}
      <div className="rounded-xl bg-white shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Roles</h2>
          <button onClick={onNewRole} className="rounded bg-blue-600 text-white px-3 py-1.5 hover:bg-blue-700">Nuevo rol</button>
        </div>
        {loading && <div className="text-gray-500">Cargando...</div>}
        {err && <div className="rounded border border-red-200 bg-red-50 text-red-700 p-2">{err}</div>}
        <div className="space-y-2">
          {roles.length === 0 && <div className="text-gray-500 text-sm">Sin roles.</div>}
          {roles.map(r => (
            <button key={r.slug}
              onClick={() => setSel(r.slug)}
              className={`w-full text-left rounded-lg border px-3 py-2 ${sel === r.slug ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}>
              <div className="font-medium">{r.nombre || r.slug}</div>
              <div className="text-xs text-gray-500">{r.slug}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="lg:col-span-2 rounded-xl bg-white shadow p-4">
        {!current ? (
          <div className="text-gray-500">Selecciona un rol.</div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h2 className="font-semibold">Editar rol ({form.slug})</h2>
              <div className="flex gap-2">
                <button onClick={onDeleteRole} className="rounded bg-red-600 text-white px-3 py-1.5 hover:bg-red-700">Eliminar</button>
                <button onClick={onSave} className="rounded bg-blue-600 text-white px-3 py-1.5 hover:bg-blue-700">Guardar cambios</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-sm text-gray-600">Nombre</label>
                <input className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}/>
              </div>
              <div>
                <label className="text-sm text-gray-600">Descripción</label>
                <input className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}/>
              </div>
            </div>

            {/* Módulos */}
            <div className="space-y-3">
              {Object.entries(MODULES).map(([key, def]) => {
                const m = form.permisos.modules[key];
                const actions = def.actions;
                const allSelected = Object.keys(actions).every(a => !!m.actions[a]);
                return (
                  <div key={key} className="rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-50">
                      <div className="font-medium">{def.label}</div>
                      <div className="flex items-center gap-3">
                        {m.active && (
                          <button
                            type="button"
                            onClick={() => selectAll(key, !allSelected)}
                            className="text-sm rounded bg-slate-200 px-2 py-1 hover:bg-slate-300"
                          >
                            {allSelected ? "Quitar todo" : "Seleccionar todo"}
                          </button>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-600">Activo</span>
                          <Switch checked={!!m.active} onChange={(v) => toggleModule(key, v)} />
                        </div>
                      </div>
                    </div>

                    {/* Acciones visibles solo si el módulo está activo */}
                    {m.active && (
                      <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {Object.entries(actions).map(([aKey, aLabel]) => (
                          <label key={aKey} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!m.actions[aKey]}
                              onChange={(e) => toggleAction(key, aKey, e.target.checked)}
                            />
                            <span>{aLabel} <span className="text-xs text-gray-400">({aKey})</span></span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
