// src/components/PrivateRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PrivateRoute({ roles, children }) {
  const { user, isAuthenticated, ready } = useAuth() || {};

  // evita parpadeos de /login al recargar
  if (!ready) return null;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (roles && roles.length) {
    const role = (user?.rol || user?.role || "").toLowerCase();
    const ok = roles.map((r) => r.toLowerCase()).includes(role);
    if (!ok) return <Navigate to="/unauthorized" replace />;
  }

  return children ? children : <Outlet />;
}
