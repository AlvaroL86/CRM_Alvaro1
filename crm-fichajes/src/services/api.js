// crm-fichajes/src/services/api.js
import axios from "axios";

/* ========= Selección robusta de BASE_URL ========= */
const PROD_API_URL = "https://fichaje-api-yujp.onrender.com";

// 1) Lo que venga de Vite (.env)
const ENV_BASE_URL =
  (import.meta?.env?.VITE_API_URL || import.meta?.env?.VITE_API_BASE_URL || "").trim();

// 2) Si estamos en dev, por defecto localhost
const DEFAULT_API_URL = import.meta?.env?.DEV ? "http://localhost:3000" : PROD_API_URL;

// 3) Forzar localhost si la app corre en localhost
const runningLocal =
  location.hostname === "localhost" || location.hostname === "127.0.0.1";

let BASE = ENV_BASE_URL || DEFAULT_API_URL;
if (runningLocal && !BASE.startsWith("http://localhost")) {
  BASE = "http://localhost:3000";
}

export const BASE_URL = BASE;

/* ========= Token helpers ========= */
const TOKEN_KEYS = ["crm_token", "user_token", "token"];

export function readToken() {
  for (const key of TOKEN_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const maybeObj = JSON.parse(raw);
      if (typeof maybeObj === "string") return maybeObj;
      if (maybeObj && typeof maybeObj.token === "string") return maybeObj.token;
    } catch {
      return raw; // texto plano
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

/* ========= Axios ========= */
export const http = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
});

http.interceptors.request.use((cfg) => {
  const t = readToken();
  cfg.headers = { ...(cfg.headers || {}) };
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

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

/* ========= helpers ========= */
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
  return res.data;
}
export default http;
