import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../services/api";

const cap = (s) => (s || "").trim().replace(/\b\p{L}/gu, (m) => m.toUpperCase());

export default function TicketNew() {
  const [clientes, setClientes] = useState([]);
  const [contactos, setContactos] = useState([]);

  const [clienteId, setClienteId] = useState("");
  const [contactoId, setContactoId] = useState("");
  const [asunto, setAsunto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [prioridad, setPrioridad] = useState("baja");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const cls = await apiGet("/clientes");
        setClientes(cls);
        if (cls.length) setClienteId(cls[0].id);
      } catch (e) { setErr(e.message || "Error al cargar clientes"); }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!clienteId) { setContactos([]); setContactoId(""); return; }
      try {
        const data = await apiGet(`/clientes/${clienteId}`);
        const list = data?.contactos || [];
        setContactos(list);
        const principal = list.find(x => x.es_principal) || list[0];
        setContactoId(principal ? principal.id : "");
      } catch { setContactos([]); setContactoId(""); }
    })();
  }, [clienteId]);

  async function crear(e) {
    e.preventDefault();
    try {
      setErr("");
      if (!clienteId) return setErr("Selecciona un cliente");
      if (!asunto.trim()) return setErr("Asunto obligatorio");

      setLoading(true);
      const payload = {
        cliente_id: clienteId,
        asunto: asunto.trim(),
        descripcion: (descripcion || "").trim(),
        prioridad,
        ...(contactoId ? { contacto_id: contactoId } : {})
      };
      await apiPost("/tickets", payload);
      setAsunto(""); setDescripcion("");
      alert("Ticket creado");
    } catch (e) {
      setErr(e.message || "Error al crear ticket");
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Crear Ticket</h1>
      {err && <p className="text-red-600">{err}</p>}

      <form onSubmit={crear} className="bg-white p-4 rounded shadow grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span>Cliente</span>
          <select className="border rounded px-3 py-2" value={clienteId} onChange={e=>setClienteId(e.target.value)}>
            <option value="">Selecciona cliente</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{cap(c.empresa_nombre || c.nombre)}</option>)}
          </select>
        </label>

        <label className="space-y-1">
          <span>Contacto (opcional)</span>
          <select className="border rounded px-3 py-2" value={contactoId} onChange={e=>setContactoId(e.target.value)} disabled={!contactos.length}>
            <option value="">{contactos.length ? "— Selecciona —" : "Sin contactos"}</option>
            {contactos.map(ct => <option key={ct.id} value={ct.id}>{cap(ct.nombre)}{ct.es_principal ? " (Principal)" : ""}</option>)}
          </select>
        </label>

        <label className="space-y-1">
          <span>Prioridad</span>
          <select className="border rounded px-3 py-2 capitalize" value={prioridad} onChange={e=>setPrioridad(e.target.value)}>
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </select>
        </label>

        <label className="space-y-1">
          <span>Asunto</span>
          <input className="border rounded px-3 py-2" value={asunto} onChange={e=>setAsunto(e.target.value)} required />
        </label>

        <label className="space-y-1 sm:col-span-2">
          <span>Descripción</span>
          <textarea className="border rounded px-3 py-2" rows={4} value={descripcion} onChange={e=>setDescripcion(e.target.value)} />
        </label>

        <div className="sm:col-span-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50" disabled={loading || !clienteId}>
            {loading ? "Creando..." : "Crear ticket"}
          </button>
        </div>
      </form>
    </div>
  );
}
