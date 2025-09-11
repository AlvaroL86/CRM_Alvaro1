// src/pages/Dashboard.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const initialCards = [
  { id: "users",    title: "Total usuarios",        to: "/admin/users",  subtitle: "Usuarios activos" },
  { id: "tickets",  title: "Soporte",               to: "/tickets",      subtitle: "Tickets abiertos" },
  { id: "ausencias",title: "RRHH",                  to: "/ausencias",    subtitle: "Ausencias pendientes" },
  { id: "fichajes", title: "Fichajes",              to: "/fichajes",     subtitle: "Trabajando ahora" },
];

export default function Dashboard() {
  const [cards, setCards] = useState(initialCards);
  const [dragId, setDragId] = useState(null);
  const navigate = useNavigate();

  const onDragStart = (e, id) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e) => e.preventDefault();

  const onDrop = (e, overId) => {
    e.preventDefault();
    if (!dragId || dragId === overId) return;
    const fromIdx = cards.findIndex(c => c.id === dragId);
    const toIdx   = cards.findIndex(c => c.id === overId);
    const next = [...cards];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setCards(next);
    setDragId(null);
  };

  const Card = ({ c }) => (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, c.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, c.id)}
      onClick={() => navigate(c.to)}
      className="cursor-move select-none bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition w-full"
      role="button"
      title={`Ir a ${c.title}`}
    >
      <div className="text-sm text-gray-500">{c.title}</div>
      <div className="mt-2 text-gray-900 font-medium">{c.subtitle}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Bienvenido al panel de admin</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(c => <Card key={c.id} c={c} />)}
      </div>
    </div>
  );
}
