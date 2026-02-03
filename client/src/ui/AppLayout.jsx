import { NavLink, Outlet, useLocation, Navigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../shared/auth/AuthContext.jsx";
import { SiteFooter } from "./components/SiteFrame.jsx";

function Pill({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `pill ${isActive ? "active" : ""}`}
    >
      <span className="pill-icon" aria-hidden="true">{icon}</span>
      <span className="pill-label">{label}</span>
    </NavLink>
  );
}

function IconHamburger() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

export function AppLayout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (loading) {
    return (
      <div className="container app-container">
        <div className="card" style={{ padding: 18 }}>
          <div className="h2">Loading...</div>
          <div className="muted p">Getting your account details.</div>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (user.approvalStatus && user.approvalStatus !== "approved") {
    return <Navigate to="/lobby" replace />;
  }

  const isAdmin = user.role === "admin";
  return (
    <div className={`page-shell app-shell ${sidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
      <div className="container app-container">
        <div className={`app-layout ${sidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
          <aside className={`app-sidebar ${sidebarOpen ? "open" : "collapsed"}`}>
            <div className="sidebar-top">
              <div className="sidebar-header">
                <div className="brand">
                  <div className="brand-logo">DG</div>
                  <div className="brand-title">Dvara Group</div>
                </div>
              </div>

              <div className="sidebar-section">
                <div className="nav-title">Main</div>
                <nav className="sidebar-nav">
                  <Pill
                    to="/app/day"
                    label="Day"
                    icon={(
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="4" />
                        <path d="M8 2v4M16 2v4M3 10h18" />
                      </svg>
                    )}
                  />
                  <Pill
                    to="/app/week"
                    label="Week"
                    icon={(
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="4" />
                        <path d="M3 10h18" />
                        <path d="M8 14h3M13 14h3" />
                      </svg>
                    )}
                  />
                  <Pill
                    to="/app/history"
                    label="History"
                    icon={(
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 3-6" />
                        <path d="M3 4v4h4" />
                        <path d="M12 7v6l4 2" />
                      </svg>
                    )}
                  />
                </nav>
              </div>

              {isAdmin ? (
                <div className="sidebar-section">
                  <div className="nav-title">Admin</div>
                  <nav className="sidebar-nav">
                  <Pill
                    to="/app/admin/dashboard"
                    label="Dashboard"
                    icon={(
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="8" height="8" rx="2" />
                          <rect x="13" y="3" width="8" height="8" rx="2" />
                          <rect x="3" y="13" width="8" height="8" rx="2" />
                          <rect x="13" y="13" width="8" height="8" rx="2" />
                        </svg>
                    )}
                  />
                  <Pill
                    to="/app/admin/approvals"
                    label="Approvals"
                    icon={(
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 12l2 2 4-4" />
                        <rect x="3" y="3" width="18" height="18" rx="4" />
                      </svg>
                    )}
                  />
                  <Pill
                    to="/app/admin/users"
                    label="Employees"
                      icon={(
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="8" cy="8" r="3" />
                          <circle cx="17" cy="8" r="3" />
                          <path d="M3 20c0-3 3-5 5-5" />
                          <path d="M14 15c3 0 6 2 6 5" />
                        </svg>
                      )}
                    />
                    <Pill
                      to="/app/admin/catalog"
                      label="Catalog"
                      icon={(
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 6h16" />
                          <path d="M4 12h16" />
                          <path d="M4 18h10" />
                        </svg>
                      )}
                    />
                    <Pill
                      to="/app/admin/calendar"
                      label="Snack Days"
                      icon={(
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="4" />
                          <path d="M8 2v4M16 2v4M3 10h18" />
                          <path d="M8 14h8" />
                        </svg>
                      )}
                    />
                    <Pill
                      to="/app/admin/wfh"
                      label="WFH"
                      icon={(
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 12h16" />
                          <path d="M6 12V6h12v6" />
                          <path d="M9 18h6" />
                        </svg>
                      )}
                    />
                    <Pill
                      to="/app/admin/costs"
                      label="Costs"
                      icon={(
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 6v12" />
                          <path d="M8.5 9.5h5a2 2 0 0 1 0 4h-3a2 2 0 0 0 0 4h5" />
                        </svg>
                      )}
                    />
                  </nav>
                </div>
              ) : null}
            </div>

            <div className="sidebar-bottom">
              <div className="sidebar-footer">
                <div className="user-inline">
                  <span>{user.name || "User"}</span>
                  <span className="badge">{user.role}</span>
                </div>
                <button className="btn danger sidebar-logout" onClick={logout}>
                  <span className="pill-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                      <path d="M10 17l5-5-5-5" />
                      <path d="M15 12H3" />
                    </svg>
                  </span>
                  <span className="pill-label">Sign out</span>
                </button>
              </div>
              <button
                className="sidebar-collapse"
                type="button"
                onClick={() => setSidebarOpen((v) => !v)}
              >
                <span className="pill-icon" aria-hidden="true"><IconHamburger /></span>
                <span className="pill-label">Collapse Sidebar</span>
              </button>
            </div>
          </aside>

          <div className="app-main">
            <div className="app-header">
              <div>
                <div className="h1">Snacks and Drinks Planner</div>
                <div className="muted">Pick daily selections and manage the week without the noise.</div>
              </div>
            </div>

            <div className="app-content">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
