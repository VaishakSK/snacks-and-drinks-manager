export const TOAST_EVENT = "app-toast";

export function emitToast({ kind = "info", title, message, duration = 4500 } = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, {
      detail: { kind, title, message, duration }
    })
  );
}

export function titleForStatus(status) {
  if (status === 400) return "Validation error";
  if (status === 401) return "Unauthorized";
  if (status === 403) return "Forbidden";
  if (status === 404) return "Not found";
  if (status === 409) return "Conflict";
  if (status >= 500) return "Server error";
  return "Request error";
}
