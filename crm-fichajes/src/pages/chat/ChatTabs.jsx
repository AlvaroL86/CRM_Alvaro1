// src/pages/chat/ChatTabs.jsx
import { NavLink } from "react-router-dom";

export default function ChatTabs({ onNewChat }) {
  const tab = (to, label) => (
    <NavLink
      to={to}
      end={to === "/chat"} // importante para que /chat no esté activo cuando estás en /chat/groups
      className={({ isActive }) =>
        `rounded-md px-3 py-1.5 text-sm font-medium ${
          isActive ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"
        }`
      }
    >
      {label}
    </NavLink>
  );

  return (
    <div className="mb-2 flex items-center justify-between">
      <div className="flex gap-2">
        {tab("/chat", "General")}
        {tab("/chat/saved", "Guardados")}
        {tab("/chat/private", "Privados")}
        {tab("/chat/groups", "Grupos")}
      </div>

      <button
        onClick={onNewChat}
        className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        + Nuevo chat
      </button>
    </div>
  );
}
