import { useEffect, useMemo, useRef, useState } from "react";
import { TOAST_EVENT } from "../../shared/ui/toast.js";

const DEFAULT_TITLES = {
  error: "Error",
  success: "Success",
  info: "Notice"
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  useEffect(() => {
    function onToast(e) {
      const detail = e?.detail || {};
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const toast = {
        id,
        kind: detail.kind || "info",
        title: detail.title || DEFAULT_TITLES[detail.kind] || DEFAULT_TITLES.info,
        message: detail.message || "",
        duration: typeof detail.duration === "number" ? detail.duration : 4500
      };

      setToasts((prev) => [...prev, toast]);

      if (toast.duration > 0) {
        const t = setTimeout(() => {
          setToasts((prev) => prev.filter((item) => item.id !== id));
          timersRef.current.delete(id);
        }, toast.duration);
        timersRef.current.set(id, t);
      }
    }

    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  const dismiss = (id) => {
    const t = timersRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  };

  const viewport = useMemo(() => {
    if (toasts.length === 0) return null;
    return (
      <div className="toast-viewport" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.kind}`}>
            <div className="toast-header">
              <div className="toast-title">{toast.title}</div>
              <button className="toast-close" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification">
                ×
              </button>
            </div>
            {toast.message ? <div className="toast-message">{toast.message}</div> : null}
          </div>
        ))}
      </div>
    );
  }, [toasts]);

  return (
    <>
      {children}
      {viewport}
    </>
  );
}
