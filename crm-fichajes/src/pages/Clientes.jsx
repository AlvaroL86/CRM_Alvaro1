// src/pages/Clientes.jsx
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "../services/api";
import { useAuth } from "../context/AuthContext";
const emailOk = (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const phoneOk = (v) => !v || /^\+?\d{6,15}$/.test(v);

export default function Clientes() {
  const { user } = useAuth();
  const [empresa, setEmpresa] = useState("");
  const [contacto, setContacto] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [lista, setLista] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setErr(""); setLoading(true);
    try {
      const data = await apiGet("/clientes"); // <-- sin /api
      setLista(Array.isArray(data) ? data : []);
    } catch (e) { setErr(e.message || "Error al cargar clientes"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const crear = async () => {
    setErr("");
    if (!empresa.trim() || !contacto.trim() || !telefono.trim()) {
      setErr("Empresa, contacto y teléfono son obligatorios"); return;
    }
    if (email && !emailOk(email)) { setErr("Email no válido"); return; }
    if (!phoneOk(telefono)) { setErr("Teléfono no válido"); return; }

    setLoading(true);
    try {
      await apiPost("/clientes", {
        empresa: empresa.trim(),
        contacto: contacto.trim(),
        email: email.trim() || null,
        telefono: telefono.trim(),
        estado: 1,
      });
      setEmpresa(""); setContacto(""); setEmail(""); setTelefono("");
      await load();
    } catch (e) {
      const m = String(e.message||"");
      if (m.includes("telefono_duplicado")) setErr("Ese teléfono ya existe");
      else if (m.includes("email_duplicado")) setErr("Ese email ya existe");
      else if (m.includes("nif_obligatorio")) setErr("Falta NIF de empresa en la sesión");
      else setErr(m || "Error al crear cliente");
    } finally { setLoading(false); }
  };

  return (
    <div className="p-4">
      <h2 className="mb-4 text-xl font-semibold text-gray-800">Clientes</h2>

      {err && <div className="mb-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-800">{err}</div>}

      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-4">
        <input className="rounded border p-2" placeholder="Empresa *" value={empresa} onChange={(e)=>setEmpresa(e.target.value)} />
        <input className="rounded border p-2" placeholder="Contacto *" value={contacto} onChange={(e)=>setContacto(e.target.value)} />
        <input className="rounded border p-2" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input className="rounded border p-2" placeholder="Teléfono *" value={telefono} onChange={(e)=>setTelefono(e.target.value)} />
        <div><button onClick={crear} disabled={loading} className="rounded bg-blue-600 px-3 py-2 text-white">Crear cliente</button></div>
      </div>

      <div className="overflow-x-auto rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr><th className="p-2">Empresa</th><th className="p-2">Contacto</th><th className="p-2">Email</th><th className="p-2">Teléfono</th><th className="p-2">Estado</th><th className="p-2">Acciones</th></tr>
          </thead>
          <tbody>
            {lista.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-2">{c.empresa}</td>
                <td className="p-2">{c.contacto}</td>
                <td className="p-2">{c.email}</td>
                <td className="p-2">{c.telefono}</td>
                <td className="p-2">{Number(c.estado) ? "Activo":"Inactivo"}</td>
                <td className="p-2">—</td>
              </tr>
            ))}
            {!lista.length && !loading && (
              <tr><td className="p-4 text-center text-gray-500" colSpan={6}>Sin clientes.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
