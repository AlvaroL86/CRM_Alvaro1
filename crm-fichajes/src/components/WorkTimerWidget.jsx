// src/components/WorkTimerWidget.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { getEstado, iniciar, pausar, reanudar, finalizar } from "../services/fichajesActions";
import { subscribeFichajesChanged } from "../services/fichajesBus";
import { parseSQLLocal } from "../services/time";

const WEEK = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];

function fmtElapsed(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${ss}`;
}

/* ===== chips ===== */
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

/* ===== modal ===== */
function PauseModal({ open, onClose, onConfirm }) {
  const [motivos, setMotivos] = useState(["descanso","comida","reunión","personal","otros"]);
  const [motivo, setMotivo] = useState("descanso");
  const [nota, setNota] = useState("");
  const [durSel, setDurSel] = useState(15); // minutos preset
  const [durCustom, setDurCustom] = useState(""); // string para input

  useEffect(() => {
    if (!open) return;
    try {
      const saved = JSON.parse(localStorage.getItem("pause_reasons") || "[]");
      if (Array.isArray(saved) && saved.length) setMotivos(saved);
    } catch {}
    setMotivo("descanso");
    setNota("");
    setDurSel(15);
    setDurCustom("");
  }, [open]);

  const addMotivo = () => {
    const v = (durCustom || "").trim();
    if (!v) return;
    const list = Array.from(new Set([...motivos, v]));
    setMotivos(list);
    localStorage.setItem("pause_reasons", JSON.stringify(list));
    setMotivo(v);
    setDurCustom("");
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
         onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-base font-semibold text-gray-900">Pausar jornada</h3>
          <button onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-gray-100">✕</button>
        </div>

        <div className="px-4 pb-4 pt-3 space-y-4">
          <div>
            <div className="mb-1 text-sm text-gray-700">Selecciona un motivo</div>
            <div className="flex flex-wrap gap-2">
              {motivos.map((m) => (
                <Chip key={m} active={motivo === m} onClick={() => setMotivo(m)}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </Chip>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={durCustom}
                onChange={(e) => setDurCustom(e.target.value)}
                placeholder="Añadir motivo…"
                className="flex-1 rounded-lg border px-3 py-2 text-sm"
              />
              <button onClick={addMotivo} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
                Añadir
              </button>
            </div>
          </div>

          <div>
            <div className="mb-1 text-sm text-gray-700">Duración prevista</div>
            <div className="flex flex-wrap gap-2">
              {[5,10,15,20,30,45,60].map((m) => (
                <Chip key={m} active={durSel === m} onClick={() => setDurSel(m)}>
                  {m} min
                </Chip>
              ))}
              <Chip active={durSel === null} onClick={() => setDurSel(null)}>Sin definir</Chip>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  className="w-20 rounded border px-2 py-1 text-sm"
                  placeholder="Custom"
                  value={Number.isFinite(durSel) ? "" : ""}
                  onChange={(e) => setDurSel(Number(e.target.value) || 0)}
                />
                <span className="text-sm text-gray-600">min</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-700">Notas (opcional)</label>
            <textarea
              rows={3}
              className="mt-1 w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Ej. Pausa café de 10 min…"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <button onClick={onClose} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={() => onConfirm({ motivo, dur: durSel, nota })}
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm text-white hover:bg-amber-600"
            >
              Confirmar pausa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== main widget ===== */
export default function WorkTimerWidget() {
  const [estadoSrv, setEstadoSrv] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [openPause, setOpenPause] = useState(false);
  const lastChangeRef = useRef(Date.now()); // para congelar reloj al pausar

  // Tictac solo cuando está "running"
  useEffect(() => {
    if (!estadoSrv) return;
    const est = getStatus(estadoSrv);
    if (est !== "running") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [estadoSrv]);

  // cargar estado y escuchar cambios globales
  const load = async () => {
    try {
      const e = await getEstado();
      if (e) {
        setEstadoSrv(e);
        lastChangeRef.current = Date.now();
      }
    } catch {
      setEstadoSrv(null);
    }
  };
  useEffect(() => {
    load();
    const off = subscribeFichajesChanged(() => load());
    return () => off && off();
  }, []);

  // map a running/paused/stop
  function getStatus(e) {
    const est = String(e?.estado || "").toLowerCase();       // running/paused/stopped si tu backend lo manda
    const last = String(e?.ultima_accion || "").toLowerCase(); // fallback por última acción
    if (["running","paused","stopped"].includes(est)) return est;
    const paused = ["pausa","descanso","comida","otros","receso"].includes(last);
    const running = ["entrada","vuelta"].includes(last);
    if (paused) return "paused";
    if (running) return "running";
    return "stopped";
  }

  const status = useMemo(() => getStatus(estadoSrv), [estadoSrv]);

  // inicio de jornada (string SQL/ISO)
  const startedAt = useMemo(() => (status !== "stopped" ? estadoSrv?.inicio || estadoSrv?.fecha_hora || null : null), [estadoSrv, status]);

  // acumulado de pausas si backend lo provee; si no, 0
  const pausasAcumuladasMs = Number(estadoSrv?.pausasAcumuladasMs || 0);

  // tiempo transcurrido, congelado cuando está en pausa
  const elapsedMs = useMemo(() => {
    const d = parseSQLLocal(startedAt);
    if (!d) return 0;
    const base = status === "running" ? now : lastChangeRef.current; // congelar si pausado
    return Math.max(0, base - d.getTime() - pausasAcumuladasMs);
  }, [status, now, startedAt, pausasAcumuladasMs]);

  // cabecera de fecha/hora
  const d = new Date();
  const head = `${WEEK[d.getDay()]}, ${d.toLocaleDateString()} · ${d.toLocaleTimeString()}`;

  // acciones
  const doIniciar = async () => { await iniciar(); };
  const doFinalizar = async () => { if (confirm("¿Finalizar jornada?")) await finalizar(); };
  const doReanudar = async () => { await reanudar(); };
  const doPausar = async ({ motivo, dur, nota }) => {
    // Aquí sí usamos el contrato de fichajesActions: expectedMinutes puede ser null
    await pausar({ motivo, expectedMinutes: Number.isFinite(dur) ? dur : null, notas: nota || "" });
    setOpenPause(false);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="px-3 py-1.5 rounded-lg border bg-white text-sm font-semibold">
        {status === "stopped" ? "00:00:00" : fmtElapsed(elapsedMs)}
        <span className="ml-2 text-gray-600 font-normal">· {head}</span>
      </div>

      {status === "stopped" ? (
        <button className="px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-sm"
                onClick={doIniciar}>
          Iniciar
        </button>
      ) : status === "running" ? (
        <>
          <button className="px-3 py-1.5 rounded bg-amber-500 text-white hover:bg-amber-600 text-sm"
                  onClick={() => setOpenPause(true)}>
            Pausa
          </button>
          <button className="px-3 py-1.5 rounded bg-gray-800 text-white hover:bg-black text-sm"
                  onClick={doFinalizar}>
            Finalizar
          </button>
        </>
      ) : (
        <>
          <button className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
                  onClick={doReanudar}>
            Reanudar
          </button>
          <button className="px-3 py-1.5 rounded bg-gray-800 text-white hover:bg-black text-sm"
                  onClick={doFinalizar}>
            Finalizar
          </button>
        </>
      )}

      <PauseModal
        open={openPause}
        onClose={() => setOpenPause(false)}
        onConfirm={doPausar}
      />
    </div>
  );
}
