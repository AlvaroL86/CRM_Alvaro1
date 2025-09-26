// src/pages/ClientesImport.jsx
import { useState } from "react";
import { apiPost } from "../services/api";

/**
 * Permite subir .xlsx o pegar texto (CSV/TSV). Campos soportados:
 * empresa, contacto, email, telefono, estado (1/0). El backend completa NIF de sesión.
 */
export default function ClientesImport() {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function parseFile(f) {
    const { read, utils } = await import("xlsx");
    const ab = await f.arrayBuffer();
    const wb = read(ab);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = utils.sheet_to_json(ws, { defval: "" });
    return rows;
  }

  const doPreview = async () => {
    setErr(""); setMsg("");
    try {
      let rows = [];
      if (file) rows = await parseFile(file);
      else if (text.trim()) {
        const lines = text.trim().split(/\r?\n/);
        const head = lines[0].split(/[\t;,]/).map(s=>s.trim().toLowerCase());
        rows = lines.slice(1).map(line => {
          const cols = line.split(/[\t;,]/);
          const o = {};
          head.forEach((h,i)=>o[h]=cols[i]?.trim()||"");
          return o;
        });
      }
      const norm = rows.map(r => ({
        empresa: r.empresa || r.company || "",
        contacto: r.contacto || r.persona || r.nombre || "",
        email: r.email || "",
        telefono: r.telefono || r.phone || "",
        estado: String(r.estado ?? "1"),
      })).filter(x => x.empresa || x.telefono || x.email);
      setPreview(norm);
    } catch (e) { setErr(e.message || "No se pudo leer el archivo"); }
  };

  const enviar = async () => {
    setErr(""); setMsg(""); setLoading(true);
    try {
      const { inserted, updated, duplicated } = await apiPost("/clientes/import", { items: preview });
      setMsg(`OK. Inserciones: ${inserted}, actualizados: ${updated}, duplicados: ${duplicated}`);
      setPreview([]);
      setFile(null); setText("");
    } catch (e) {
      const m = String(e.message||"");
      if (m.includes("nif_obligatorio")) setErr("Falta NIF de empresa en la sesión");
      else setErr(m || "Error al importar");
    } finally { setLoading(false); }
  };

  return (
    <div className="p-4">
      <h2 className="mb-4 text-xl font-semibold">Importar clientes</h2>
      {err && <div className="mb-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-800">{err}</div>}
      {msg && <div className="mb-3 rounded border border-green-300 bg-green-50 p-2 text-sm text-green-800">{msg}</div>}

      <div className="mb-3 flex flex-col gap-2">
        <input type="file" accept=".xlsx,.xls" onChange={(e)=>setFile(e.target.files?.[0]||null)} />
        <textarea className="h-40 w-full rounded border p-2" placeholder="Pega CSV/TSV con cabeceras: empresa,contacto,email,telefono,estado"
          value={text} onChange={(e)=>setText(e.target.value)} />
        <div className="flex gap-2">
          <button onClick={doPreview} className="rounded border px-3 py-2">Previsualizar</button>
          <button onClick={enviar} disabled={!preview.length || loading} className="rounded bg-blue-600 px-3 py-2 text-white">Importar</button>
        </div>
      </div>

      {!!preview.length && (
        <div className="overflow-x-auto rounded border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr><th className="p-2">Empresa</th><th className="p-2">Contacto</th><th className="p-2">Email</th><th className="p-2">Teléfono</th><th className="p-2">Estado</th></tr>
            </thead>
            <tbody>
              {preview.map((r,i)=>(
                <tr key={i} className="border-t">
                  <td className="p-2">{r.empresa}</td>
                  <td className="p-2">{r.contacto}</td>
                  <td className="p-2">{r.email}</td>
                  <td className="p-2">{r.telefono}</td>
                  <td className="p-2">{r.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
