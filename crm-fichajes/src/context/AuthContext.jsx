import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Función login mejorada: devuelve ok y mensaje de error
  const login = async (username, password) => {
    try {
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Error del backend con mensaje concreto
        return { ok: false, error: data.message || 'Error al iniciar sesión' };
      }

      // Si tu backend responde con { user: {...}, token: "..." }
      setUser({
        ...data.user,     // incluye id, username, rol, nif...
        token: data.token // si lo necesitas
      });

      return { ok: true };
    } catch (error) {
      // Error de red u otro error inesperado
      return { ok: false, error: error.message || 'Error desconocido' };
    }
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
