// src/pages/Login.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const BRAND = import.meta.env.VITE_BRAND || "CRM";
const BRAND_LOGO = import.meta.env.VITE_BRAND_LOGO || "";

function withTimeout(promise, ms = 12000) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error("Tiempo de espera agotado")), ms)),
  ]);
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState("admin01");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!username.trim() || password === "") {
      setErr("Usuario y contraseña son obligatorios.");
      return;
    }

    setLoading(true);
    try {
      await withTimeout(login(username.trim(), password), 12000);
      navigate("/chat", { replace: true }); // <- a chat
    } catch (e) {
      setErr(e?.message || "Credenciales inválidas");
    } finally {
      setLoading(false); // <-- no se queda en “Accediendo…”
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          {BRAND_LOGO ? (
            <img src={BRAND_LOGO} alt={BRAND} className="mx-auto h-12 w-auto" />
          ) : (
            <span className="inline-flex items-center rounded-full bg-blue-600 text-white px-3 py-1 text-sm font-semibold">
              {BRAND}
            </span>
          )}
          <h1 className="mt-3 text-2xl font-bold text-gray-900">CRM Fichajes</h1>
          <p className="text-gray-500 mt-1">Accede a tu cuenta</p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          {err && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">
              {err}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Usuario</label>
              <input
                type="text"
                autoComplete="username"
                className="mt-1 w-full rounded-lg border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="admin01"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Contraseña</label>
              <div className="mt-1 relative">
                <input
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  className="w-full rounded-lg border-gray-300 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)} // sin trim
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                  title={showPwd ? "Ocultar" : "Mostrar"}
                >
                  {showPwd ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex justify-center items-center rounded-lg bg-blue-600 text-white font-medium py-2.5 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:opacity-60"
            >
              {loading ? "Accediendo..." : "Acceder"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link to="/forgot" className="text-blue-600 hover:underline">Olvidé mi contraseña</Link>
            <Link to="/request-access" className="text-blue-600 hover:underline">Solicitar registro</Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} CRM Fichajes
        </p>
      </div>
    </div>
  );
}
