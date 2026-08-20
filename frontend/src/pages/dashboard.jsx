import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getCurrentUser, logoutUser } from "../services/authService";
import { getMyGrievances } from "../services/grievanceService";

import AuthorityHeader from "../components/AuthorityHeader";
import AuthoritySidebar from "../components/AuthoritySidebar";
import LiveDateTime from "../components/LiveDateTime";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";


function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // LOAD DASHBOARD
  // =====================================================
  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [currentUser, myGrievances] = await Promise.all([
        getCurrentUser(),
        getMyGrievances(),
      ]);

      setUser(currentUser);
      setGrievances(Array.isArray(myGrievances) ? myGrievances : []);
    } catch (err) {
      console.error("Dashboard loading error:", err);
      if (
        err.message?.toLowerCase().includes("401") ||
        err.message?.toLowerCase().includes("unauthorized")
      ) {
        logoutUser();
        navigate("/login");
        return;
      }
      setError(err.message || "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // STATISTICS
  // =====================================================
  const statistics = useMemo(() => {
    const total = grievances.length;
    const pending = grievances.filter(
      (g) => g.status === "PENDING_REVIEW" || g.status === "SUBMITTED" || g.status === "AI_PROCESSING"
    ).length;
    const inProgress = grievances.filter(
      (g) => g.status === "ASSIGNED" || g.status === "IN_PROGRESS" || g.status === "ESCALATED"
    ).length;
    const resolved = grievances.filter(
      (g) => g.status === "RESOLVED" || g.status === "CLOSED"
    ).length;

    return { total, pending, inProgress, resolved };
  }, [grievances]);

  const recentGrievances = useMemo(() => {
    return [...grievances].slice(0, 5);
  }, [grievances]);

  const formatDate = (date) => {
    if (!date) return "-";
    try {
      return new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(date);
    }
  };

  function getCategoryName(g) {
    if (!g) return "General";
    if (g.final_category && typeof g.final_category === "object") return g.final_category.name || "General";
    if (g.category && typeof g.category === "object") return g.category.name || "General";
    if (typeof g.category === "string") return g.category;
    return "General";
  }

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: "⌂", active: true },
    { label: "Submit Grievance", path: "/dashboard/submit", icon: "✎" },
    { label: "My Grievances", path: "/dashboard/grievances", icon: "≡", count: statistics.total },
  ];

  return (
    <div className="authority-page">
      {/* GLOBAL HEADER */}
      <AuthorityHeader
        userName={user?.full_name || user?.name || "Student / Applicant"}
        userRole={user?.role || "APPLICANT"}
        portalHome="/dashboard"
        onLogout={handleLogout}
      />

      <div className="authority-body">
        {/* GLOBAL SIDEBAR */}
        <AuthoritySidebar
          portalLabel="STUDENT / APPLICANT PORTAL"
          navItems={navItems}
          userName={user?.full_name || user?.name || "Applicant"}
          userRole={user?.role || "APPLICANT"}
          onLogout={handleLogout}
        />

        {/* MAIN CONTENT */}
        <main className="authority-main">
          {/* PAGE HEADER */}
          <section className="authority-page-header">
            <div>
              <div className="authority-page-eyebrow">CSJMU STUDENT & APPLICANT REDRESSAL</div>
              <h1>Welcome, {user?.full_name || "Applicant"}</h1>
              <p>Submit academic or administrative grievances, track real-time redressal progress, and view resolution history.</p>
            </div>

            <div className="authority-header-actions">
              <LiveDateTime format="full" />
              <Link to="/dashboard/submit" className="authority-primary-button">
                + Submit New Grievance
              </Link>
            </div>
          </section>

          {/* ERROR STATE */}
          {error && (
            <ErrorState
              title="Unable to load dashboard"
              message={error}
              onRetry={loadDashboard}
            />
          )}

          {/* KPI CARDS GRID */}
          <section className="authority-stat-grid">
            <StatCard
              icon="▤"
              title="Total Submitted"
              value={statistics.total}
              subtitle="All grievances filed"
              variant="default"
            />
            <StatCard
              icon="⏳"
              title="Pending Review"
              value={statistics.pending}
              subtitle="Under review / Intake"
              variant="orange"
            />
            <StatCard
              icon="◉"
              title="In Progress"
              value={statistics.inProgress}
              subtitle="With authority officer"
              variant="blue"
            />
            <StatCard
              icon="✓"
              title="Resolved & Closed"
              value={statistics.resolved}
              subtitle="Successfully redressed"
              variant="green"
            />
          </section>

          {/* RECENT GRIEVANCES TABLE */}
          <section className="authority-content-card data-table-card">
            <div className="authority-card-header" style={{ padding: "20px 24px 16px" }}>
              <div>
                <h2>Recent Grievances</h2>
                <p>Track current status and resolution history of your filed grievances.</p>
              </div>

              <Link to="/dashboard/grievances" className="table-action-link" style={{ fontSize: "12px", fontWeight: 700 }}>
                View All Grievances →
              </Link>
            </div>

            {loading ? (
              <LoadingState message="Loading your grievances..." />
            ) : recentGrievances.length === 0 ? (
              <EmptyState
                icon="📝"
                title="No grievances submitted yet"
                description="Have an academic, administrative, or fee issue? Submit a grievance to receive assisted redressal."
                actionText="+ Submit Your First Grievance"
                actionLink="/dashboard/submit"
              />
            ) : (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tracking ID</th>
                      <th>Grievance Title</th>
                      <th>Category</th>
                      <th>Priority</th>
                      <th>Submitted Date</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentGrievances.map((g) => (
                      <tr key={g.id || g.grievance_id}>
                        <td>
                          <span className="table-id-chip">{g.grievance_id}</span>
                        </td>
                        <td>
                          <strong className="table-row-title">{g.title}</strong>
                          <p className="table-row-desc">{g.description}</p>
                        </td>
                        <td>
                          <span className="table-cat-badge">{getCategoryName(g)}</span>
                        </td>
                        <td>
                          <PriorityBadge priority={g.priority} />
                        </td>
                        <td>
                          <span className="table-date-text">{formatDate(g.submitted_at)}</span>
                        </td>
                        <td>
                          <StatusBadge status={g.status} />
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <Link
                            to={`/dashboard/grievances/${g.grievance_id}`}
                            className="table-action-link"
                          >
                            Track Progress →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;