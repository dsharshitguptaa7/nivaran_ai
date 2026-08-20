import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getCurrentUser, logoutUser } from "../services/authService";
import { getMyGrievances } from "../services/grievanceService";

import AuthorityHeader from "../components/AuthorityHeader";
import AuthoritySidebar from "../components/AuthoritySidebar";
import LiveDateTime from "../components/LiveDateTime";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";


function MyGrievances() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [grievances, setGrievances] = useState([]);
  const [filteredGrievances, setFilteredGrievances] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // LOAD USER + GRIEVANCES
  // =====================================================
  useEffect(() => {
    loadPage();
  }, []);

  const loadPage = async () => {
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
      console.error("My grievances loading error:", err);
      if (
        err.message?.toLowerCase().includes("401") ||
        err.message?.toLowerCase().includes("unauthorized")
      ) {
        logoutUser();
        navigate("/login");
        return;
      }
      setError(err.message || "Unable to load grievances.");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // FILTER
  // =====================================================
  useEffect(() => {
    let result = [...grievances];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (g) =>
          g.title?.toLowerCase().includes(q) ||
          g.description?.toLowerCase().includes(q) ||
          g.grievance_id?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "ALL") {
      result = result.filter((g) => g.status === statusFilter);
    }

    if (priorityFilter !== "ALL") {
      result = result.filter((g) => g.priority === priorityFilter);
    }

    setFilteredGrievances(result);
  }, [search, statusFilter, priorityFilter, grievances]);

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
    { label: "Dashboard", path: "/dashboard", icon: "⌂" },
    { label: "Submit Grievance", path: "/dashboard/submit", icon: "✎" },
    { label: "My Grievances", path: "/dashboard/grievances", icon: "≡", count: grievances.length, active: true },
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
              <div className="authority-page-eyebrow">STUDENT PORTAL • MY SUBMISSIONS</div>
              <h1>My Grievances</h1>
              <p>Track live redressal status, review assigned officer feedback, and view official resolutions.</p>
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
              title="Unable to load grievance records"
              message={error}
              onRetry={loadPage}
            />
          )}

          {/* TABLE CONTAINER CARD */}
          <section className="authority-content-card data-table-card">
            {/* TOOLBAR */}
            <div className="table-card-toolbar">
              <div className="table-search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search by Tracking ID, title, or keyword..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button type="button" className="search-clear-btn" onClick={() => setSearch("")}>
                    ✕
                  </button>
                )}
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    padding: "7px 12px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                    background: "#ffffff",
                    fontWeight: 600,
                  }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="AI_PROCESSING">AI Processing</option>
                  <option value="PENDING_REVIEW">Pending Review</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                  <option value="ESCALATED">Escalated</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  style={{
                    padding: "7px 12px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                    background: "#ffffff",
                    fontWeight: 600,
                  }}
                >
                  <option value="ALL">All Priorities</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            </div>

            {/* TABLE */}
            {loading ? (
              <LoadingState message="Loading your grievances..." />
            ) : filteredGrievances.length === 0 ? (
              <EmptyState
                icon="📭"
                title="No grievances found"
                description={
                  search || statusFilter !== "ALL" || priorityFilter !== "ALL"
                    ? "No grievances match your search or filter criteria."
                    : "You have not submitted any grievances yet."
                }
                actionText={search || statusFilter !== "ALL" || priorityFilter !== "ALL" ? "Clear Filters" : "+ Submit New Grievance"}
                actionLink={search || statusFilter !== "ALL" || priorityFilter !== "ALL" ? "" : "/dashboard/submit"}
                onAction={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                  setPriorityFilter("ALL");
                }}
              />
            ) : (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tracking ID</th>
                      <th>Title & Summary</th>
                      <th>Category</th>
                      <th>Priority</th>
                      <th>Submitted Date</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGrievances.map((g) => (
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
                            Track Status →
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

export default MyGrievances;