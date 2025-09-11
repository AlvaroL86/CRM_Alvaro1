// src/pages/Clientes.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost, apiDelete } from "../services/api";

/* ====== Validaciones ====== */
const emailOk = (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const phoneOk = (v) => !v || /^\+?\d{6,15}$/.test(v);
// Capitaliza la primera letra de cada palabra (Unicode)
const cap = (s) => (s || "").trim().replace(/\b\p{L}/gu, (m) => m.toUpperCase());

/* ====== Endpoints con fallback ====== */
const LIST_EPS   = ["/clientes", "/api/clientes", "/customers"];
const CREATE_EPS = ["/clientes", "/api/clientes", "/customers"];
const DELETE_EPS = (id) => [`/clientes/${id}`, `/api/clientes/${id}`, `/customers/${id}`];

/* Normaliza un cliente del backend a un shape estable para la tabla */
function normalizeClient(r, i = 0) {
  const id =
    r?.id || r?.cliente_id || r?.client_id || r?._id || `row_${i + 1}`;
  const empresa =
    r?.empresa_nombre ||
    r?.empresa ||
    r?.nombre_empresa ||
    r?.nombre ||
    r?.company ||
    "";
  const contacto =
    r?.contacto_nombre ||
    r?.contacto ||
    r?.persona_contacto ||
    r?.contact ||
    "";
  const email = r?.email || "";
  const telefono = r?.telefono || r?.phone || "";
  const estado =
    typeof r?.estado === "boolean"
      ? r?.estado
      : r?.activo ?? (String(r?.status || "").toLowerCase() !== "inactive");

  return { id, empresa, contacto, email, telefono, estado, _raw: r };
}

export default function Clientes() {
  const [empresa, setEmpresa] = useState("");
  const [contacto, setContacto] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");

  const [lista, setLista] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  /* ====== Carga lista de clientes con fallbacks ====== */
  const cargar = async () => {
    setErr("");
    setLoading(true);
    try {
      let data = null;
      let lastErr = null;

      for (const ep of LIST_EPS) {
        try {
          const res = await apiGet(ep);
          if (Array.isArray(res)) {
            data = res;
            break;
          }
        } catch (e) {
          lastErr = e;
        }
      }

      if (!Array.isArray(data)) {
        throw lastErr || new Error("No se pudo obtener la lista de clientes.");
      }

      const norm = data.map((r, i) => normalizeClient(r, i));
      setLista(norm);
    } catch (e) {
      setErr(e.message || "Error al cargar clientes");
      setLista([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  /* ====== Crear cliente con fallbacks ====== */
  const crear = async (e) => {
    e.preventDefault();
    setErr("");

    // Validaciones de tu formulario
    if (!empresa.trim()) return setErr("Empresa obligatoria");
    if (!emailOk(email)) return setErr("Email no válido");
    if (!phoneOk(telefono)) return setErr("Teléfono no válido");

    const payload = {
      // Respeta tu contrato actual
      empresa: empresa.trim(),
      contacto: contacto.trim() || null,
      email: email.trim() || null,
      telefono: telefono.trim() || null,
    };

    setLoading(true);
    try {
      let ok = false;
      let lastErr = null;
      for (const ep of CREATE_EPS) {
        try {
          // Algunos backends devuelven 201 sin body -> no pasa nada
          await apiPost(ep, payload);
          ok = true;
          break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (!ok) throw lastErr || new Error("No se pudo crear el cliente.");

      // limpia y recarga
      setEmpresa("");
      setContacto("");
      setEmail("");
      setTelefono("");
      await cargar();
    } catch (e) {
      setErr(e.message || "Error al crear cliente");
    } finally {
      setLoading(false);
    }
  };

  /* ====== Eliminar cliente con fallbacks ====== */
  const borrar = async (id) => {
    if (!confirm("¿Eliminar este cliente? Se borrarán sus contactos.")) return;
    try {
      let ok = false;
      let lastErr = null;
      for (const ep of DELETE_EPS(id)) {
        try {
          await apiDelete(ep);
          ok = true;
          break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (!ok) throw lastErr || new Error("No se pudo eliminar el cliente.");
      await cargar();
    } catch (e) {
      setErr(e.message || "No se pudo eliminar");
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Clientes</h1>

      {err && (
        <p className="rounded border border-red-200 bg-red-50 p-2 text-red-700">
          {err}
        </p>
      )}

      {/* Formulario creación */}
      <form onSubmit={crear} className="space-y-3 rounded-lg bg-white p-4 shadow">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            className="rounded border px-3 py-2"
            placeholder="Empresa"
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
          />
          <input
            className="rounded border px-3 py-2"
            placeholder="Nombre contacto"
            value={contacto}
            onChange={(e) => setContacto(e.target.value)}
          />
          <input
            className={`rounded border px-3 py-2 ${
              email && !emailOk(email) ? "border-red-500" : ""
            }`}
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className={`rounded border px-3 py-2 ${
              telefono && !phoneOk(telefono) ? "border-red-500" : ""
            }`}
            placeholder="Teléfono (+34600111222)"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 md:w-auto"
        >
          {loading ? "Creando..." : "Crear cliente"}
        </button>
      </form>

      {/* Tabla listado */}
      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-3 text-left">Empresa</th>
              <th className="p-3 text-left">Contacto</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Teléfono</th>
              <th className="p-3 text-left">Estado</th>
              <th className="w-40 p-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && !loading && (
              <tr>
                <td colSpan="6" className="p-3 text-gray-500">
                  Sin clientes.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan="6" className="p-3 text-gray-500">
                  Cargando…
                </td>
              </tr>
            )}

            {lista.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 capitalize">{cap(r.empresa)}</td>
                <td className="p-3 capitalize">
                  {r.contacto ? cap(r.contacto) : "-"}
                </td>
                <td className="p-3">{r.email || "-"}</td>
                <td className="p-3">{r.telefono || "-"}</td>
                <td className="p-3">{r.estado ? "Activo" : "Inactivo"}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button
                      className="rounded bg-slate-100 px-3 py-1 hover:bg-slate-200"
                      onClick={() => navigate(`/clientes/${r.id}`)}
                    >
                      Editar
                    </button>
                    <button
                      className="rounded bg-red-50 px-3 py-1 text-red-700 hover:bg-red-100"
                      onClick={() => borrar(r.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
