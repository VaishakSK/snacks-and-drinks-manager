import { Link } from "react-router-dom";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="site-brand">
          <span className="site-brand-mark" aria-hidden="true">DG</span>
          <span className="site-brand-text">Dvara Group</span>
        </Link>
        <div className="site-brand-sub">Snacks and Drinks Planner</div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-title">Dvara Group</div>
        <div className="site-footer-meta">
          <span>Snacks and Drinks Planner</span>
          <span>Support: support@dvara.com</span>
        </div>
        <div className="site-footer-copy">© 2026 Dvara Group. All rights reserved.</div>
      </div>
    </footer>
  );
}
