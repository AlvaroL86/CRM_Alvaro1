// src/components/PrivateRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PrivateRoute({ roles, children }) {
  const { ready, isAuthenticated, user } = useAuth(); // <- sin optional chaining
  const location = useLocation();

  // Mientras AuthContext comprueba el token, no renderizamos nada
  if (!ready) return null; // o un spinner si quieres

  // Si no hay sesión, al login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Si se piden roles, comprobar
  if (roles?.length) {
    const role = (user?.rol || user?.role || "").toLowerCase();
    const ok = roles.map(r => r.toLowerCase()).includes(role);
    if (!ok) return <Navigate to="/unauthorized" replace />;
  }

  return children ?? <Outlet />;
}
