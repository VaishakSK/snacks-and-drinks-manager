import { useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../shared/auth/AuthContext.jsx";
import { API_BASE } from "../../shared/http/api.js";
import { Banner, Field } from "../components/FormBits.jsx";
import { SiteFooter, SiteHeader } from "../components/SiteFrame.jsx";

export function LoginPage() {
  const { user, loginEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [params] = useSearchParams();

  const externalError = params.get("error");
  const externalMessage =
    externalError === "account_rejected"
      ? "Account request rejected. Please contact your admin."
      : externalError === "oauth_failed"
        ? "Google sign-in failed. Please try again."
        : "";

  if (user) {
    const dest = user.approvalStatus && user.approvalStatus !== "approved" ? "/lobby" : "/app";
    return <Navigate to={dest} replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await loginEmail({ email, password });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-shell">
      <SiteHeader />
      <div className="container auth-shell">
        <div className="card auth-card">
        <div className="auth-header">
          <div className="auth-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16v16H4z" />
              <path d="M8 12h8" />
              <path d="M8 8h8" />
            </svg>
          </div>
          <div>
            <div className="h1">Sign in</div>
            <div className="muted">Employee and Admin access</div>
          </div>
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
          {externalMessage ? <Banner kind="error" title="Could not sign in">{externalMessage}</Banner> : null}
          {error ? <Banner kind="error" title="Could not sign in">{error}</Banner> : null}

          <form onSubmit={onSubmit} className="row">
            <div className="col-12">
              <Field label="Email">
                <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
              </Field>
            </div>
            <div className="col-12">
              <Field label="Password">
                <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="********" />
              </Field>
            </div>
            <div className="col-12 auth-actions">
              <button className="btn" disabled={busy} type="submit">
                {busy ? "Signing in..." : "Sign in"}
              </button>
              <a className="btn secondary" href={`${API_BASE}/api/auth/google`}>
                Continue with Google
              </a>
              <Link className="btn danger" to="/register">
                Create account
              </Link>
            </div>
          </form>
          <div className="muted auth-footnote">
            Tip: Admins can create employee accounts from the Admin panel too.
          </div>
        </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
