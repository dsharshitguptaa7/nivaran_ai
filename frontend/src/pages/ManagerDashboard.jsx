import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getCurrentUser, logoutUser } from "../services/authService";
import { getAllGrievances } from "../services/grievanceService";

import AuthorityHeader from "../components/AuthorityHeader";
import AuthoritySidebar from "../components/AuthoritySidebar";
import LiveDateTime from "../components/LiveDateTime";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";


function ManagerDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // =====================================================
  // LOAD DASHBOARD
  // =====================================================
  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const [currentUser, allGrievances] = await Promise.all([
        getCurrentUser(),
        getAllGrievances(),
      ]);

      setUser(currentUser);
      setGrievances(Array.isArray(allGrievances) ? allGrievances : []);
    } catch (err) {
      console.error("Failed to load manager dashboard:", err);
      if (
        err.message?.toLowerCase().includes("401") ||
        err.message?.toLowerCase().includes("unauthorized")
      ) {
        logoutUser();
        navigate("/login?type=authority");
        return;
      }
      setError(err?.message || "Unable to load grievances.");
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // STATISTICS
  // =====================================================
  const total = grievances.length;

  const pendingReview = useMemo(() => {
    return grievances.filter((g) => g.status === "PENDING_REVIEW").length;
  }, [grievances]);

  const aiProcessing = useMemo(() => {
    return grievances.filter((g) => g.status === "AI_PROCESSING").length;
  }, [grievances]);

  const inProgress = useMemo(() => {
    return grievances.filter((g) => g.status === "IN_PROGRESS" || g.status === "ASSIGNED").length;
  }, [grievances]);

  const resolvedReview = useMemo(() => {
    return grievances.filter((g) => g.status === "RESOLVED").length;
  }, [grievances]);

  const closed = useMemo(() => {
    return grievances.filter((g) => g.status === "CLOSED").length;
  }, [grievances]);

  const escalated = useMemo(() => {
    return grievances.filter((g) => g.status === "ESCALATED").length;
  }, [grievances]);

  // =====================================================
  // FILTERED GRIEVANCES
  // =====================================================
  const filteredGrievances = useMemo(() => {
    return grievances.filter((g) => {
      // Status filter
      if (filterStatus === "PENDING_REVIEW" && g.status !== "PENDING_REVIEW") return false;
      if (filterStatus === "AI_PROCESSING" && g.status !== "AI_PROCESSING") return false;
      if (filterStatus === "ASSIGNED" && g.status !== "ASSIGNED" && g.status !== "IN_PROGRESS") return false;
      if (filterStatus === "RESOLVED" && g.status !== "RESOLVED") return false;
      if (filterStatus === "CLOSED" && g.status !== "CLOSED") return false;
      if (filterStatus === "ESCALATED" && g.status !== "ESCALATED") return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const idMatch = g.grievance_id?.toLowerCase().includes(q);
        const titleMatch = g.title?.toLowerCase().includes(q);
        const descMatch = g.description?.toLowerCase().includes(q);
        if (!idMatch && !titleMatch && !descMatch) return false;
      }

      return true;
    });
  }, [grievances, filterStatus, searchQuery]);

  function formatDate(date) {
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
  }

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
    { label: "Dashboard", path: "/manager", icon: "▦", active: true },
    { label: "Pending AI Review", path: "#", icon: "⏳", count: pendingReview, onClick: () => setFilterStatus("PENDING_REVIEW") },
    { label: "Closure Review", path: "#", icon: "✓", count: resolvedReview, onClick: () => setFilterStatus("RESOLVED") },
    { label: "Escalated Cases", path: "#", icon: "▲", count: escalated, onClick: () => setFilterStatus("ESCALATED") },
  ];

  return (
    <div className="authority-page">
      {/* GLOBAL HEADER */}
      <AuthorityHeader
        userName={user?.full_name || user?.name || "Manager"}
        userRole={user?.role || "MANAGER"}
        portalHome="/manager"
        onLogout={handleLogout}
      />

      <div className="authority-body">
        {/* GLOBAL SIDEBAR */}
        <AuthoritySidebar
          portalLabel="MANAGER PORTAL"
          navItems={navItems}
          userName={user?.full_name || user?.name || "Manager"}
          userRole={user?.role || "MANAGER"}
          onLogout={handleLogout}
        />

        {/* MAIN CONTENT AREA */}
        <main className="authority-main">
          {/* PAGE HEADER */}
          <section className="authority-page-header">
            <div>
              <div className="authority-page-eyebrow">CSJMU CENTRAL REDRESSAL OPERATIONS</div>
              <h1>Manager Portal</h1>
              <p>Monitor intake, validate AI classifications, review authority resolutions, and manage final closures.</p>
            </div>

            <div className="authority-header-actions">
              <LiveDateTime format="full" />
              <button
                type="button"
                className="authority-primary-button"
                onClick={loadDashboard}
                disabled={loading}
              >
                {loading ? "Refreshing..." : "↻ Refresh"}
              </button>
            </div>
          </section>

          {/* ERROR STATE */}
          {error && (
            <ErrorState
              title="Unable to load dashboard data"
              message={error}
              onRetry={loadDashboard}
            />
          )}

          {/* KPI CARDS GRID */}
          <section className="authority-stat-grid">
            <StatCard
              icon="▤"
              title="Total Received"
              value={total}
              subtitle="Institution-wide intake"
              variant="default"
              active={filterStatus === "ALL"}
              onClick={() => setFilterStatus("ALL")}
            />

            <StatCard
              icon="⏳"
              title="Pending Review"
              value={pendingReview}
              subtitle="Requires AI review"
              variant="orange"
              active={filterStatus === "PENDING_REVIEW"}
              onClick={() => setFilterStatus("PENDING_REVIEW")}
            />

            <StatCard
              icon="⚡"
              title="AI Processing"
              value={aiProcessing}
              subtitle="Pipeline classifying"
              variant="purple"
              active={filterStatus === "AI_PROCESSING"}
              onClick={() => setFilterStatus("AI_PROCESSING")}
            />

            <StatCard
              icon="◉"
              title="In Progress"
              value={inProgress}
              subtitle="Under authority redressal"
              variant="blue"
              active={filterStatus === "ASSIGNED"}
              onClick={() => setFilterStatus("ASSIGNED")}
            />

            <StatCard
              icon="★"
              title="Closure Review"
              value={resolvedReview}
              subtitle="Resolved by authority"
              variant="green"
              active={filterStatus === "RESOLVED"}
              onClick={() => setFilterStatus("RESOLVED")}
            />

            <StatCard
              icon="🔒"
              title="Formally Closed"
              value={closed}
              subtitle="Verified & concluded"
              variant="maroon"
              active={filterStatus === "CLOSED"}
              onClick={() => setFilterStatus("CLOSED")}
            />
          </section>

          {/* GRIEVANCE LIST CARD */}
          <section className="authority-content-card data-table-card">
            {/* CARD TOOLBAR */}
            <div className="table-card-toolbar">
              <div className="table-search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search by Grievance ID, title, or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setSearchQuery("")}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* FILTER PILLS */}
              <div className="table-filter-pills">
                <button
                  type="button"
                  className={`filter-pill ${filterStatus === "ALL" ? "active" : ""}`}
                  onClick={() => setFilterStatus("ALL")}
                >
                  All ({total})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${filterStatus === "PENDING_REVIEW" ? "active" : ""}`}
                  onClick={() => setFilterStatus("PENDING_REVIEW")}
                >
                  Pending AI ({pendingReview})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${filterStatus === "RESOLVED" ? "active" : ""}`}
                  onClick={() => setFilterStatus("RESOLVED")}
                >
                  Closure Review ({resolvedReview})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${filterStatus === "ESCALATED" ? "active" : ""}`}
                  onClick={() => setFilterStatus("ESCALATED")}
                >
                  Escalated ({escalated})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${filterStatus === "CLOSED" ? "active" : ""}`}
                  onClick={() => setFilterStatus("CLOSED")}
                >
                  Closed ({closed})
                </button>
              </div>
            </div>

            {/* TABLE CONTENT */}
            {loading ? (
              <LoadingState message="Loading grievance records..." />
            ) : filteredGrievances.length === 0 ? (
              <EmptyState
                icon="📭"
                title="No grievances found"
                description={
                  searchQuery || filterStatus !== "ALL"
                    ? "No grievances match the active search criteria or filters."
                    : "No grievances currently recorded in the system."
                }
                actionText={searchQuery || filterStatus !== "ALL" ? "Clear Filters" : ""}
                onAction={() => {
                  setFilterStatus("ALL");
                  setSearchQuery("");
                }}
              />
            ) : (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Grievance ID</th>
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
                            to={`/manager/grievances/${g.grievance_id}`}
                            className="table-action-link"
                          >
                            Review →
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

export default ManagerDashboard;