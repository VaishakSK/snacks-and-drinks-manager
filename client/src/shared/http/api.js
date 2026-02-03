const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4052";

function getTokens() {
  return {
    accessToken: localStorage.getItem("accessToken"),
    refreshToken: localStorage.getItem("refreshToken")
  };
}

function setTokens(tokens) {
  if (tokens?.accessToken) localStorage.setItem("accessToken", tokens.accessToken);
  if (tokens?.refreshToken) localStorage.setItem("refreshToken", tokens.refreshToken);
}

export function clearTokens() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

async function rawFetch(path, { method = "GET", body, headers = {}, auth = true } = {}) {
  const { accessToken } = getTokens();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include"
  });
  return res;
}

async function refresh() {
  const { refreshToken } = getTokens();
  if (!refreshToken) return false;
  const res = await rawFetch("/api/auth/refresh", { method: "POST", body: { refreshToken }, auth: false });
  if (!res.ok) return false;
  const json = await res.json();
  setTokens(json);
  return true;
}

export async function api(path, options) {
  let res = await rawFetch(path, options);
  if (res.status === 401) {
    const ok = await refresh();
    if (ok) res = await rawFetch(path, options);
  }
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const baseMessage = json?.error || `Request failed (${res.status})`;
    const cleaned =
      typeof baseMessage === "string" && (baseMessage.trim().startsWith("[") || baseMessage.trim().startsWith("{"))
        ? "Invalid input"
        : String(baseMessage).trim();
    const err = new Error(cleaned || `Request failed (${res.status})`);
    err.status = res.status;
    err.payload = json;
    throw err;
  }
  return json;
}

export { API_BASE, setTokens, getTokens };

