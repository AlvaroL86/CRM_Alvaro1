// src/services/fichajes.js
import { apiGet, apiPost } from "./api";

/* ---------------- Bus de eventos ---------------- */
const listeners = new Set();
export function onFichajesChanged(cb) { listeners.add(cb); return () => listeners.delete(cb); }
function emitChange() { listeners.forEach(fn => { try { fn(); } catch {} }); }

/* ---------------- Util: fecha local SQL (NO UTC) ---------------- */
const pad = (n) => String(n).padStart(2, "0");
const nowLocalSQL = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/* ---------------- Normalización de estado ---------------- */
function legacyToState(est) {
  if (!est) return { mode: "legacy", status: "stop", startedAt: null, pausedMs: 0 };
  const estado = String(est.estado || "").toLowerCase();
  const last   = String(est.ultima_accion || "").toLowerCase();
  const runningLike = ["dentro","activo","en_jornada","trabajando"].includes(estado) || ["entrada","vuelta"].includes(last);
  const pausedLike  = ["pausa","descanso","comida","otros","receso"].includes(last);
  const status = pausedLike ? "paused" : (runningLike ? "running" : "stop");
  return { mode: "legacy", status, startedAt: est.fecha_hora || null, pausedMs: 0 };
}

/* ---------------- Lecturas ---------------- */
export async function fetchState() {
  try {
    const a = await apiGet("/fichajes/activo");
    const raw = String(a?.estado || a?.status || (a?.running ? "running":"stop")).toLowerCase();
    return { mode: "modern", status: raw, startedAt: a?.startedAt || null, pausedMs: a?.pausedMs || 0 };
  } catch {
    const est = await apiGet("/fichajes/estado-actual").catch(() => null);
    return legacyToState(est);
  }
}
export async function fetchList(qs = "") {
  try { return await apiGet(`/fichajes${qs}`); } catch { return []; }
}

/* ---------------- Acciones (moderno -> legacy fallback) ---------------- */
export async function startWork() {
  try { await apiPost("/fichajes/iniciar", {}); }
  catch { await apiPost("/fichajes", { tipo:"entrada", motivo:null, fecha_hora:nowLocalSQL(), duracion:null }); }
  emitChange();
}
export async function pauseWork(motivo) {
  try { await apiPost("/fichajes/pausar", { motivo }); }
  catch { await apiPost("/fichajes", { tipo:"pausa", motivo, fecha_hora:nowLocalSQL(), duracion:null }); }
  emitChange();
}
export async function resumeWork() {
  try { await apiPost("/fichajes/reanudar", {}); }
  catch { await apiPost("/fichajes", { tipo:"vuelta", motivo:null, fecha_hora:nowLocalSQL(), duracion:null }); }
  emitChange();
}
export async function finishWork() {
  try { await apiPost("/fichajes/finalizar", {}); }
  catch { await apiPost("/fichajes", { tipo:"salida", motivo:null, fecha_hora:nowLocalSQL(), duracion:null }); }
  emitChange();
}
// estado viene del backend o del bus: { estado: 'running'|'paused'|'stopped', inicio, pausasAcumuladasMs }
const [now, setNow] = useState(Date.now());

useEffect(() => {
  if (estado === 'running') {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }
  // si está pausado o parado, no hay intervalo
}, [estado]);

const elapsedMs = useMemo(() => {
  if (!inicio) return 0;
  const base = (estado === 'running') ? now : lastTickWhenChanged; 
  // O más simple: si paused -> usar la última marca enviada por el bus
  return Math.max(0, base - new Date(inicio).getTime() - (pausasAcumuladasMs || 0));
}, [now, inicio, pausasAcumuladasMs, estado]);