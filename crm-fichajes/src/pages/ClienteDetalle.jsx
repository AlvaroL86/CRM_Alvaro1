// src/pages/ClienteDetalle.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiGet, apiPost, apiDelete } from "../services/api";
import { BASE_URL } from "../services/api";

const emailOk = (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const phoneOk = (v) => !v || /^\+?\d{6,15}$/.test(v);
const cap = (s) => (s || "").trim().replace(/\b\p{L}/gu, (m) => m.toUpperCase());

const TABS = [
  { key: "resumen", label: "Resumen" },
  { key: "contactos", label: "Contactos" },
  { key: "oportunidades", label: "Oportunidades" },
  { key: "notas", label: "Notas" },
  { key: "adjuntos", label: "Adjuntos" },
];

export default function ClienteDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") || "resumen";

  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Subdatos
  const [contactos, setContactos] = useState([]);
  const [oportunidades, setOportunidades] = useState([]);
  const [notas, setNotas] = useState([]);
  const [adjuntos, setAdjuntos] = useState([]);

  // Formularios
  const [newContacto, setNewContacto] = useState({ nombre: "", email: "", telefono: "" });
  const [newOpp, setNewOpp] = useState({ titulo: "", etapa: "nuevo", importe: "" });
  const [newNota, setNewNota] = useState({ texto: "" });
  const [file, setFile] = useState(null);

  const goTab = (k) => {
    const next = new URLSearchParams(sp);
    next.set("tab", k);
    setSp(next, { replace: true });
  };

  const cargarCliente = async () => {
    setErr("");
    setLoading(true);
    try {
      const data = await apiGet(`/clientes/${id}`);
      setCliente(data);
    } catch (e) {
      setErr(e.message || "No se pudo cargar el cliente");
    } finally {
      setLoading(false);
    }
  };

  const cargarContactos = async () => {
    try {
      const data = await apiGet(`/clientes/${id}/contactos`);
      setContactos(Array.isArray(data) ? data : []);
    } catch (e) {
      setContactos([]);
    }
  };
  const cargarOportunidades = async () => {
    try {
      const data = await apiGet(`/clientes/${id}/oportunidades`);
      setOportunidades(Array.isArray(data) ? data : []);
    } catch (e) {
      setOportunidades([]);
    }
  };
  const cargarNotas = async () => {
    try {
      const data = await apiGet(`/clientes/${id}/notas`);
      setNotas(Array.isArray(data) ? data : []);
    } catch (e) {
      setNotas([]);
    }
  };
  const cargarAdjuntos = async () => {
    try {
      const data = await apiGet(`/clientes/${id}/adjuntos`);
      setAdjuntos(Array.isArray(data) ? data : []);
    } catch (e) {
      setAdjuntos([]);
    }
  };

  useEffect(() => {
    cargarCliente();
  }, [id]);

  // Carga perezosa por pestaña activa
  useEffect(() => {
    if (tab === "contactos") cargarContactos();
    if (tab === "oportunidades") cargarOportunidades();
    if (tab === "notas") cargarNotas();
    if (tab === "adjuntos") cargarAdjuntos();
  }, [tab, id]);

  const title = useMemo(() => {
    const empresa = cliente?.empresa_nombre ?? cliente?.empresa ?? cliente?.nombre ?? "";
    return cap(empresa);
  }, [cliente]);

  /* ===== Contactos ===== */
  const crearContacto = async (e) => {
    e.preventDefault();
    if (!newContacto.nombre.trim()) return alert("Nombre obligatorio");
    if (!emailOk(newContacto.email)) return alert("Email no válido");
    if (!phoneOk(newContacto.telefono)) return alert("Teléfono no válido");
    await apiPost(`/clientes/${id}/contactos`, newContacto);
    setNewContacto({ nombre: "", email: "", telefono: "" });
    await cargarContactos();
  };
  const borrarContacto = async (contactoId) => {
    if (!confirm("¿Eliminar contacto?")) return;
    await apiDelete(`/clientes/${id}/contactos/${contactoId}`);
    await cargarContactos();
  };

  /* ===== Oportunidades ===== */
  const crearOpp = async (e) => {
    e.preventDefault();
    if (!newOpp.titulo.trim()) return alert("Título obligatorio");
    const body = {
      titulo: newOpp.titulo,
      etapa: newOpp.etapa, // nuevo | en_progreso | ganado | perdido
      importe: newOpp.importe ? Number(newOpp.importe) : null,
    };
    await apiPost(`/clientes/${id}/oportunidades`, body);
    setNewOpp({ titulo: "", etapa: "nuevo", importe: "" });
    await cargarOportunidades();
  };
  const borrarOpp = async (oppId) => {
    if (!confirm("¿Eliminar oportunidad?")) return;
    await apiDelete(`/clientes/${id}/oportunidades/${oppId}`);
    await cargarOportunidades();
  };

  /* ===== Notas ===== */
  const crearNota = async (e) => {
    e.preventDefault();
    if (!newNota.texto.trim()) return;
    await apiPost(`/clientes/${id}/notas`, { texto: newNota.texto });
    setNewNota({ texto: "" });
    await cargarNotas();
  };
  const borrarNota = async (notaId) => {
    if (!confirm("¿Eliminar nota?")) return;
    await apiDelete(`/clientes/${id}/notas/${notaId}`);
    await cargarNotas();
  };

  /* ===== Adjuntos (FormData) ===== */
  const subirAdjunto = async (e) => {
    e.preventDefault();
    if (!file) return alert("Selecciona un archivo");
    const token = localStorage.getItem("crm_token");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const resp = await fetch(`${BASE_URL}/clientes/${id}/adjuntos`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || data?.message || "Error al subir adjunto");
      setFile(null);
      await cargarAdjuntos();
    } catch (e) {
      alert(e.message);
    }
  };
  const borrarAdjunto = async (adjId) => {
    if (!confirm("¿Eliminar adjunto?")) return;
    await apiDelete(`/clientes/${id}/adjuntos/${adjId}`);
    await cargarAdjuntos();
  };

  if (loading) {
    return <div className="p-4 text-gray-600">Cargando cliente...</div>;
  }
  if (err) {
    return (
      <div className="p-4">
        <p className="rounded border border-red-200 bg-red-50 p-2 text-red-700">{err}</p>
        <button
          className="mt-3 rounded bg-slate-100 px-3 py-2 hover:bg-slate-200"
          onClick={() => navigate(-1)}
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold">{title || "Cliente"}</h1>
          <p className="text-sm text-gray-500">ID: {id}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/clientes")}
            className="rounded bg-slate-100 px-3 py-2 hover:bg-slate-200"
          >
            Volver a Clientes
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto rounded-lg bg-white p-2 shadow">
        <div className="flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => goTab(t.key)}
              className={`rounded px-3 py-2 text-sm ${
                tab === t.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido por tab */}
      {tab === "resumen" && (
        <div className="rounded-lg bg-white p-4 shadow">
          <h3 className="mb-3 text-lg font-semibold">Resumen</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded border p-3">
              <h4 className="mb-2 font-medium">Datos básicos</h4>
              <p><b>Empresa:</b> {cap(cliente?.empresa_nombre ?? cliente?.empresa ?? "-")}</p>
              <p><b>Email:</b> {cliente?.email ?? "-"}</p>
              <p><b>Teléfono:</b> {cliente?.telefono ?? "-"}</p>
              <p><b>Estado:</b> {cliente?.estado ? "Activo" : "Inactivo"}</p>
            </div>
            <div className="rounded border p-3">
              <h4 className="mb-2 font-medium">Actividad reciente</h4>
              <p className="text-sm text-gray-600">
                Aquí puedes mostrar KPIs: nº contactos, nº oportunidades abiertas, total ganado,
                última nota, últimos adjuntos… (rellena desde tu API cuando lo tengas).
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === "contactos" && (
        <div className="space-y-4">
          <div className="rounded-lg bg-white p-4 shadow">
            <h3 className="mb-3 text-lg font-semibold">Nuevo contacto</h3>
            <form onSubmit={crearContacto} className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <input
                className="rounded border px-3 py-2"
                placeholder="Nombre"
                value={newContacto.nombre}
                onChange={(e) => setNewContacto({ ...newContacto, nombre: e.target.value })}
              />
              <input
                className={`rounded border px-3 py-2 ${
                  newContacto.email && !emailOk(newContacto.email) ? "border-red-500" : ""
                }`}
                placeholder="Email"
                value={newContacto.email}
                onChange={(e) => setNewContacto({ ...newContacto, email: e.target.value })}
              />
              <input
                className={`rounded border px-3 py-2 ${
                  newContacto.telefono && !phoneOk(newContacto.telefono) ? "border-red-500" : ""
                }`}
                placeholder="Teléfono"
                value={newContacto.telefono}
                onChange={(e) => setNewContacto({ ...newContacto, telefono: e.target.value })}
              />
              <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                Añadir
              </button>
            </form>
          </div>

          <div className="overflow-x-auto rounded-lg bg-white shadow">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left">Nombre</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Teléfono</th>
                  <th className="w-32 p-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {contactos.length === 0 && (
                  <tr><td colSpan={4} className="p-3 text-gray-500">Sin contactos.</td></tr>
                )}
                {contactos.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3 capitalize">{cap(c.nombre)}</td>
                    <td className="p-3">{c.email || "-"}</td>
                    <td className="p-3">{c.telefono || "-"}</td>
                    <td className="p-3">
                      <button
                        onClick={() => borrarContacto(c.id)}
                        className="rounded bg-red-50 px-3 py-1 text-red-700 hover:bg-red-100"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "oportunidades" && (
        <div className="space-y-4">
          <div className="rounded-lg bg-white p-4 shadow">
            <h3 className="mb-3 text-lg font-semibold">Nueva oportunidad</h3>
            <form onSubmit={crearOpp} className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <input
                className="rounded border px-3 py-2"
                placeholder="Título"
                value={newOpp.titulo}
                onChange={(e) => setNewOpp({ ...newOpp, titulo: e.target.value })}
              />
              <select
                className="rounded border px-3 py-2"
                value={newOpp.etapa}
                onChange={(e) => setNewOpp({ ...newOpp, etapa: e.target.value })}
              >
                <option value="nuevo">Nuevo</option>
                <option value="en_progreso">En progreso</option>
                <option value="ganado">Ganado</option>
                <option value="perdido">Perdido</option>
              </select>
              <input
                className="rounded border px-3 py-2"
                placeholder="Importe (€)"
                type="number"
                value={newOpp.importe}
                onChange={(e) => setNewOpp({ ...newOpp, importe: e.target.value })}
              />
              <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                Añadir
              </button>
            </form>
          </div>

          <div className="overflow-x-auto rounded-lg bg-white shadow">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left">Título</th>
                  <th className="p-3 text-left">Etapa</th>
                  <th className="p-3 text-left">Importe</th>
                  <th className="w-32 p-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {oportunidades.length === 0 && (
                  <tr><td colSpan={4} className="p-3 text-gray-500">Sin oportunidades.</td></tr>
                )}
                {oportunidades.map((o) => (
                  <tr key={o.id} className="border-t">
                    <td className="p-3">{o.titulo}</td>
                    <td className="p-3 capitalize">{(o.etapa || "").replaceAll("_", " ")}</td>
                    <td className="p-3">{o.importe != null ? `${o.importe} €` : "-"}</td>
                    <td className="p-3">
                      <button
                        onClick={() => borrarOpp(o.id)}
                        className="rounded bg-red-50 px-3 py-1 text-red-700 hover:bg-red-100"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "notas" && (
        <div className="space-y-4">
          <div className="rounded-lg bg-white p-4 shadow">
            <h3 className="mb-3 text-lg font-semibold">Nueva nota</h3>
            <form onSubmit={crearNota} className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <textarea
                className="rounded border px-3 py-2 md:col-span-3"
                placeholder="Escribe una nota..."
                value={newNota.texto}
                onChange={(e) => setNewNota({ texto: e.target.value })}
              />
              <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                Añadir
              </button>
            </form>
          </div>

          <div className="overflow-x-auto rounded-lg bg-white shadow">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left">Fecha</th>
                  <th className="p-3 text-left">Nota</th>
                  <th className="w-32 p-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {notas.length === 0 && (
                  <tr><td colSpan={3} className="p-3 text-gray-500">Sin notas.</td></tr>
                )}
                {notas.map((n) => (
                  <tr key={n.id} className="border-t">
                    <td className="p-3">{n.fecha ? new Date(n.fecha).toLocaleString() : "-"}</td>
                    <td className="p-3 whitespace-pre-wrap">{n.texto}</td>
                    <td className="p-3">
                      <button
                        onClick={() => borrarNota(n.id)}
                        className="rounded bg-red-50 px-3 py-1 text-red-700 hover:bg-red-100"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "adjuntos" && (
        <div className="space-y-4">
          <div className="rounded-lg bg-white p-4 shadow">
            <h3 className="mb-3 text-lg font-semibold">Subir adjunto</h3>
            <form onSubmit={subirAdjunto} className="flex flex-col gap-3 md:flex-row">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="rounded border px-3 py-2"
              />
              <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                Subir
              </button>
            </form>
            <p className="mt-2 text-xs text-gray-500">
              Se envía como <code>multipart/form-data</code> a <code>/clientes/{id}/adjuntos</code>.
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg bg-white shadow">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left">Nombre</th>
                  <th className="p-3 text-left">Tamaño</th>
                  <th className="p-3 text-left">Fecha</th>
                  <th className="w-40 p-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {adjuntos.length === 0 && (
                  <tr><td colSpan={4} className="p-3 text-gray-500">Sin adjuntos.</td></tr>
                )}
                {adjuntos.map((a) => {
                  const href =
                    a.url ||
                    `${BASE_URL}/clientes/${id}/adjuntos/${a.id}/download`;
                  return (
                    <tr key={a.id} className="border-t">
                      <td className="p-3">{a.nombre || a.filename}</td>
                      <td className="p-3">{a.tamano ? `${a.tamano} bytes` : "-"}</td>
                      <td className="p-3">
                        {a.fecha_subida
                          ? new Date(a.fecha_subida).toLocaleString()
                          : "-"}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded bg-slate-100 px-3 py-1 hover:bg-slate-200"
                          >
                            Descargar
                          </a>
                          <button
                            onClick={() => borrarAdjunto(a.id)}
                            className="rounded bg-red-50 px-3 py-1 text-red-700 hover:bg-red-100"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
