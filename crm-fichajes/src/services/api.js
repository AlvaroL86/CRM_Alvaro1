// src/services/api.js
const BASE_URL =
  (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.replace(/\/+$/, "")) ||
  "http://localhost:3000";

/* ===== Token & usuario en localStorage ===== */
export function readToken() {
  try { return localStorage.getItem("crm_token") || null; } catch { return null; }
}
export function saveToken(t) {
  try { t ? localStorage.setItem("crm_token", t) : localStorage.removeItem("crm_token"); } catch {}
}
export function clearToken() { saveToken(null); }

export function readUser() {
  try { return JSON.parse(localStorage.getItem("crm_user") || "null"); } catch { return null; }
}
export function saveUser(u) {
  try { u ? localStorage.setItem("crm_user", JSON.stringify(u)) : localStorage.removeItem("crm_user"); } catch {}
}

/* ===== Helpers fetch ===== */
function authHeaders() {
  const t = readToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function handle(res) {
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return data;
}

/* ===== API ===== */
export async function apiGet(path) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: authHeaders() });
  return handle(res);
}
export async function apiPost(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body ?? {})
  });
  return handle(res);
}
export async function apiPatch(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body ?? {})
  });
  return handle(res);
}
export async function apiPut(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body ?? {})
  });
  return handle(res);
}
export async function apiDelete(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    headers: authHeaders()
  });
  return handle(res);
}

export { BASE_URL };
