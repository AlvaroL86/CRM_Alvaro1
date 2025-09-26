// src/pages/Profile.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiPatch, saveUser } from "../services/api";
import PasswordInput from "../components/PasswordInput";

export default function Profile() {
  const { user } = useAuth();
  const [nombre, setNombre] = useState(user?.nombre || "");
  const [email, setEmail] = useState(user?.email || "");
  const [telefono, setTelefono] = useState(user?.telefono || "");
  const [newPass, setNewPass] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNombre(user?.nombre || ""); setEmail(user?.email || ""); setTelefono(user?.telefono || "");
  }, [user]);

  const onSave = async (e) => {
    e.preventDefault(); setErr(""); setMsg(""); setLoading(true);
    try {
      const payload = { nombre, email, telefono };
      if (newPass.trim()) payload.password = newPass.trim();
      const me = await apiPatch("/auth/me", payload);
      saveUser(me);
      setMsg("Perfil actualizado"); setNewPass("");
    } catch (e) {
      const m = String(e.message || "");
      if (m.includes("email_duplicado")) setErr("Ese email ya está en uso");
      else if (m.includes("telefono_duplicado")) setErr("Ese teléfono ya está en uso");
      else setErr(m || "Error al guardar");
    } finally { setLoading(false); }
  };

  return (
    <div className="p-4 max-w-2xl">
      <h2 className="mb-4 text-xl font-semibold">Perfil</h2>
      {err && <div className="mb-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-800">{err}</div>}
      {msg && <div className="mb-3 rounded border border-green-300 bg-green-50 p-2 text-sm text-green-800">{msg}</div>}
      <form onSubmit={onSave} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input className="rounded border p-2" placeholder="Nombre" value={nombre} onChange={(e)=>setNombre(e.target.value)} />
        <input className="rounded border p-2" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input className="rounded border p-2" placeholder="Teléfono" value={telefono} onChange={(e)=>setTelefono(e.target.value)} />
        <div className="sm:col-span-2">
          <PasswordInput value={newPass} onChange={(e)=>setNewPass(e.target.value)} placeholder="Nueva contraseña (opcional)" />
        </div>
        <div className="sm:col-span-2">
          <button disabled={loading} className="rounded bg-blue-600 px-3 py-2 text-white">Guardar cambios</button>
        </div>
      </form>
    </div>
  );
}
