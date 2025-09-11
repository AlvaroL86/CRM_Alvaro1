// src/pages/Ausencias.jsx  (fragmento clave)
import { apiGet, apiPut } from "../services/api";

function getRol() {
  try {
    const raw = localStorage.getItem("crm_user");
    if (!raw) return "usuario";
    const u = JSON.parse(raw);
    return u.rol || u.role || "usuario";
  } catch {
    return "usuario";
  }
}

export default function Ausencias() {
  const [misAusencias, setMisAusencias] = useState([]);
  const [empresaAusencias, setEmpresaAusencias] = useState([]);
  const [errEmpresa, setErrEmpresa] = useState("");
  const isManager = ["admin", "supervisor"].includes(getRol());

  const loadEmpresa = async () => {
    setErrEmpresa("");
    try {
      const data = await apiGet("/ausencias/empresa"); // <-- ajusta a tu back
      setEmpresaAusencias(Array.isArray(data) ? data : []);
    } catch (e) {
      setErrEmpresa(e.message);
      setEmpresaAusencias([]);
    }
  };

  useEffect(() => {
    // tus cargas actuales de misAusencias ...
    if (isManager) loadEmpresa();
  }, []);

  const aprobar = async (id) => {
    try { await apiPut(`/ausencias/${id}/aprobar`); await loadEmpresa(); }
    catch (e) { alert(e.message); }
  };
  const rechazar = async (id) => {
    try { await apiPut(`/ausencias/${id}/rechazar`); await loadEmpresa(); }
    catch (e) { alert(e.message); }
  };

  return (
    <div className="space-y-4">
      {/* ... tu formulario y tabla “Mis solicitudes”… */}

      {/* Sección empresa: visible SOLO para admin/supervisor */}
      {isManager && (
        <>
          <h3 className="text-lg font-semibold">Solicitudes de la empresa</h3>
          {errEmpresa && <div className="text-sm text-red-600">{errEmpresa}</div>}

          <div className="bg-white rounded shadow overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="p-2">Empleado</th>
                  <th className="p-2">Tipo</th>
                  <th className="p-2">Motivo</th>
                  <th className="p-2">Inicio</th>
                  <th className="p-2">Fin</th>
                  <th className="p-2">Estado</th>
                  <th className="p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {empresaAusencias.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="p-2">{a.empleado || a.nombre}</td>
                    <td className="p-2">{a.tipo}</td>
                    <td className="p-2">{a.motivo || "-"}</td>
                    <td className="p-2">{a.inicio?.slice?.(0,10)}</td>
                    <td className="p-2">{a.fin?.slice?.(0,10)}</td>
                    <td className="p-2">
                      <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                        {a.estado || "pendiente"}
                      </span>
                    </td>
                    <td className="p-2 space-x-2">
                      <button onClick={() => aprobar(a.id)}
                        className="px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700">
                        Aprobar
                      </button>
                      <button onClick={() => rechazar(a.id)}
                        className="px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700">
                        Rechazar
                      </button>
                    </td>
                  </tr>
                ))}
                {empresaAusencias.length === 0 && (
                  <tr><td className="p-3 text-gray-500" colSpan={7}>Sin solicitudes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
