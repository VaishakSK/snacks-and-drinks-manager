import { Navigate } from "react-router-dom";
import { useAuth } from "../../shared/auth/AuthContext.jsx";
import { SiteFooter, SiteHeader } from "../components/SiteFrame.jsx";

export function ApprovalLobbyPage() {
  const { user, logout } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (!user.approvalStatus || user.approvalStatus === "approved") {
    return <Navigate to="/app" replace />;
  }

  const isRejected = user.approvalStatus === "rejected";

  return (
    <div className="page-shell lobby-shell">
      <SiteHeader />
      <div className="container lobby-container">
        <div className="card lobby-card">
          <div className="lobby-hero">
            <div className="lobby-copy">
              <div className="lobby-kicker">Account approval</div>
              <h1 className="lobby-title">
                {isRejected ? "Request not approved" : "You're in the lobby"}
              </h1>
              <p className="lobby-sub">
                {isRejected
                  ? "This account request was rejected. If you believe this is a mistake, contact your admin team."
                  : "Thanks for signing up. Your request is waiting for admin approval. Once approved, you’ll get full access to selections and services."}
              </p>
              <div className="lobby-meta">
                <span><strong>Email:</strong> {user.email}</span>
                <span><strong>Role:</strong> {user.role}</span>
                <span><strong>Status:</strong> {user.approvalStatus}</span>
              </div>
              <div className="lobby-actions">
                {!isRejected ? (
                  <button className="btn" type="button" onClick={() => window.location.reload()}>
                    Check status
                  </button>
                ) : null}
                <button className="btn secondary" type="button" onClick={logout}>
                  Sign out
                </button>
              </div>
            </div>
            <div className="lobby-panel">
              <div className="lobby-panel-card">
                <div className="lobby-panel-title">What happens next</div>
                <div className="lobby-steps">
                  <div className="lobby-step active">
                    <div className="lobby-step-dot" />
                    <div>
                      <div className="lobby-step-title">Request received</div>
                      <div className="lobby-step-sub">We’ve logged your signup details.</div>
                    </div>
                  </div>
                  <div className={`lobby-step ${isRejected ? "" : "active"}`}>
                    <div className="lobby-step-dot" />
                    <div>
                      <div className="lobby-step-title">Admin review</div>
                      <div className="lobby-step-sub">An admin confirms your access.</div>
                    </div>
                  </div>
                  <div className={`lobby-step ${isRejected ? "" : "pending"}`}>
                    <div className="lobby-step-dot" />
                    <div>
                      <div className="lobby-step-title">All set</div>
                      <div className="lobby-step-sub">You can use drinks & snacks services.</div>
                    </div>
                  </div>
                </div>
                <div className="lobby-note">
                  Tip: Most approvals are quick. You can refresh this page anytime.
                </div>
              </div>
              <div className="lobby-glow" />
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
