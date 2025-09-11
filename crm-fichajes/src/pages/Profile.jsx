// src/pages/Profile.jsx
import { useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { BASE_URL } from "../services/api";

const MAX_MB = 2;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export default function Profile() {
  const { user, login } = useAuth(); // login lo usamos para refrescar datos guardados
  const [preview, setPreview] = useState(user?.avatar_url || user?.avatar || "");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  function openPicker() {
    setErr(""); setOk("");
    fileRef.current?.click();
  }

  async function onPickAvatar(e) {
    setErr(""); setOk("");
    const file = e.target.files?.[0];
    if (!file) return;

    // Validaciones
    if (!ALLOWED.includes(file.type)) {
      setErr("Formato no válido. Usa JPG, PNG o WEBP.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      setErr(`Archivo demasiado grande (máx ${MAX_MB}MB).`);
      e.target.value = "";
      return;
    }

    // Vista previa local
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    // Subida
    try {
      setLoading(true);
      const fd = new FormData();
      fd.append("avatar", file);

      const resp = await fetch(`${BASE_URL}/usuarios/avatar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("crm_token") || ""}`,
        },
        body: fd,
      });

      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j.error || "No se pudo subir el avatar");
      }

      const data = await resp.json(); // { avatar_url, ... }
      // Actualiza storage/context para que Topbar y resto lo vean
      try {
        const raw = localStorage.getItem("crm_user");
        const u = raw ? JSON.parse(raw) : {};
        const updated = { ...u, avatar_url: data.avatar_url || data.url || u.avatar_url };
        localStorage.setItem("crm_user", JSON.stringify(updated));
        login(updated, localStorage.getItem("crm_token") || ""); // refresca contexto
      } catch {}

      setOk("Avatar actualizado");
    } catch (e2) {
      setErr(e2.message);
      // si falló, revierte preview al anterior
      setPreview(user?.avatar_url || user?.avatar || "");
    } finally {
      setLoading(false);
      e.target.value = ""; // permite volver a elegir el mismo archivo
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Perfil</h2>

      {err && (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">
          {err}
        </div>
      )}
      {ok && (
        <div className="rounded-md bg-green-50 border border-green-200 text-green-700 px-4 py-2 text-sm">
          {ok}
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-6 flex items-center gap-6">
        <div className="relative">
          {preview ? (
            <img
              src={preview}
              alt="Avatar"
              className="h-20 w-20 rounded-full object-cover ring-1 ring-gray-200"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-gray-100 text-gray-600 grid place-items-center text-xl font-semibold ring-1 ring-gray-200">
              {(user?.nombre || user?.name || "U").charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="text-lg font-semibold capitalize">
            {user?.nombre || user?.name || user?.username || "Usuario"}
          </div>
          <div className="text-sm text-gray-500">{user?.email || "—"}</div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={openPicker}
              className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Subiendo..." : "Cambiar avatar"}
            </button>
            <span className="text-xs text-gray-500">
              Formatos: JPG/PNG/WEBP, máx {MAX_MB}MB
            </span>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept={ALLOWED.join(",")}
            className="hidden"
            onChange={onPickAvatar}
          />
        </div>
      </div>

      {/* Aquí más campos del perfil si quieres (nombre, teléfono, etc.) */}
    </div>
  );
}
