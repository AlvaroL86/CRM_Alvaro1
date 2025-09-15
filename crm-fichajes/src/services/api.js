// crm-fichajes/src/services/api.js
import axios from "axios";

/* ========= Config base ========= */
// Dominio de la API en producción (Render)
const PROD_API_URL = "https://fichaje-api-yujp.onrender.com";

// Si estás en dev => localhost; en prod => Render (por si falla el env)
const DEFAULT_API_URL = (import.meta?.env?.DEV)
  ? "http://localhost:3000"
  : PROD_API_URL;

// Variables de entorno de Vite (Netlify/CI); usan prefijo VITE_
const ENV_BASE_URL =
  import.meta?.env?.VITE_API_URL ||
  import.meta?.env?.VITE_API_BASE_URL ||
  null;

// URL final
export const BASE_URL = (ENV_BASE_URL?.trim()) || DEFAULT_API_URL;

/* ========= Token helpers ========= */
const TOKEN_KEYS = ["crm_token", "user_token", "token"];

export function readToken() {
  for (const key of TOKEN_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const maybeObj = JSON.parse(raw);
      if (typeof maybeObj === "string") return maybeObj;                 // "xxx.yyy.zzz"
      if (maybeObj && typeof maybeObj.token === "string") return maybeObj.token; // { token: "..." }
    } catch {
      // texto plano -> token directo
      return raw;
    }
  }
  return null;
}

export const getToken = readToken;

export function saveToken(token) {
  localStorage.setItem("crm_token", token);
}

export function clearToken() {
  for (const k of TOKEN_KEYS) localStorage.removeItem(k);
  localStorage.removeItem("crm_user");
}

/* ========= Headers con Authorization ========= */
export function getAuthHeaders(extra = {}) {
  const t = readToken();
  return t ? { Authorization: `Bearer ${t}`, ...extra } : { ...extra };
}

/* ========= Axios instance ========= */
export const http = axios.create({
  baseURL: BASE_URL,
  withCredentials: false, // usamos bearer, no cookies
});

// Adjunta token en cada request
http.interceptors.request.use((cfg) => {
  cfg.headers = { ...(cfg.headers || {}), ...getAuthHeaders(cfg.headers) };
  return cfg;
});

// Manejo global de respuestas/errores
http.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;
    const message =
      data?.error || data?.message || error?.message || `HTTP ${status || ""}`;

    if (status === 401) {
      clearToken();
      if (!location.pathname.startsWith("/login")) location.replace("/login");
    } else if (status === 403) {
      if (!location.pathname.startsWith("/unauthorized")) {
        location.replace("/unauthorized");
      }
    }

    return Promise.reject(new Error(message));
  }
);

/* ========= API helpers ========= */
export async function apiGet(path, config = {}) {
  const { data } = await http.get(path, config);
  return data;
}
export async function apiPost(path, body = {}, config = {}) {
  const { data } = await http.post(path, body, config);
  return data;
}
export async function apiPut(path, body = {}, config = {}) {
  const { data } = await http.put(path, body, config);
  return data;
}
export async function apiDelete(path, config = {}) {
  const { data } = await http.delete(path, config);
  return data;
}

export async function apiUpload(path, formData, config = {}) {
  const { data } = await http.post(path, formData, { ...config });
  return data;
}

export async function apiDownload(path, config = {}) {
  const res = await http.get(path, { responseType: "blob", ...config });
  return res.data; // Blob
}

export default http;
