import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { apiRequest } from "../services/api";
import { getCurrentUser, logoutUser } from "../services/authService";

import AuthorityHeader from "../components/AuthorityHeader";
import AuthoritySidebar from "../components/AuthoritySidebar";
import LiveDateTime from "../components/LiveDateTime";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";


function AssistantDeanDashboard() {
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

      const [currentUser, assignedGrievances] = await Promise.all([
        getCurrentUser(),
        apiRequest("/assignments/my/grievances"),
      ]);

      setUser(currentUser);
      setGrievances(Array.isArray(assignedGrievances) ? assignedGrievances : []);
    } catch (err) {
      console.error("Assistant Dean dashboard error:", err);
      if (
        err.message?.toLowerCase().includes("401") ||
        err.message?.toLowerCase().includes("unauthorized")
      ) {
        logoutUser();
        navigate("/login?type=authority");
        return;
      }
      setError(err?.message || "Unable to load assigned grievances.");
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // STATISTICS
  // =====================================================
  const total = grievances.length;

  const pending = useMemo(() => {
    return grievances.filter((g) => g.status === "ASSIGNED" || g.status === "PENDING_REVIEW").length;
  }, [grievances]);

  const inProgress = useMemo(() => {
    return grievances.filter((g) => g.status === "IN_PROGRESS").length;
  }, [grievances]);

  const resolved = useMemo(() => {
    return grievances.filter((g) => g.status === "RESOLVED" || g.status === "CLOSED").length;
  }, [grievances]);

  const escalated = useMemo(() => {
    return grievances.filter((g) => g.status === "ESCALATED").length;
  }, [grievances]);

  // =====================================================
  // FILTERED GRIEVANCES
  // =====================================================
  const filteredGrievances = useMemo(() => {
    return grievances.filter((g) => {
      if (filterStatus === "PENDING" && g.status !== "ASSIGNED" && g.status !== "PENDING_REVIEW") return false;
      if (filterStatus === "IN_PROGRESS" && g.status !== "IN_PROGRESS") return false;
      if (filterStatus === "RESOLVED" && g.status !== "RESOLVED" && g.status !== "CLOSED") return false;
      if (filterStatus === "ESCALATED" && g.status !== "ESCALATED") return false;

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
    if (!g) return "Academic";
    if (g.final_category && typeof g.final_category === "object") return g.final_category.name || "Academic";
    if (g.category && typeof g.category === "object") return g.category.name || "Academic";
    if (typeof g.category === "string") return g.category;
    return "Academic";
  }

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  const navItems = [
    { label: "Dashboard", path: "/assistant-dean", icon: "▦", active: true },
    { label: "Assigned to Me", path: "#", icon: "≡", count: pending + inProgress, onClick: () => setFilterStatus("ALL") },
    { label: "Pending Redressal", path: "#", icon: "⏳", count: pending, onClick: () => setFilterStatus("PENDING") },
    { label: "Resolved", path: "#", icon: "✓", count: resolved, onClick: () => setFilterStatus("RESOLVED") },
  ];

  return (
    <div className="authority-page">
      {/* GLOBAL HEADER */}
      <AuthorityHeader
        userName={user?.full_name || user?.name || "Assistant Dean"}
        userRole={user?.role || "ASSISTANT_DEAN"}
        portalHome="/assistant-dean"
        onLogout={handleLogout}
      />

      <div className="authority-body">
        {/* GLOBAL SIDEBAR */}
        <AuthoritySidebar
          portalLabel="ASSISTANT DEAN PORTAL"
          navItems={navItems}
          userName={user?.full_name || user?.name || "Assistant Dean"}
          userRole={user?.role || "ASSISTANT_DEAN"}
          onLogout={handleLogout}
        />

        {/* MAIN CONTENT AREA */}
        <main className="authority-main">
          {/* PAGE HEADER */}
          <section className="authority-page-header">
            <div>
              <div className="authority-page-eyebrow">SUBJECT & DEPARTMENT REDRESSAL</div>
              <h1>Assistant Dean Dashboard</h1>
              <p>Review assigned subject grievances, record resolution decisions, and attach verification proofs.</p>
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
              title="Unable to load assigned grievances"
              message={error}
              onRetry={loadDashboard}
            />
          )}

          {/* KPI CARDS GRID */}
          <section className="authority-stat-grid">
            <StatCard
              icon="▤"
              title="Total Assigned"
              value={total}
              subtitle="Subject jurisdiction"
              variant="default"
              active={filterStatus === "ALL"}
              onClick={() => setFilterStatus("ALL")}
            />

            <StatCard
              icon="⏳"
              title="Pending Redressal"
              value={pending}
              subtitle="Action required"
              variant="orange"
              active={filterStatus === "PENDING"}
              onClick={() => setFilterStatus("PENDING")}
            />

            <StatCard
              icon="◉"
              title="In Progress"
              value={inProgress}
              subtitle="Under review"
              variant="blue"
              active={filterStatus === "IN_PROGRESS"}
              onClick={() => setFilterStatus("IN_PROGRESS")}
            />

            <StatCard
              icon="✓"
              title="Resolved"
              value={resolved}
              subtitle="Successfully redressed"
              variant="green"
              active={filterStatus === "RESOLVED"}
              onClick={() => setFilterStatus("RESOLVED")}
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
                  placeholder="Search assigned grievances..."
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
                  className={`filter-pill ${filterStatus === "PENDING" ? "active" : ""}`}
                  onClick={() => setFilterStatus("PENDING")}
                >
                  Pending ({pending})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${filterStatus === "IN_PROGRESS" ? "active" : ""}`}
                  onClick={() => setFilterStatus("IN_PROGRESS")}
                >
                  In Progress ({inProgress})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${filterStatus === "RESOLVED" ? "active" : ""}`}
                  onClick={() => setFilterStatus("RESOLVED")}
                >
                  Resolved ({resolved})
                </button>
              </div>
            </div>

            {/* TABLE CONTENT */}
            {loading ? (
              <LoadingState message="Loading assigned grievance records..." />
            ) : filteredGrievances.length === 0 ? (
              <EmptyState
                icon="📭"
                title="No assigned grievances found"
                description={
                  searchQuery || filterStatus !== "ALL"
                    ? "No grievances match the active filters or search criteria."
                    : "No grievances are currently assigned to your department."
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
                      <th>Title & Description</th>
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
                            to={`/assistant-dean/grievances/${g.grievance_id}`}
                            className="table-action-link"
                          >
                            Review & Decide →
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

export default AssistantDeanDashboard;