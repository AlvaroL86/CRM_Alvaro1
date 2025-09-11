import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Carga inicial desde localStorage
    try {
      const u = localStorage.getItem("crm_user");
      const t = localStorage.getItem("crm_token");
      if (u && t) {
        setUser(JSON.parse(u));
        setToken(t);
      }
    } catch {}
    setReady(true);
  }, []);

  const login = (u, t) => {
    setUser(u);
    setToken(t);
    localStorage.setItem("crm_user", JSON.stringify(u));
    localStorage.setItem("crm_token", t);
    return { ok: true };
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("crm_user");
    localStorage.removeItem("crm_token");
  };

  return (
    <AuthContext.Provider value={{ user, token, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
