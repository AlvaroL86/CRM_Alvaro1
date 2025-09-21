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
  const [user, setUser] = useState(readUser());
  const [ready, setReady] = useState(false);
  const isAuthenticated = !!user;

  useEffect(() => {
    (async () => {
      try {
        const t = readToken();
        if (t) {
          const me = await apiGet("/auth/whoami"); // alias de /auth/me
          setUser(me);
          saveUser(me);
        } else {
          clearToken();
          setUser(null);
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
    // username trim, password tal cual
    const payload = {
      username: String(username || "").trim(),
      password: String(password ?? ""),
    };
    const { token, user } = await apiPost("/auth/login", payload);
    saveToken(token);
    saveUser(user);
    setUser(user);
    return user;
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, isAuthenticated, ready, login, logout }),
    [user, isAuthenticated, ready]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
