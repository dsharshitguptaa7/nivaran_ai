import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCurrentUser } from "../services/authService";
import LoadingState from "./LoadingState";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const token = localStorage.getItem("access_token");
      if (!token) {
        if (isMounted) {
          setUser(null);
          setAuthError(true);
          setLoading(false);
        }
        return;
      }

      try {
        const userData = await getCurrentUser();
        if (isMounted) {
          setUser(userData);
          setAuthError(false);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        if (isMounted) {
          localStorage.removeItem("access_token");
          setUser(null);
          setAuthError(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-page, #fbf9f4)" }}>
        <LoadingState message="Verifying security credentials & access permissions..." />
      </div>
    );
  }

  // Not authenticated
  if (authError || !user) {
    const isAuthorityRoute = allowedRoles.some((role) =>
      ["DEAN", "MANAGER", "ASSISTANT_DEAN", "ASSOCIATE_DEAN", "REVIEWER"].includes(role)
    );

    const redirectPath = isAuthorityRoute ? "/login?type=authority" : "/login";
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  // Check role authorization
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    console.warn(`Unauthorized access attempt by ${user.role} to ${location.pathname}. Redirecting to designated portal.`);

    // Redirect to the user's designated dashboard based on their role
    switch (user.role) {
      case "DEAN":
        return <Navigate to="/dean" replace />;
      case "MANAGER":
        return <Navigate to="/manager" replace />;
      case "ASSISTANT_DEAN":
        return <Navigate to="/assistant-dean" replace />;
      case "ASSOCIATE_DEAN":
        return <Navigate to="/associate-dean" replace />;
      case "REVIEWER":
        return <Navigate to="/reviewer" replace />;
      case "APPLICANT":
      default:
        return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}
