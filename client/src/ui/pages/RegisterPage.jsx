import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../shared/auth/AuthContext.jsx";
import { Banner, Field } from "../components/FormBits.jsx";
import { SiteFooter, SiteHeader } from "../components/SiteFrame.jsx";

export function RegisterPage() {
  const { user, registerEmail } = useAuth();
  const [role, setRole] = useState("employee");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [securityCode, setSecurityCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (user) {
    const dest = user.approvalStatus && user.approvalStatus !== "approved" ? "/lobby" : "/app";
    return <Navigate to={dest} replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await registerEmail({
        role,
        name: name || undefined,
        email,
        password,
        securityCode: role === "admin" ? securityCode || undefined : undefined
      });
    } catch (err) {
      setError(err.message || "Register failed");
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M20 8v6" />
              <path d="M23 11h-6" />
            </svg>
          </div>
          <div>
            <div className="h1">Create account</div>
            <div className="muted">Choose your role and get started</div>
          </div>
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          {error ? <Banner kind="error" title="Could not create account">{error}</Banner> : null}

          <form onSubmit={onSubmit} className="row">
            <div className="col-6">
              <Field label="Role" hint="Choose employee for normal usage. Admins can manage everyone.">
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="employee">employee</option>
                  <option value="admin">admin</option>
                </select>
              </Field>
            </div>
            <div className="col-6">
              <Field label="Name (optional)">
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </Field>
            </div>
            <div className="col-12">
              <Field label="Email">
                <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
              </Field>
            </div>
            <div className="col-12">
              <Field label="Password" hint="Minimum 8 characters.">
                <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="********" />
              </Field>
            </div>
            {role === "admin" ? (
              <div className="col-12">
                <Field
                  label="Admin security code"
                  hint="Only Dvara snacks/drinks managers should know this code."
                >
                  <input
                    className="input"
                    value={securityCode}
                    onChange={(e) => setSecurityCode(e.target.value)}
                    placeholder="Enter admin security code"
                  />
                </Field>
              </div>
            ) : null}
            <div className="col-12 auth-actions">
              <button className="btn danger" disabled={busy} type="submit">
                {busy ? "Creating..." : "Create account"}
              </button>
              <Link className="btn secondary" to="/login">
                Back to sign in
              </Link>
            </div>
          </form>
        </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
