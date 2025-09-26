// src/components/PrivateGuard.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Permite el acceso si:
 *  - el rol del usuario está en 'roles', O
 *  - el usuario tiene el permiso 'perm' (p.ej. "usuarios.usersview").
 */
export default function PrivateGuard({ roles = [], perm = "" }) {
  const { user, ready, isAuthenticated, perms } = useAuth();

  if (!ready) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const myRole = (user?.rol || user?.role || "").toLowerCase();
  const roleOk = !roles.length || roles.map(r => r.toLowerCase()).includes(myRole);

  const permOk = (() => {
    if (!perm) return true;
    try {
      const [mod, action] = String(perm).split(".");
      const m = perms?.modules?.[mod];
      if (!m || !m.active) return false;
      return action ? !!m.actions?.[action] : true;
    } catch { return false; }
  })();

  return (roleOk || permOk) ? <Outlet /> : <Navigate to="/unauthorized" replace />;
}
