import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../shared/auth/AuthContext.jsx";
import { Banner } from "../components/FormBits.jsx";
import { SiteFooter, SiteHeader } from "../components/SiteFrame.jsx";

export function OAuthCallbackPage() {
  const { acceptOAuthTokens } = useAuth();
  const [params] = useSearchParams();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const accessToken = params.get("accessToken");
      const refreshToken = params.get("refreshToken");
      if (!accessToken || !refreshToken) {
        setError("Missing tokens from OAuth callback.");
        return;
      }
      try {
        await acceptOAuthTokens({ accessToken, refreshToken });
        setDone(true);
      } catch (e) {
        setError(e.message || "OAuth sign-in failed.");
      }
    })();
  }, [acceptOAuthTokens, params]);

  if (done) return <Navigate to="/app" replace />;

  return (
    <div className="page-shell">
      <SiteHeader />
      <div className="container auth-shell">
        <div className="card auth-card">
          <div className="h1">Finishing sign-in...</div>
          <div className="muted p">Please wait while we complete Google authentication.</div>
          {error ? (
            <div style={{ marginTop: 14 }}>
              <Banner kind="error" title="Could not finish sign-in">{error}</Banner>
            </div>
          ) : null}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
