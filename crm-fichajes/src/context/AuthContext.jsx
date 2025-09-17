// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, saveToken, clearToken, readToken } from "../services/api";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false); // <- clave para no romper el render
  const isAuthenticated = !!user;

  // Al montar, si hay token, consultamos /auth/whoami
  useEffect(() => {
    (async () => {
      try {
        const t = readToken();
        if (t) {
          const me = await apiGet("/auth/whoami"); // OJO: es /auth/whoami (no /auth/me)
          setUser(me);
        } else {
          clearToken();
        }
      } catch {
        clearToken();
        setUser(null);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  async function login(username, password) {
    const { token, user } = await apiPost("/auth/login", { username, password });
    saveToken(token);
    setUser(user);
    return user;
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  const value = useMemo(() => ({
    user, isAuthenticated, ready, login, logout
  }), [user, isAuthenticated, ready]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
