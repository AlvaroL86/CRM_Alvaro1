import axios from 'axios';

// Crear instancia de Axios
const api = axios.create({
  baseURL: 'http://localhost:3000', // Cambia si usas otro puerto
});

// Interceptor para añadir el token JWT a cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
// Aquí irían las funciones para conectar con tu backend, ejemplo:
export async function login(username, password) {
  // return await fetch(...)
}

