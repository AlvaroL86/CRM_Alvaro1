// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  apiGet,
  apiPost,
  saveToken,
  clearToken,
  readToken,
  saveUser,
  readUser,
} from "../services/api";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readUser());
  const [perms, setPerms] = useState(null);
  const [ready, setReady] = useState(false);

  const isAuthenticated = !!user;

  async function fetchPerms(roleSlug) {
    try {
      if (!roleSlug) return setPerms(null);
      const data = await apiGet(`/roles/${String(roleSlug).toLowerCase()}`);
      setPerms(data?.permisos || null);
    } catch {
      setPerms(null);
    }
  }

  // Cargar sesión al montar
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = readToken();
        if (token) {
          const me = await apiGet("/auth/me");
          if (!alive) return;
          setUser(me);
          await fetchPerms(me?.rol);
        } else {
          setUser(null);
          setPerms(null);
        }
      } catch {
        // token inválido, limpiar
        setUser(null);
        setPerms(null);
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  async function login(username, password) {
    const { token, user } = await apiPost("/auth/login", {
      username: String(username || "").trim(),
      password: String(password ?? ""),
    });
    saveToken(token);
    saveUser(user);
    setUser(user);
    await fetchPerms(user?.rol);
    return user;
  }

  function logout() {
    clearToken();
    setUser(null);
    setPerms(null);
  }

  const value = useMemo(
    () => ({ user, perms, isAuthenticated, ready, login, logout }),
    [user, perms, isAuthenticated, ready]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
