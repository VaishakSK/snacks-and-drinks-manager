import { Navigate } from "react-router-dom";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import { Banner } from "../../components/FormBits.jsx";

export function AdminOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") {
    return (
      <Banner kind="error" title="Forbidden">
        This section is only available for admins.
      </Banner>
    );
  }
  return children;
}

