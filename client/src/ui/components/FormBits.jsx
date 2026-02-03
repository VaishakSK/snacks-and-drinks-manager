import { useEffect, useRef } from "react";
import { emitToast } from "../../shared/ui/toast.js";

export function Field({ label, children, hint }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ fontWeight: 700 }}>{label}</div>
      {children}
      {hint ? <div className="muted" style={{ fontSize: 13 }}>{hint}</div> : null}
    </div>
  );
}

export function Banner({ kind = "info", title, children }) {
  const lastKeyRef = useRef("");
  const message = typeof children === "string" ? children : "";

  useEffect(() => {
    if (kind !== "error") return;
    const key = `${title || ""}::${message}`;
    if (!key || lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    const shortMessage = message && message.length <= 60 ? message : title || "Error";
    emitToast({ kind: "error", title: shortMessage, message: "" });
  }, [kind, title, message]);

  if (kind === "error") return null;

  return (
    <div className={`banner banner-${kind}`}>
      {title ? <div className="h2">{title}</div> : null}
      {children ? <div className="p muted">{children}</div> : null}
    </div>
  );
}

