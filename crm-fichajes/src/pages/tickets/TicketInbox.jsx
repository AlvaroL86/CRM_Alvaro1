import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../../services/api";

const cap = (s) => (s || "").trim().replace(/\b\p{L}/gu, (m) => m.toUpperCase());

export default function TicketInbox() {
  const [rows, setRows] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [f, setF] = useState({ estado: "abierto", prioridad: "", cliente_id: "" });
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      setErr("");
      const params = new URLSearchParams();
      if (f.estado) params.set("estado", f.estado);
      if (f.prioridad) params.set("prioridad", f.prioridad);
      if (f.cliente_id) params.set("cliente_id", f.cliente_id);
      const data = await apiGet(`/tickets?${params.toString()}`);
      setRows(data);
      const cls = await apiGet("/clientes");
      setClientes(cls);
    } catch (e) { setErr(e.message || "Error al cargar"); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { load(); }, [f.estado, f.prioridad, f.cliente_id]);

  const grouped = useMemo(() => {
    const buckets = { critica: [], alta: [], media: [], baja: [] };
    rows.forEach(r => (buckets[r.prioridad || 'baja'] || buckets.baja).push(r));
    return buckets;
  }, [rows]);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Bandeja de Tickets</h1>
      {err && <p className="text-red-600">{err}</p>}

      <div className="bg-white p-3 rounded shadow grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="space-y-1">
          <span>Estado</span>
          <select className="border rounded px-3 py-2" value={f.estado} onChange={(e)=>setF(s=>({...s, estado:e.target.value}))}>
            <option value="">Todos</option>
            <option value="abierto">Abierto</option>
            <option value="en_curso">En curso</option>
            <option value="cerrado">Cerrado</option>
          </select>
        </label>
        <label className="space-y-1">
          <span>Prioridad</span>
          <select className="border rounded px-3 py-2" value={f.prioridad} onChange={(e)=>setF(s=>({...s, prioridad:e.target.value}))}>
            <option value="">Todas</option>
            <option value="critica">Crítica</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </label>
        <label className="space-y-1 md:col-span-2">
          <span>Cliente</span>
          <select className="border rounded px-3 py-2" value={f.cliente_id} onChange={(e)=>setF(s=>({...s, cliente_id:e.target.value}))}>
            <option value="">Todos</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.empresa_nombre || c.nombre}</option>)}
          </select>
        </label>
      </div>

      {["critica","alta","media","baja"].map(p => (
        <div key={p} className="bg-white rounded shadow">
          <div className="px-4 py-2 border-b font-semibold capitalize">{p}</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Cliente</th>
                <th className="p-2 text-left">Asunto</th>
                <th className="p-2 text-left">Estado</th>
                <th className="p-2 text-left">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {grouped[p].map(t => (
                <tr key={t.id} className="border-t">
                  <td className="p-2 capitalize">{cap(t.cliente)}</td>
                  <td className="p-2">{t.asunto}</td>
                  <td className="p-2 capitalize">{cap(t.estado)}</td>
                  <td className="p-2">{t.created_at ? new Date(t.created_at).toLocaleString('es-ES') : "-"}</td>
                </tr>
              ))}
              {grouped[p].length === 0 && (
                <tr><td className="p-3 text-gray-500" colSpan={4}>Sin tickets en {p}.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
