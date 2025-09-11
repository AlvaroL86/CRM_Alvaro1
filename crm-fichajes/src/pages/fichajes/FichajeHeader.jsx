// src/pages/fichajes/FichajeHeader.jsx
import { useEffect, useMemo, useState } from "react";
import { apiPost } from "../../services/api";

const WEEK = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${ss}`;
}

export default function FichajeHeader() {
  const [now, setNow] = useState(Date.now());
  const [running, setRunning] = useState(
    () => localStorage.getItem("fichaje_running") === "1"
  );
  const [startedAt, setStartedAt] = useState(
    () => parseInt(localStorage.getItem("fichaje_started_at") || "0", 10) || 0
  );

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = useMemo(() => {
    if (!running || !startedAt) return 0;
    return now - startedAt;
  }, [running, startedAt, now]);

  const start = async () => {
    const ts = Date.now();
    localStorage.setItem("fichaje_running", "1");
    localStorage.setItem("fichaje_started_at", String(ts));
    setStartedAt(ts);
    setRunning(true);
    // opcional: notificar al back si tienes endpoint
    try { await apiPost("/fichajes/entrada", { at: new Date(ts).toISOString() }); } catch {}
  };

  const stop = async () => {
    localStorage.removeItem("fichaje_running");
    localStorage.removeItem("fichaje_started_at");
    setRunning(false);
    // opcional: notificar al back
    try { await apiPost("/fichajes/salida", { at: new Date().toISOString() }); } catch {}
  };

  const d = new Date(now);
  const dia = WEEK[d.getDay()];
  const fecha = d.toLocaleDateString();
  const hora = d.toLocaleTimeString();

  return (
    <div className="bg-white rounded shadow p-4 flex flex-wrap items-center gap-3">
      <div className="text-xl font-bold">{fmt(elapsed)}</div>
      <div className="text-gray-600">· {dia}, {fecha} · {hora}</div>
      <div className="ml-auto space-x-2">
        {!running ? (
          <button onClick={start} className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700">
            Iniciar jornada
          </button>
        ) : (
          <button onClick={stop} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700">
            Finalizar
          </button>
        )}
      </div>
    </div>
  );
}
