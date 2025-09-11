// src/components/TicketDrawer.jsx
// -------------------------------------------------------------
// Drawer lateral para gestionar un ticket:
// - Editar ASUNTO y DESCRIPCIÓN
// - Cambiar ESTADO y PRIORIDAD (guardar)
// - Acciones rápidas: "Marcar Resuelto" y "Cerrar ticket"
// - Hilo de mensajes
// - Enviar email (to/cc)
// - Botón WhatsApp al contacto/cliente
// -------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../services/api";

const cap = (s) => (s || "").trim().replace(/\b\p{L}/gu, (m) => m.toUpperCase());
const phoneToWa = (tlf) => {
  if (!tlf) return "";
  let x = String(tlf).replace(/[^\d+]/g, "");
  if (!x.startsWith("+") && /^[06789]/.test(x)) x = "+34" + x;
  return x;
};

const ESTADOS = [
  { value: "pendiente", label: "Pendiente/Nuevo" },
  { value: "en curso", label: "En curso" },
  { value: "resuelto", label: "Resuelto" },
  { value: "cerrado", label: "Cerrado" },
];
const PRIORIDADES = [
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
  { value: "critica", label: "Crítica" },
];

export default function TicketDrawer({ open, ticketId, onClose, onUpdated }) {
  const [loading, setLoading] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [err, setErr] = useState("");
  const [det, setDet] = useState(null);

  // Meta editable
  const [estado, setEstado] = useState("pendiente");
  const [prioridad, setPrioridad] = useState("baja");
  const [asunto, setAsunto] = useState("");
  const [descripcion, setDescripcion] = useState("");

  // Email
  const [to, setTo] = useState([]);
  const [cc, setCc] = useState([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Carga detalle
  useEffect(() => {
    if (!open || !ticketId) return;
    (async () => {
      try {
        setErr("");
        setLoading(true);
        const d = await apiGet(`/tickets/${ticketId}`);
        setDet(d);

        const subj = d?.ticket?.asunto || d?.ticket?.subject || "";
        setSubject(subj ? `RE: ${subj}` : "Respuesta ticket");
        setAsunto(d?.ticket?.asunto || d?.ticket?.subject || "");
        setDescripcion(d?.ticket?.descripcion || "");

        setEstado(String(d?.ticket?.estado || "pendiente").toLowerCase());
        setPrioridad(String(d?.ticket?.prioridad || "baja").toLowerCase());

        const sugeridos = [];
        if (d?.contacto?.email) sugeridos.push(d.contacto.email);
        if (d?.cliente?.email)  sugeridos.push(d.cliente.email);
        setTo([...new Set(sugeridos.filter(Boolean))]);

        setBody(`Hola,\n\nTe damos respuesta sobre el ticket: "${subj}".\n\n—\nUn saludo,\nSoporte`);
      } catch (e) {
        setErr(e?.message || "Error al cargar el ticket");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, ticketId]);

  // Guardar meta (estado/prioridad/asunto/descripcion)
  async function guardarMeta(partial) {
    try {
      setErr("");
      setSavingMeta(true);
      const payload = {
        estado,
        prioridad,
        asunto: asunto?.trim() || "",
        descripcion: descripcion ?? "",
        ...(partial || {}),
      };
      // backend acepta POST /tickets/:id/update como alias del PUT
      await apiPost(`/tickets/${ticketId}/update`, payload);
      onUpdated?.();
      const d = await apiGet(`/tickets/${ticketId}`);
      setDet(d);
    } catch (e) {
      setErr(e?.message || "No se pudo guardar cambios");
    } finally {
      setSavingMeta(false);
    }
  }

  // Acciones rápidas de estado
  const quickSetEstado = async (nuevo) => {
    setEstado(nuevo);
    await guardarMeta({ estado: nuevo });
  };

  const opcionesContactos = useMemo(() => {
    const list = det?.contactos || [];
    return list
      .filter((c) => c.email)
      .map((c) => ({ id: String(c.id), label: `${cap(c.nombre)} <${c.email}>`, email: c.email }));
  }, [det]);

  const clienteTel = det?.contacto?.telefono || det?.cliente?.telefono || det?.cliente?.movil;
  const waLink = clienteTel
    ? `https://wa.me/${phoneToWa(clienteTel)}?text=${encodeURIComponent(
        `Hola ${cap(det?.contacto?.nombre || det?.cliente?.nombre || "")}, te contacto por el ticket "${asunto || det?.ticket?.id}".`
      )}`
    : null;

  // Chips TO/CC rápidos
  const [chipEmail, setChipEmail] = useState("");
  const [chipCc, setChipCc] = useState("");
  const addTo = () => {
    const v = chipEmail.trim();
    if (!v) return;
    if (!/\S+@\S+\.\S+/.test(v)) return setErr("Email no válido");
    setTo((a) => [...new Set([...a, v])]);
    setChipEmail("");
  };
  const delTo = (v) => setTo((a) => a.filter((x) => x !== v));
  const addCc = () => {
    const v = chipCc.trim();
    if (!v) return;
    if (!/\S+@\S+\.\S+/.test(v)) return setErr("CC: email no válido");
    setCc((a) => [...new Set([...a, v])]);
    setChipCc("");
  };
  const delCc = (v) => setCc((a) => a.filter((x) => x !== v));
  const addContacto = (email) => setTo((a) => [...new Set([...a, email])]);

  // Enviar email
  async function enviar(e) {
    e.preventDefault();
    try {
      setErr("");
      if (!to.length) return setErr("Añade al menos un destinatario.");
      if (!subject.trim()) return setErr("Asunto obligatorio.");
      if (!body.trim()) return setErr("Escribe un mensaje.");

      setLoading(true);
      await apiPost(`/tickets/${ticketId}/reply`, { to, cc, subject, body });

      setBody("");
      onUpdated?.();
      const d = await apiGet(`/tickets/${ticketId}`);
      setDet(d);
    } catch (e) {
      setErr(e?.message || "Error al enviar el email");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={() => !loading && !savingMeta && onClose?.()} />
      {/* Panel */}
      <div className="absolute top-0 right-0 h-full w-full max-w-3xl bg-white shadow-xl p-4 sm:p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Gestionar ticket</h3>
          <button className="text-gray-500 hover:text-gray-700" onClick={() => !loading && !savingMeta && onClose?.()}>✕</button>
        </div>

        {err && <div className="mb-3 rounded border border-red-200 bg-red-50 text-red-700 px-3 py-2">{err}</div>}
        {(loading || savingMeta) && <div className="text-sm text-gray-500 mb-2">{loading ? "Cargando…" : "Guardando…"}</div>}

        {det && (
          <>
            {/* Meta editable */}
            <div className="mb-4 grid grid-cols-1 gap-3">
              {/* Asunto (editable) */}
              <div className="bg-gray-50 rounded p-3">
                <label className="block text-xs text-gray-500 mb-1">Asunto</label>
                <input
                  className="w-full border rounded p-2"
                  value={asunto}
                  onChange={(e) => setAsunto(e.target.value)}
                  placeholder="Asunto del ticket"
                />
              </div>

              {/* Descripción (editable) */}
              <div className="bg-gray-50 rounded p-3">
                <label className="block text-xs text-gray-500 mb-1">Descripción</label>
                <textarea
                  className="w-full border rounded p-2"
                  rows={4}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Descripción del ticket"
                />
              </div>

              {/* Cliente y contacto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded p-3">
                  <div className="text-xs text-gray-500">Cliente</div>
                  <div className="font-medium">{cap(det.cliente?.nombre || det.cliente?.empresa_nombre || "")}</div>
                  {det.cliente?.email && <div className="text-sm text-gray-600">{det.cliente.email}</div>}
                </div>
                <div className="bg-gray-50 rounded p-3">
                  <div className="text-xs text-gray-500">Contacto</div>
                  <div className="font-medium">{cap(det.contacto?.nombre || "—")}</div>
                  {det.contacto?.email && <div className="text-sm text-gray-600">{det.contacto.email}</div>}
                </div>
              </div>

              {/* Estado y prioridad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded p-3 flex flex-col gap-2">
                  <label className="text-xs text-gray-500">Estado</label>
                  <select className="border rounded p-2" value={estado} onChange={(e) => setEstado(e.target.value)}>
                    {ESTADOS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="bg-gray-50 rounded p-3 flex flex-col gap-2">
                  <label className="text-xs text-gray-500">Prioridad</label>
                  <select className="border rounded p-2" value={prioridad} onChange={(e) => setPrioridad(e.target.value)}>
                    {PRIORIDADES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Acciones: Guardar + Rápidas */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => guardarMeta()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                  disabled={savingMeta}
                >
                  Guardar cambios
                </button>
                <span className="text-sm text-gray-500 mx-1">o</span>
                <button
                  type="button"
                  onClick={() => quickSetEstado("resuelto")}
                  className="px-3 py-2 rounded border hover:bg-gray-50"
                  disabled={savingMeta}
                >
                  Marcar como Resuelto
                </button>
                <button
                  type="button"
                  onClick={() => quickSetEstado("cerrado")}
                  className="px-3 py-2 rounded border hover:bg-gray-50"
                  disabled={savingMeta}
                >
                  Cerrar ticket
                </button>
              </div>
            </div>

            {/* Teléfono + WhatsApp */}
            <div className="mb-4 bg-gray-50 rounded p-3">
              <div className="text-xs text-gray-500">Teléfono</div>
              <div className="font-medium">{clienteTel || "—"}</div>
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-2 px-3 py-1 rounded bg-green-600 text-white text-sm hover:bg-green-700"
                  title="Abrir WhatsApp"
                >
                  WhatsApp
                </a>
              )}
            </div>

            {/* Hilo */}
            <div className="mb-4">
              <h4 className="font-semibold mb-2">Hilo</h4>
              <div className="space-y-2">
                {(det.mensajes || []).length === 0 && (
                  <div className="text-sm text-gray-500">Sin mensajes aún.</div>
                )}
                {(det.mensajes || []).map((m) => (
                  <div key={m.id} className="border rounded p-2">
                    <div className="text-xs text-gray-500 flex justify-between">
                      <span>{m.direction === "out" ? "Enviado" : "Recibido"} • {new Date(m.created_at).toLocaleString("es-ES")}</span>
                      <span>{m.user_name ? `Por: ${m.user_name}` : ""}</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      <div><strong>Para:</strong> {m.to || "—"}</div>
                      {m.cc && <div><strong>CC:</strong> {m.cc}</div>}
                      {m.subject && <div><strong>Asunto:</strong> {m.subject}</div>}
                    </div>
                    <pre className="whitespace-pre-wrap text-sm mt-2">{m.body}</pre>
                  </div>
                ))}
              </div>
            </div>

            {/* Responder por email */}
            <form onSubmit={enviar} className="border rounded p-3 space-y-3">
              <h4 className="font-semibold">Responder por email</h4>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Añadir destinatarios (contactos del cliente)</label>
                <div className="flex flex-wrap gap-2">
                  {opcionesContactos.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      className="px-2 py-1 text-xs rounded border hover:bg-gray-50"
                      onClick={() => addContacto(c.email)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* TO */}
              <div>
                <label className="block text-sm text-gray-700">Para</label>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {to.map((e) => (
                    <span key={e} className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                      {e}
                      <button type="button" className="text-blue-700" onClick={() => delTo(e)}>✕</button>
                    </span>
                  ))}
                  <input
                    className="border rounded px-2 py-1 text-sm"
                    placeholder="escribe email y pulsa +"
                    value={chipEmail}
                    onChange={(ev) => setChipEmail(ev.target.value)}
                  />
                  <button type="button" className="border rounded px-2 py-1 text-sm" onClick={addTo}>+</button>
                </div>
              </div>

              {/* CC */}
              <div>
                <label className="block text-sm text-gray-700">CC (opcional)</label>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {cc.map((e) => (
                    <span key={e} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                      {e}
                      <button type="button" className="text-gray-700" onClick={() => delCc(e)}>✕</button>
                    </span>
                  ))}
                  <input
                    className="border rounded px-2 py-1 text-sm"
                    placeholder="email cc y pulsa +"
                    value={chipCc}
                    onChange={(ev) => setChipCc(ev.target.value)}
                  />
                  <button type="button" className="border rounded px-2 py-1 text-sm" onClick={addCc}>+</button>
                </div>
              </div>

              {/* Asunto email */}
              <div>
                <label className="block text-sm text-gray-700">Asunto</label>
                <input
                  className="mt-1 w-full border rounded p-2"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              {/* Mensaje */}
              <div>
                <label className="block text-sm text-gray-700">Mensaje</label>
                <textarea
                  className="mt-1 w-full border rounded p-2"
                  rows={6}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" className="px-4 py-2 border rounded hover:bg-gray-50" onClick={() => !loading && onClose?.()}>
                  Cerrar
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar email"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
