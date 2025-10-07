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

/* ===== Helpers fetch con timeout ===== */
const TIMEOUT_MS = 12000;
function authHeaders() {
  const t = readToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}
function withTimeout(signal, ms = TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  // Combinamos señales si nos pasaran una
  const finalSignal = controller.signal;
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return { finalSignal, clear: () => clearTimeout(timeout) };
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
export async function apiGet(path, { signal } = {}) {
  const { finalSignal, clear } = withTimeout(signal);
  try {
    const res = await fetch(`${BASE_URL}${path}`, { headers: authHeaders(), signal: finalSignal });
    return await handle(res);
  } finally { clear(); }
}
export async function apiPost(path, body, { signal } = {}) {
  const { finalSignal, clear } = withTimeout(signal);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body ?? {}),
      signal: finalSignal,
    });
    return await handle(res);
  } finally { clear(); }
}
export async function apiPatch(path, body, { signal } = {}) {
  const { finalSignal, clear } = withTimeout(signal);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body ?? {}),
      signal: finalSignal,
    });
    return await handle(res);
  } finally { clear(); }
}
export async function apiPut(path, body, { signal } = {}) {
  const { finalSignal, clear } = withTimeout(signal);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body ?? {}),
      signal: finalSignal,
    });
    return await handle(res);
  } finally { clear(); }
}
export async function apiDelete(path, { signal } = {}) {
  const { finalSignal, clear } = withTimeout(signal);
  try {
    const res = await fetch(`${BASE_URL}${path}`, { method: "DELETE", headers: authHeaders(), signal: finalSignal });
    return await handle(res);
  } finally { clear(); }
}
export async function apiPostForm(path, formData, { signal } = {}) {
  const { finalSignal, clear } = withTimeout(signal);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { ...authHeaders() },
      body: formData,
      signal: finalSignal,
    });
    return await handle(res);
  } finally { clear(); }
}

export { BASE_URL };
