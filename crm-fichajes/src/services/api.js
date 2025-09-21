// /src/services/api.js
// ====================================================
// Utilidades de API + almacenamiento de token/usuario
// ====================================================

// IMPORTANTE: ahora exportamos BASE_URL
export const BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/$/, "");

const TOKEN_KEY = "crm_token";
const USER_KEY = "crm_user";

// ---------------------
// Storage helpers
// ---------------------
export const saveToken = (token, user) => {
  try {
    if (typeof token === "string") localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
};

export const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
};

export const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
};

export const saveUser = (user) => {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
};

export const readUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// ---------------------
// Wrapper de fetch
// ---------------------
async function request(method, path, body) {
  const headers = {};
  const token = readToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (body instanceof FormData) {
    payload = body; // NO poner Content-Type; el navegador se encarga
  } else if (body !== undefined && body !== null) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: payload,
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const msg =
      (data && (data.error || data.message)) ||
      `HTTP ${res.status} ${res.statusText}`;
    throw new Error(msg);
  }

  return data;
}

// ---------------------
// Helpers HTTP
// ---------------------
export const apiGet = (path) => request("GET", path);
export const apiPost = (path, body) => request("POST", path, body);
export const apiPut = (path, body) => request("PUT", path, body);
export const apiPatch = (path, body) => request("PATCH", path, body);
export const apiDelete = (path, body) => request("DELETE", path, body);
export const apiDel = apiDelete; // alias opcional
