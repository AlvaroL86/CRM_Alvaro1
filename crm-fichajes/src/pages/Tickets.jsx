// src/pages/Tickets.jsx
// -------------------------------------------------------------
// Tickets.jsx (pro + gestión)
// - Carga tickets y clientes en paralelo
// - Búsqueda (cliente/asunto/estado/prioridad)
// - Filtros por Estado y Prioridad
// - Ordenación por columnas
// - Paginación en cliente
// - Chips visuales
// - Modal "Nuevo ticket"
// - Botón "Gestionar" -> abre TicketDrawer (detalle + email + WhatsApp)
// - Normalización defensiva de campos del backend
// -------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../services/api";
import TicketDrawer from "../components/TicketDrawer";

// Capitaliza (Unicode)
const cap = (s) => (s || "").trim().replace(/\b\p{L}/gu, (m) => m.toUpperCase());

// Chip visual simple
function Chip({ children, tone = "gray" }) {
  const tones = {
    gray:  "bg-gray-100 text-gray-800 border-gray-200",
    green: "bg-green-100 text-green-800 border-green-200",
    yellow:"bg-yellow-100 text-yellow-800 border-yellow-200",
    red:   "bg-red-100 text-red-800 border-red-200",
    blue:  "bg-blue-100 text-blue-800 border-blue-200",
    purple:"bg-purple-100 text-purple-800 border-purple-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
}

const toneEstado = (v) => {
  const x = String(v || "").toLowerCase();
  if (["abierto", "open", "nuevo", "pendiente"].some(s => x.includes(s))) return "blue";
  if (["en curso", "processing", "proceso", "curso"].some(s => x.includes(s))) return "yellow";
  if (["resuelto", "cerrado", "closed"].some(s => x.includes(s))) return "green";
  return "gray";
};
const tonePrioridad = (v) => {
  const x = String(v || "").toLowerCase();
  if (x.includes("crit")) return "red";
  if (x.includes("alta")) return "red";
  if (x.includes("media")) return "yellow";
  if (x.includes("baja")) return "green";
  return "purple";
};

export default function Tickets() {
  // Datos
  const [rows, setRows] = useState([]);          // tickets
  const [clientes, setClientes] = useState([]);  // clientes
  const [contactos, setContactos] = useState([]);// contactos del cliente seleccionado (modal)

  // UI / control
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Filtros / búsqueda / orden / paginación
  const [q, setQ] = useState("");               // búsqueda
  const [fEstado, setFEstado] = useState("todos");
  const [fPri, setFPri] = useState("todos");
  const [sort, setSort] = useState({ key: "fecha", dir: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form (modal nuevo ticket)
  const [clienteId, setClienteId] = useState("");
  const [contactoId, setContactoId] = useState("");
  const [asunto, setAsunto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [prioridad, setPrioridad] = useState("baja");

  // Drawer (gestionar)
  const [openDrawer, setOpenDrawer] = useState(false);
  const [ticketId, setTicketId] = useState(null);

  // -----------------------------------------------------------
  // Cargar tickets + clientes
  // -----------------------------------------------------------
  async function cargar() {
    try {
      setErr("");
      const [tks, cls] = await Promise.all([
        apiGet("/tickets"),
        apiGet("/clientes"),
      ]);

      setRows(Array.isArray(tks) ? tks : tks?.rows || []);
      setClientes(Array.isArray(cls) ? cls : cls?.rows || []);

      // Selección por defecto en modal
      if (!clienteId && Array.isArray(cls) && cls.length > 0) {
        setClienteId(String(cls[0].id));
      }
    } catch (e) {
      setErr(e?.message || "Error al cargar tickets/clientes");
    }
  }
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, []);

  // -----------------------------------------------------------
  // Al cambiar de cliente (modal), cargar contactos
  // -----------------------------------------------------------
  useEffect(() => {
    (async () => {
      if (!showModal) return; // solo cuando el modal está abierto
      if (!clienteId) { setContactos([]); setContactoId(""); return; }
      try {
        const data = await apiGet(`/clientes/${clienteId}`); // { cliente, contactos }
        const list = Array.isArray(data?.contactos) ? data.contactos : [];
        setContactos(list);
        const principal = list.find((c) => c.es_principal) || list[0];
        setContactoId(principal ? String(principal.id) : "");
      } catch {
        setContactos([]); setContactoId("");
      }
    })();
  }, [clienteId, showModal]);

  // -----------------------------------------------------------
  // Crear ticket (modal)
  // -----------------------------------------------------------
  async function crear(e) {
    e.preventDefault();
    try {
      setErr("");
      if (!clienteId) return setErr("Selecciona un cliente.");
      if (!asunto.trim()) return setErr("El asunto es obligatorio.");

      setLoading(true);

      const payload = {
        cliente_id: Number(clienteId),
        asunto: asunto.trim(),
        descripcion: (descripcion || "").trim(),
        prioridad,
      };
      if (contactoId) payload.contacto_id = Number(contactoId);

      await apiPost("/tickets", payload);

      // Reset suave
      setAsunto("");
      setDescripcion("");
      setShowModal(false);

      await cargar();
      setPage(1);
    } catch (e) {
      setErr(e?.message || "Error al crear el ticket");
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------------------------------------
  // Derivados: selects y dataset filtrado/ordenado/paginado
  // -----------------------------------------------------------
  const clientesOptions = useMemo(() => {
    return (clientes || []).map((c) => ({
      id: String(c.id),
      label: cap(c.empresa_nombre || c.nombre || c.razon_social || "Sin nombre"),
    }));
  }, [clientes]);

  const contactosOptions = useMemo(() => {
    return (contactos || []).map((ct) => ({
      id: String(ct.id),
      label: `${cap(ct.nombre || "")}${ct.es_principal ? " (Principal)" : ""}`,
    }));
  }, [contactos]);

  // Normalización de cada ticket
  const normalize = (t, i) => {
    const id = t.id ?? i;
    const clienteName =
      t.cliente || t.empresa_nombre || t.nombre_cliente || t.cliente_nombre || "";
    const asuntoTxt = t.asunto || t.subject || "";
    const estadoTxt = (t.estado || t.status || "pendiente").toLowerCase();
    const prioridadTxt = (t.prioridad || t.priority || "baja").toLowerCase();
    const fecha = t.created_at || t.fecha || t.fecha_creacion || t.updated_at;
    return { id, clienteName, asuntoTxt, estadoTxt, prioridadTxt, fecha, _raw: t };
  };
  const data = useMemo(() => rows.map(normalize), [rows]);

  // Filtros + búsqueda
  const dataFiltrada = useMemo(() => {
    const qx = q.trim().toLowerCase();
    return data.filter((r) => {
      const hitQ = !qx || [r.clienteName, r.asuntoTxt, r.estadoTxt, r.prioridadTxt]
        .join(" ").toLowerCase().includes(qx);
      const hitE = fEstado === "todos" || r.estadoTxt.includes(fEstado);
      const hitP = fPri === "todos" || r.prioridadTxt.includes(fPri);
      return hitQ && hitE && hitP;
    });
  }, [data, q, fEstado, fPri]);

  // Ordenación
  const dataOrdenada = useMemo(() => {
    const arr = [...dataFiltrada];
    const { key, dir } = sort;
    const factor = dir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      let va = a[key], vb = b[key];
      if (key === "fecha") {
        const da = va ? new Date(va).getTime() : 0;
        const db = vb ? new Date(vb).getTime() : 0;
        return (da - db) * factor;
      }
      va = String(va || "").toLowerCase();
      vb = String(vb || "").toLowerCase();
      if (va < vb) return -1 * factor;
      if (va > vb) return  1 * factor;
      return 0;
    });
    return arr;
  }, [dataFiltrada, sort]);

  // Paginación
  const total = dataOrdenada.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageSafe = Math.min(Math.max(1, page), totalPages);
  const start = total ? (pageSafe - 1) * pageSize : 0;
  const end = start + pageSize;
  const pageRows = dataOrdenada.slice(start, end);

  // Helpers
  const fmtFecha = (v) => (v ? new Date(v).toLocaleString("es-ES") : "-");
  const toggleSort = (key) => {
    setSort((prev) => {
      if (prev.key === key) return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      return { key, dir: "asc" };
    });
    setPage(1);
  };
  const gestionar = (id) => { setTicketId(id); setOpenDrawer(true); };

  // Paginación helpers
  const goFirst = () => setPage(1);
  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const goLast = () => setPage(totalPages);

  return (
    <div className="space-y-6">
      {/* Header + acciones */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Tickets</h2>
        <div className="flex flex-wrap items-center gap-2">
          {/* Búsqueda */}
          <input
            className="border rounded px-3 py-2 text-sm w-64"
            placeholder="Buscar (cliente, asunto, estado, prioridad)…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
          {/* Filtro estado */}
          <select
            className="border rounded px-2 py-2 text-sm"
            value={fEstado}
            onChange={(e) => { setFEstado(e.target.value); setPage(1); }}
            title="Filtrar por estado"
          >
            <option value="todos">Todos (estado)</option>
            <option value="pendiente">Pendiente/Nuevo</option>
            <option value="curso">En curso</option>
            <option value="resuelto">Resuelto</option>
            <option value="cerrado">Cerrado</option>
          </select>
          {/* Filtro prioridad */}
          <select
            className="border rounded px-2 py-2 text-sm"
            value={fPri}
            onChange={(e) => { setFPri(e.target.value); setPage(1); }}
            title="Filtrar por prioridad"
          >
            <option value="todos">Todas (prioridad)</option>
            <option value="crit">Crítica</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
          {/* Nuevo ticket */}
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Nuevo ticket
          </button>
        </div>
      </div>

      {/* Errores */}
      {err && (
        <div className="rounded border border-red-200 bg-red-50 text-red-700 px-3 py-2">
          {err}
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-800">
            <tr>
              <Th onClick={() => toggleSort("clienteName")} active={sort.key==="clienteName"} dir={sort.dir}>Cliente</Th>
              <Th onClick={() => toggleSort("asuntoTxt")} active={sort.key==="asuntoTxt"} dir={sort.dir}>Asunto</Th>
              <Th onClick={() => toggleSort("estadoTxt")} active={sort.key==="estadoTxt"} dir={sort.dir}>Estado</Th>
              <Th onClick={() => toggleSort("prioridadTxt")} active={sort.key==="prioridadTxt"} dir={sort.dir}>Prioridad</Th>
              <Th onClick={() => toggleSort("fecha")} active={sort.key==="fecha"} dir={sort.dir}>Fecha</Th>
              <th className="p-2 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((t) => (
              <tr key={t.id} className="border-b text-gray-800">
                <td className="p-2 capitalize">{cap(t.clienteName)}</td>
                <td className="p-2">{t.asuntoTxt}</td>
                <td className="p-2"><Chip tone={toneEstado(t.estadoTxt)}>{cap(t.estadoTxt)}</Chip></td>
                <td className="p-2"><Chip tone={tonePrioridad(t.prioridadTxt)}>{cap(t.prioridadTxt)}</Chip></td>
                <td className="p-2">{fmtFecha(t.fecha)}</td>
                <td className="p-2">
                  <button
                    className="px-3 py-1 rounded border hover:bg-gray-50"
                    onClick={() => gestionar(t.id)}
                  >
                    Gestionar
                  </button>
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td className="p-3 text-gray-600" colSpan={6}>
                  No hay resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm text-gray-600">
          Mostrando <span className="font-medium">{total ? start + 1 : 0}</span>–
          <span className="font-medium">{Math.min(end, total)}</span> de <span className="font-medium">{total}</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="border rounded px-2 py-1 text-sm"
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          >
            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} / pág.</option>)}
          </select>
          <div className="flex items-center gap-1">
            <button className="border rounded px-2 py-1 text-sm" onClick={goFirst} disabled={pageSafe === 1}>«</button>
            <button className="border rounded px-2 py-1 text-sm" onClick={goPrev} disabled={pageSafe === 1}>‹</button>
            <span className="px-2 text-sm">Página {pageSafe} / {totalPages}</span>
            <button className="border rounded px-2 py-1 text-sm" onClick={goNext} disabled={pageSafe === totalPages}>›</button>
            <button className="border rounded px-2 py-1 text-sm" onClick={goLast} disabled={pageSafe === totalPages}>»</button>
          </div>
        </div>
      </div>

      {/* Modal: Nuevo ticket */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => !loading && setShowModal(false)}
          />
          {/* Caja modal */}
          <div className="relative z-10 w-[95%] max-w-2xl bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Nuevo ticket</h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => !loading && setShowModal(false)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={crear} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Cliente */}
              <div>
                <label className="block text-sm text-gray-700">Cliente</label>
                <select
                  className="mt-1 w-full border rounded p-2"
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                >
                  <option value="">Selecciona cliente</option>
                  {clientesOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Contacto (opcional) */}
              <div>
                <label className="block text-sm text-gray-700">Contacto (opcional)</label>
                <select
                  className="mt-1 w-full border rounded p-2"
                  value={contactoId}
                  onChange={(e) => setContactoId(e.target.value)}
                  disabled={!contactosOptions.length}
                >
                  <option value="">
                    {contactosOptions.length ? "— Selecciona contacto —" : "Sin contactos"}
                  </option>
                  {contactosOptions.map((ct) => (
                    <option key={ct.id} value={ct.id}>{ct.label}</option>
                  ))}
                </select>
              </div>

              {/* Prioridad */}
              <div>
                <label className="block text-sm text-gray-700">Prioridad</label>
                <select
                  className="mt-1 w-full border rounded p-2 capitalize"
                  value={prioridad}
                  onChange={(e) => setPrioridad(e.target.value)}
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Crítica</option>
                </select>
              </div>

              {/* Asunto */}
              <div>
                <label className="block text-sm text-gray-700">Asunto</label>
                <input
                  className="mt-1 w-full border rounded p-2"
                  value={asunto}
                  onChange={(e) => setAsunto(e.target.value)}
                  placeholder="Breve resumen del problema"
                  required
                />
              </div>

              {/* Descripción */}
              <div className="sm:col-span-2">
                <label className="block text-sm text-gray-700">Descripción</label>
                <textarea
                  className="mt-1 w-full border rounded p-2"
                  rows={4}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Detalles, pasos, adjuntos referenciados, etc."
                />
              </div>

              {/* Acciones */}
              <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                  onClick={() => !loading && setShowModal(false)}
                >
                  Cancelar
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  disabled={loading || !clienteId || !asunto.trim()}
                >
                  {loading ? "Creando..." : "Crear ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer gestión */}
      <TicketDrawer
        open={openDrawer}
        ticketId={ticketId}
        onClose={() => setOpenDrawer(false)}
        onUpdated={cargar} // refresca lista tras acciones
      />
    </div>
  );
}

// Cabecera clicable (ordenación)
function Th({ children, onClick, active, dir }) {
  return (
    <th className="p-2 text-left select-none">
      <button
        className={`inline-flex items-center gap-1 ${active ? "text-blue-700" : "text-gray-800"} hover:underline`}
        onClick={onClick}
        title="Ordenar"
      >
        {children}
        {active && <span className="text-xs">{dir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}
