// src/components/Sidebar.jsx
import { NavLink } from "react-router-dom";
import { Disclosure } from "@headlessui/react";
import {
  Home,
  ClipboardList,
  Users as UsersIcon,
  MessageSquare,
  Calendar as CalendarIcon,
  UserCog,
  ChevronDown,
  Shield,
  ShieldCheck,
  FileText, // ⬅️ Tickets
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

/* ====== helpers de estilos ====== */
const link =
  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100";
const active = "bg-blue-600 text-white hover:bg-blue-600";

function Item({ to, icon: Icon, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `${link} ${isActive ? active : ""}`}
    >
      <Icon className="h-4 w-4" />
      <span>{children}</span>
    </NavLink>
  );
}

function hasRole(user, roles = []) {
  if (!roles?.length) return true;
  const r = (user?.rol || user?.role || "").toLowerCase();
  return roles.map((x) => x.toLowerCase()).includes(r);
}

/* ====== Sidebar ====== */
export default function Sidebar() {
  const { user } = useAuth();
  // Si solo admin debe ver Admin, cambia a ["admin"]
  const isAdmin = hasRole(user, ["admin", "supervisor"]);

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-white p-3">
      <div className="px-2 py-3">
        <h1 className="text-lg font-semibold text-gray-800">CRM</h1>
        <p className="text-xs text-gray-500">
          {user?.username || user?.nombre || "Usuario"}
        </p>
      </div>

      <nav className="mt-2 space-y-1">
        <Item to="/dashboard" icon={Home}>
          Dashboard
        </Item>

        <Item to="/fichajes" icon={ClipboardList}>
          Fichajes
        </Item>

        <Item to="/calendario" icon={CalendarIcon}>
          Calendario
        </Item>

        <Item to="/clientes" icon={UsersIcon}>
          Clientes
        </Item>

        {/* Chat como ÚNICO ítem */}
        <Item to="/chat" icon={MessageSquare}>
          Chat
        </Item>

        {/* Tickets visible en el menú principal */}
        <Item to="/tickets" icon={ClipboardList}>Tickets</Item>

        {/* Admin */}
        {isAdmin && (
          <Disclosure>
            {({ open }) => (
              <div className="mt-2">
                <Disclosure.Button className="w-full rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <UserCog className="h-4 w-4" />
                      Admin
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </Disclosure.Button>
                <Disclosure.Panel>
                  <div className="ml-6 mt-1 space-y-1">
                    <Item to="/admin/users" icon={Shield}>
                      Usuarios
                    </Item>
                    <Item to="/admin/users-roles" icon={ShieldCheck}>
                      Usuarios (roles)
                    </Item>
                  </div>
                </Disclosure.Panel>
              </div>
            )}
          </Disclosure>
        )}
      </nav>

      <div className="mt-auto px-2 pt-2 text-xs text-gray-400">
        v1.0 • {user?.rol || user?.role || "usuario"}
      </div>
    </aside>
  );
}
