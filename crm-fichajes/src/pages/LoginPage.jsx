import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  async function enviar(e) {
    e.preventDefault();
    setErr("");
    try {
      const res = await fetch("http://localhost:3000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login incorrecto");

      // guarda info mínima para otras pantallas
      localStorage.setItem("user_token", data.token);
      localStorage.setItem("user_id", data.user.id);
      localStorage.setItem("username", data.user.username || "");
      localStorage.setItem("nombre", data.user.nombre || "");
      localStorage.setItem("rol", data.user.rol || "");
      navigate("/dashboard", { replace: true });
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white shadow rounded p-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-800 text-center">CRM Fichajes</h1>
        {err && <p className="text-red-600 text-center">{err}</p>}
        <form onSubmit={enviar} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700">Usuario</label>
            <input
              autoComplete="username"
              className="mt-1 w-full border rounded p-2"
              value={username}
              onChange={e=>setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Contraseña</label>
            <input
              type="password"
              autoComplete="current-password"
              className="mt-1 w-full border rounded p-2"
              value={password}
              onChange={e=>setPassword(e.target.value)}
              required
            />
          </div>
          <button className="w-full bg-blue-600 text-white rounded py-2 hover:bg-blue-700">
            Acceder
          </button>
        </form>

        <div className="flex items-center justify-between text-sm">
          <Link to="/forgot" className="text-blue-600 hover:underline">Olvidé mi contraseña</Link>
          <Link to="/request-access" className="text-blue-600 hover:underline">Solicitar acceso</Link>
        </div>
      </div>
    </div>
  );
}
