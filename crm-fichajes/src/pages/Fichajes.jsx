// src/pages/Fichajes.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet } from "../services/api";
import {
  getEstado,
  iniciar as accIniciar,
  pausar as accPausar,
  reanudar as accReanudar,
  finalizar as accFinalizar,
} from "../services/fichajesActions";
import { subscribeFichajesChanged } from "../services/fichajesBus";
import { parseSQLLocal } from "../services/time";

/* ========= helpers ========= */
const WEEK = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];

const fmtElapsed = (ms) => {
  const s = Math.max(0, Math.floor(ms/1000));
  const h = String(Math.floor(s/3600)).padStart(2,"0");
  const m = String(Math.floor((s%3600)/60)).padStart(2,"0");
  const ss = String(s%60).padStart(2,"0");
  return `${h}:${m}:${ss}`;
};
const fmtDateTime = (sql) => {
  if (!sql) return "-";
  const d = parseSQLLocal(sql);
  if (!d) return sql;
  return d.toLocaleString("es-ES", {
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/* ========= mini UI ========= */
function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-gray-100">✕</button>
        </div>
        <div className="px-4 pb-4 pt-3">{children}</div>
      </div>
    </div>
  );
}
function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm ${
        active ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

/* ========= Página ========= */
export default function Fichajes() {
  const [fichajes, setFichajes] = useState([]);
  const [estado, setEstado] = useState(null);
  const [err, setErr] = useState("");

  // reloj + “congelado” cuando se pausa (visual)
  const [now, setNow] = useState(Date.now());
  const frozenAtRef = useRef(null);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // pausa (modal “bonito”)
  const [openPause, setOpenPause] = useState(false);
  const [reasons, setReasons] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("pause_reasons") || "null")
        || ["descanso","comida","reunión","personal","otros"];
    } catch {
      return ["descanso","comida","reunión","personal","otros"];
    }
  });
  const [motivo, setMotivo] = useState("descanso");
  const [nota, setNota] = useState("");
  const [newReason, setNewReason] = useState("");

  const addReason = () => {
    const v = newReason.trim();
    if (!v) return;
    const list = Array.from(new Set([...reasons, v]));
    setReasons(list);
    localStorage.setItem("pause_reasons", JSON.stringify(list));
    setMotivo(v);
    setNewReason("");
  };
  const removeReason = (r) => {
    const list = reasons.filter((x) => x !== r);
    setReasons(list);
    localStorage.setItem("pause_reasons", JSON.stringify(list));
    if (motivo === r) setMotivo(list[0] || "descanso");
  };

  // duración prevista
  const DUR_PRESETS = [5, 10, 15, 20, 30, 45, 60];
  const [duracionMin, setDuracionMin] = useState(15);
  const [customMin, setCustomMin] = useState("");

  // carga datos + sincronización con el Topbar
  async function cargar() {
    try {
      setErr("");
      const [lista, est] = await Promise.all([
        apiGet("/fichajes").catch(() => []),
        getEstado().catch(() => null),
      ]);
      setFichajes(Array.isArray(lista) ? lista : []);
      setEstado(est || null);

      // si pasa a pausa, “congela” el cronómetro visual
      const last = String(est?.ultima_accion || "").toLowerCase();
      const paused = ["pausa","descanso","comida","otros","receso"].includes(last);
      if (paused && !frozenAtRef.current) frozenAtRef.current = Date.now();
      if (!paused) frozenAtRef.current = null;
    } catch (e) {
      setErr(e?.message || "Error al cargar fichajes");
    }
  }
  useEffect(() => {
    cargar();
    const off = subscribeFichajesChanged(cargar);
    return off;
  }, []);

  /* ====== estado derivado ====== */
  const status = useMemo(() => {
    const est = String(estado?.estado || "").toLowerCase();
    const last = String(estado?.ultima_accion || "").toLowerCase();
    const paused = ["pausa","descanso","comida","otros","receso"].includes(last);
    const running = ["dentro","activo","en_jornada","trabajando"].includes(est) || ["entrada","vuelta"].includes(last);
    if (!running && !paused) return "stop";
    return paused ? "paused" : "running";
  }, [estado]);

  const startedAt = useMemo(() => (status !== "stop" ? estado?.fecha_hora || null : null), [estado, status]);

  const elapsedMs = useMemo(() => {
    if (!startedAt) return 0;
    const d = parseSQLLocal(startedAt);
    if (!d) return 0;
    if (status === "paused" && frozenAtRef.current) {
      return Math.max(0, frozenAtRef.current - d.getTime());
    }
    return Math.max(0, now - d.getTime());
  }, [now, startedAt, status]);

  const showTime = status === "running" || status === "paused" ? fmtElapsed(elapsedMs) : "00:00:00";

  /* ====== acciones (usamos fichajesActions) ====== */
  const doIniciar = async () => { await accIniciar(); };
  const doFinalizar = async () => {
    if (!confirm("¿Finalizar jornada?")) return;
    frozenAtRef.current = null;
    await accFinalizar();
  };
  const abrirPausa = () => {
    setMotivo(reasons[0] || "descanso");
    setNota("");
    setDuracionMin(15);
    setCustomMin("");
    setOpenPause(true);
  };
  const confirmarPausa = async () => {
    const chosenMin = customMin ? Number(customMin) : Number(duracionMin) || null;
    const full = `${motivo}${chosenMin ? ` · ${chosenMin} min` : ""}${nota.trim() ? ` · ${nota.trim()}` : ""}`;
    await accPausar(full);
    setOpenPause(false);
  };
  const doReanudar = async () => {
    frozenAtRef.current = null;
    await accReanudar();
  };

  // exportar mes (igual que tenías)
  const exportMes = async () => {
    try {
      const base = new Date();
      const ym = `${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,"0")}`;
      const from = `${ym}-01`;
      const to = `${ym}-${String(new Date(base.getFullYear(), base.getMonth()+1, 0).getDate()).padStart(2,"0")}`;
      let data = [];
      try { data = await apiGet(`/fichajes?from=${from}&to=${to}`); } catch { data = await apiGet("/fichajes"); }
      const rows = (Array.isArray(data) ? data : []).filter(r => (r.fecha_hora || "").startsWith(ym));

      let XLSX = null;
      try { const m = await import("xlsx"); XLSX = m?.default || m; } catch {}
      if (XLSX) {
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Fichajes");
        XLSX.writeFile(wb, `fichajes_${ym}.xlsx`);
      } else {
        const header = "empleado,tipo,motivo,fecha_hora,duracion,nif\n";
        const body = rows.map(r => [
          r.empleado || r.username || r.nombre || "",
          r.tipo || "",
          r.motivo || "",
          r.fecha_hora || "",
          r.duracion || "",
          r.nif || "",
        ].join(",")).join("\n");
        const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `fichajes_${ym}.csv`;
        a.click();
      }
    } catch (e) {
      alert(e.message || "No se pudo exportar");
    }
  };

  // cabecera
  const d = new Date(now);
  const head = `${WEEK[d.getDay()]}, ${d.toLocaleDateString()} · ${d.toLocaleTimeString()}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Fichajes</h2>
        <button
          onClick={exportMes}
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
          title="Exportar mes"
        >
          ⤓ Exportar
        </button>
      </div>

      {err && (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {err}
        </div>
      )}

      {/* CABECERA con cronómetro + acciones */}
      <div className="flex flex-wrap items-center gap-3 rounded bg-white p-4 shadow">
        <div className="font-mono text-xl">{showTime}</div>
        <div className="text-gray-600">· {head}</div>

        <div className="ml-auto flex gap-2">
          {status === "stop" ? (
            <button
              onClick={doIniciar}
              className="rounded bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700"
            >
              Iniciar jornada
            </button>
          ) : status === "running" ? (
            <>
              <button
                onClick={abrirPausa}
                className="rounded bg-amber-500 px-3 py-2 text-sm text-white hover:bg-amber-600"
              >
                Pausa
              </button>
              <button
                onClick={doFinalizar}
                className="rounded bg-gray-800 px-3 py-2 text-sm text-white hover:bg-black"
              >
                Finalizar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={doReanudar}
                className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
              >
                Reanudar
              </button>
              <button
                onClick={doFinalizar}
                className="rounded bg-gray-800 px-3 py-2 text-sm text-white hover:bg-black"
              >
                Finalizar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tarjeta de estado actual */}
      {estado && (
        <div className="rounded bg-white p-3 shadow">
          <div className="text-sm text-gray-700">
            <b>Estado:</b> {status}
            {"  "}· <b>Inicio:</b> {startedAt ? fmtDateTime(startedAt) : "-"}
          </div>
        </div>
      )}

      {/* Tabla de fichajes */}
      <div className="overflow-x-auto rounded bg-white shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="p-2">Tipo</th>
              <th className="p-2">Motivo</th>
              <th className="p-2">Fecha/Hora</th>
              <th className="p-2">Duración</th>
              <th className="p-2">NIF</th>
            </tr>
          </thead>
          <tbody>
            {fichajes.map((f, i) => (
              <tr key={i} className="border-t">
                <td className="p-2 capitalize">{f.tipo}</td>
                <td className="p-2">{f.motivo || "-"}</td>
                <td className="p-2">{fmtDateTime(f.fecha_hora)}</td>
                <td className="p-2">{f.duracion ?? "-"}</td>
                <td className="p-2">{f.nif || "-"}</td>
              </tr>
            ))}
            {fichajes.length === 0 && (
              <tr>
                <td className="p-3 text-gray-500" colSpan={5}>
                  No hay fichajes
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Pausa */}
      <Modal open={openPause} title="Pausar jornada" onClose={() => setOpenPause(false)}>
        <div className="space-y-4">
          <div className="text-sm text-gray-700">Selecciona un motivo</div>
          <div className="flex flex-wrap gap-2">
            {reasons.map((r) => (
              <div key={r} className="flex items-center gap-1">
                <Chip active={motivo === r} onClick={() => setMotivo(r)}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Chip>
                <button
                  onClick={() => removeReason(r)}
                  className="text-gray-400 hover:text-red-500"
                  title="Quitar"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="Añadir motivo..."
              className="flex-1 rounded-lg border px-3 py-2 text-sm"
            />
            <button onClick={addReason} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
              Añadir
            </button>
          </div>

          {/* Duración prevista */}
          <div className="space-y-1">
            <label className="text-sm text-gray-700">Duración prevista</label>
            <div className="flex flex-wrap items-center gap-2">
              {DUR_PRESETS.map((m) => (
                <Chip
                  key={m}
                  active={Number(duracionMin) === m && !customMin}
                  onClick={() => { setDuracionMin(m); setCustomMin(""); }}
                >
                  {m} min
                </Chip>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  placeholder="Custom"
                  value={customMin}
                  onChange={(e) => setCustomMin(e.target.value)}
                  className="w-24 rounded-lg border px-3 py-1.5 text-sm"
                />
                <span className="text-sm text-gray-500">min</span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-600">Notas (opcional)</label>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Ej. Pausa café de 10 min…"
            />
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <button onClick={() => setOpenPause(false)} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={confirmarPausa} className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm text-white hover:bg-amber-600">
              Confirmar pausa
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
