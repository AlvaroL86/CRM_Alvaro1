// src/components/Topbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import WorkTimerWidget from "./WorkTimerWidget";

function initialsFrom(name = "Usuario") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "U"
  );
}

export default function Topbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const brand = import.meta?.env?.VITE_BRAND || "CRM Fichajes";
  const logo = import.meta?.env?.VITE_BRAND_LOGO || "/logo.png";

  const name =
    user?.nombre || user?.name || user?.username || user?.email || "Usuario";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-4">
      {/* Marca / título */}
      <Link
        to="/dashboard"
        className="flex items-center gap-2 font-semibold tracking-wide text-gray-800 hover:underline"
        title="Ir al dashboard"
        aria-label="Ir al dashboard"
      >
        <img
          src={logo}
          alt="logo"
          className="h-6 w-6"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
        <span>{brand}</span>
      </Link>

      {/* Centro: cronómetro/controles de jornada */}
      <div className="flex items-center">
        <WorkTimerWidget />
      </div>

      {/* Derecha: perfil + salir */}
      <div className="flex items-center gap-4">
        <Link
          to="/profile"
          className="flex items-center gap-3 text-sm text-gray-800 hover:underline"
          title="Ver perfil"
        >
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={name}
              className="h-8 w-8 rounded-full object-cover ring-1 ring-gray-200"
            />
          ) : (
            <div className="grid h-8 w-8 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">
              {initialsFrom(name)}
            </div>
          )}
          <span className="capitalize">{name}</span>
        </Link>

        <button
          onClick={handleLogout}
          className="rounded bg-gray-800 px-3 py-1.5 text-sm text-white hover:bg-black"
        >
          Salir
        </button>
      </div>
    </header>
  );
}
