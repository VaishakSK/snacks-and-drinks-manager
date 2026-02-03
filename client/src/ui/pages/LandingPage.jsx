import { Link } from "react-router-dom";
import { SiteFooter, SiteHeader } from "../components/SiteFrame.jsx";

export function LandingPage() {
  return (
    <div className="page-shell">
      <SiteHeader />
      <div className="landing-shell sakara-shell">
        <section className="sakara-hero">
          <div className="sakara-hero-media">
            <img src="/image.png" alt="Healthy meals" />
          </div>
          <div className="sakara-hero-panel">
            <div className="sakara-kicker">The best week ever</div>
            <h1 className="sakara-title">Top list is back</h1>
            <p className="sakara-subtitle">
              The simplest way for teams to plan drinks and snacks. Employees choose quickly, managers get precise
              counts with zero surprises.
            </p>
            <div className="sakara-cta-row">
              <Link className="btn dark" to="/login">Sign in</Link>
              <Link className="btn secondary" to="/register">Create account</Link>
            </div>
          </div>
        </section>

        <section className="sakara-info">
          <div className="sakara-info-copy">
            <div className="sakara-info-kicker">Dvara Group</div>
            <h2>Signature Planning Program</h2>
            <p>
              A clean workflow for office beverages and snacks. Plan the week in seconds, track daily counts, and
              keep the pantry perfectly stocked.
            </p>
          </div>
          <div className="sakara-info-card">
            <h3>For employees</h3>
            <ul>
              <li>Pick todays drinks and snacks fast.</li>
              <li>Set weekly preferences in one step.</li>
              <li>See your history anytime.</li>
            </ul>
          </div>
          <div className="sakara-info-card">
            <h3>For managers</h3>
            <ul>
              <li>Live counts by session and item.</li>
              <li>Export clean CSVs in seconds.</li>
              <li>Control snack days and overrides.</li>
            </ul>
          </div>
        </section>
      </div>
      <SiteFooter />
    </div>
  );
}
