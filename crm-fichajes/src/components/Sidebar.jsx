import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  FaUserCog,
  FaUsers,
  FaHome,
  FaSignOutAlt,
  FaTimes,
} from "react-icons/fa";

export default function Sidebar() {
  const [open, setOpen] = useState(true);
  const location = useLocation();
  const { logout } = useAuth();

  if (!open) {
    return (
      <button
        className="m-2 p-2 bg-blue-500 text-white rounded"
        onClick={() => setOpen(true)}
        title="Abrir menú"
      >
        ☰
      </button>
    );
  }

  return (
    <aside className="w-64 bg-gray-800 text-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <span className="font-bold text-lg">CRM Fichajes</span>
        <button onClick={() => setOpen(false)} title="Ocultar barra">
          <FaTimes />
        </button>
      </div>
      <nav className="flex-1 p-4 space-y-3">
        <SidebarLink to="/" icon={<FaHome />} label="Inicio" active={location.pathname === "/"} />
        <SidebarLink to="/dashboard" icon={<FaUserCog />} label="Panel" active={location.pathname === "/dashboard"} />
        <SidebarLink to="/users" icon={<FaUsers />} label="Usuarios" active={location.pathname === "/users"} />
        <SidebarLink to="/ausencias" icon={<FaUserCog />} label="Ausencias" active={location.pathname === "/ausencias"} />
        <SidebarLink to="/admin/users" icon={<FaUserCog />} label="Admin" active={location.pathname === "/admin/users"} />
        <button
          className="mt-6 flex items-center gap-2 p-2 w-full text-left hover:bg-gray-700 rounded"
          onClick={logout}
        >
          <FaSignOutAlt /> Cerrar sesión
        </button>
      </nav>
    </aside>
  );
}

function SidebarLink({ to, icon, label, active }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 p-2 rounded ${active ? "bg-blue-600" : "hover:bg-gray-700"}`}
    >
      {icon}
      {label}
    </Link>
  );
}
