// src/pages/Calendario.jsx
import { useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "../services/api";

const TYPES = ["Reunión","Vacaciones","Baja médica","Permiso","Tarea"];

function Modal({open,onClose,children,title}) {
  if(!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
         onClick={e=> e.target===e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">{title}</h3>
          <button className="rounded p-1 hover:bg-gray-100" onClick={onClose}>✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export default function Calendario(){
  const [events,setEvents]=useState([]);
  const [open,setOpen]=useState(false);
  const [date,setDate]=useState("");
  const [title,setTitle]=useState("");
  const [type,setType]=useState(TYPES[0]);
  const [dur,setDur]=useState(60); // minutos

  useEffect(()=>{ (async ()=>{
    try{
      const data = await apiGet("/eventos").catch(()=>null);
      if (Array.isArray(data)) setEvents(data);
      else {
        const local = JSON.parse(localStorage.getItem("events")||"[]");
        setEvents(local);
      }
    }catch{}
  })(); },[]);

  function addLocal(ev){
    const list=[...events, ev];
    setEvents(list);
    localStorage.setItem("events", JSON.stringify(list));
  }

  async function create(){
    const payload = { title, type, date, minutes: Number(dur) };
    try {
      const saved = await apiPost("/eventos", payload).catch(()=>null);
      addLocal(saved || { id: Date.now(), ...payload });
      setOpen(false);
      setTitle("");
    } catch(e){ alert(e.message); }
  }

  // UI de calendario simple (slots clicables)
  const grid = [];
  for(let d=1; d<=31; d++) grid.push(d);
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Calendario</h2>
      <div className="grid grid-cols-7 gap-2">
        {grid.map(d=>(
          <button key={d}
            onClick={()=>{ setDate(`2025-09-${String(d).padStart(2,"0")}`); setOpen(true); }}
            className="aspect-[1/1] rounded-lg border bg-white hover:bg-gray-50 text-sm p-2 text-left">
            <div className="text-gray-500">{d}</div>
            <div className="mt-1 space-y-1">
              {events.filter(e=>e.date?.endsWith(`-${String(d).padStart(2,"0")}`)).slice(0,3).map(e=>(
                <div key={e.id} className="truncate rounded bg-blue-50 px-1 py-0.5 text-[11px]">
                  {e.type}: {e.title}
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>

      <Modal open={open} onClose={()=>setOpen(false)} title={`Nuevo evento · ${date}`}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600">Título</label>
            <input className="mt-1 w-full rounded border p-2" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Asunto / descripción corta"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600">Tipo</label>
              <select className="mt-1 w-full rounded border p-2" value={type} onChange={e=>setType(e.target.value)}>
                {TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600">Duración</label>
              <select className="mt-1 w-full rounded border p-2" value={dur} onChange={e=>setDur(e.target.value)}>
                {[15,30,45,60,90,120,240,480].map(m=><option key={m} value={m}>{m} min</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button className="rounded border px-3 py-2 hover:bg-gray-50" onClick={()=>setOpen(false)}>Cancelar</button>
            <button className="rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700" onClick={create}>Añadir evento</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
