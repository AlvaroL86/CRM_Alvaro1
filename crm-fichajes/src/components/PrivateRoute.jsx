import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PrivateRoute({ roles }) {
  const { user, ready } = useAuth();

  if (!ready) return null; // evita el “salto” al login

  if (!user) return <Navigate to="/login" replace />;

  if (roles && roles.length > 0 && !roles.includes(user.rol)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <Outlet />;
}
