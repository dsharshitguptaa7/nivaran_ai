import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Inbox,
  ClipboardCheck,
  FileCheck,
  AlertTriangle,
  FolderOpen,
  CheckCircle2,
  RefreshCw,
  Search,
  X,
  ChevronRight,
  Activity,
  ArrowRight,
  ShieldAlert,
  Layers,
  Sparkles,
  FileText,
  Clock,
  Check,
} from "lucide-react";

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
  // METRICS & COUNTS
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

  // Structured enterprise navigation
  const navItems = [
    { isHeader: true, label: "OVERVIEW" },
    {
      label: "Dashboard",
      path: "/manager",
      icon: <Inbox />,
      active: filterStatus === "ALL" && !searchQuery,
      onClick: () => {
        setFilterStatus("ALL");
        setSearchQuery("");
      },
    },

    { isHeader: true, label: "CASE MANAGEMENT" },
    {
      label: "Pending AI Review",
      path: "#",
      icon: <ClipboardCheck />,
      count: pendingReview,
      badgeVariant: "warning",
      active: filterStatus === "PENDING_REVIEW",
      onClick: () => setFilterStatus("PENDING_REVIEW"),
    },
    {
      label: "Closure Review",
      path: "#",
      icon: <FileCheck />,
      count: resolvedReview,
      badgeVariant: "success",
      active: filterStatus === "RESOLVED",
      onClick: () => setFilterStatus("RESOLVED"),
    },
    {
      label: "Escalated Cases",
      path: "#",
      icon: <AlertTriangle />,
      count: escalated,
      badgeVariant: "danger",
      active: filterStatus === "ESCALATED",
      onClick: () => setFilterStatus("ESCALATED"),
    },

    { isHeader: true, label: "CASE REGISTRY" },
    {
      label: "Active In-Progress",
      path: "#",
      icon: <FolderOpen />,
      count: inProgress,
      active: filterStatus === "ASSIGNED",
      onClick: () => setFilterStatus("ASSIGNED"),
    },
    {
      label: "Formally Closed",
      path: "#",
      icon: <CheckCircle2 />,
      count: closed,
      active: filterStatus === "CLOSED",
      onClick: () => setFilterStatus("CLOSED"),
    },
  ];

  // Action required summary count
  const actionCount = pendingReview + resolvedReview + escalated;

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
            <div className="header-title-block">
              <div className="authority-page-eyebrow">
                <span className="eyebrow-badge">MANAGER WORKSPACE</span>
                <span className="eyebrow-institution">CSJMU Central Redressal Operations</span>
              </div>
              <h1 className="header-main-title">Manager Operations Portal</h1>
              <p className="header-subtitle">
                Monitor institutional intake, audit AI category predictions, verify authority resolutions, and manage final case closures.
              </p>
            </div>

            <div className="authority-header-actions">
              {/* OPERATIONAL HEALTH BADGE */}
              <div className="system-health-pill" title="All backend services and ML inference nodes active">
                <span className="system-health-dot" />
                <span className="system-health-text">System Operational</span>
              </div>

              {/* CLOCK & DATE UTILITY */}
              <LiveDateTime format="full" />

              {/* REFRESH ACTION */}
              <button
                type="button"
                className="authority-primary-button refresh-btn"
                onClick={loadDashboard}
                disabled={loading}
                title="Refresh dashboard metrics and queue"
              >
                <RefreshCw size={14} className={loading ? "spin-animation" : ""} />
                <span>{loading ? "Refreshing..." : "Refresh"}</span>
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

          {/* ACTION REQUIRED / IMMEDIATE ATTENTION SECTION */}
          {actionCount > 0 && !loading && (
            <section className="action-required-section" aria-label="Action Required">
              <div className="action-required-header">
                <div className="action-required-title-wrap">
                  <ShieldAlert size={18} className="action-required-icon" />
                  <h2>Immediate Action Items</h2>
                </div>
                <span className="action-required-badge">
                  {actionCount} {actionCount === 1 ? "Case Requires Attention" : "Cases Require Attention"}
                </span>
              </div>

              <div className="action-required-grid">
                {pendingReview > 0 && (
                  <div
                    className={`action-item-card warning ${filterStatus === "PENDING_REVIEW" ? "active" : ""}`}
                    onClick={() => setFilterStatus("PENDING_REVIEW")}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="action-item-icon warning">
                      <ClipboardCheck size={20} />
                    </div>
                    <div className="action-item-content">
                      <div className="action-item-count">{pendingReview}</div>
                      <strong className="action-item-title">Awaiting AI Validation</strong>
                      <p className="action-item-desc">
                        AI category classified. Validate and confirm to route to assigned authorities.
                      </p>
                    </div>
                    <div className="action-item-link">
                      <span>Review AI Queue</span>
                      <ArrowRight size={14} />
                    </div>
                  </div>
                )}

                {resolvedReview > 0 && (
                  <div
                    className={`action-item-card success ${filterStatus === "RESOLVED" ? "active" : ""}`}
                    onClick={() => setFilterStatus("RESOLVED")}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="action-item-icon success">
                      <FileCheck size={20} />
                    </div>
                    <div className="action-item-content">
                      <div className="action-item-count">{resolvedReview}</div>
                      <strong className="action-item-title">Closure Verification</strong>
                      <p className="action-item-desc">
                        Authority marked resolved. Review redressal report and perform formal closure.
                      </p>
                    </div>
                    <div className="action-item-link">
                      <span>Review Closures</span>
                      <ArrowRight size={14} />
                    </div>
                  </div>
                )}

                {escalated > 0 && (
                  <div
                    className={`action-item-card danger ${filterStatus === "ESCALATED" ? "active" : ""}`}
                    onClick={() => setFilterStatus("ESCALATED")}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="action-item-icon danger">
                      <AlertTriangle size={20} />
                    </div>
                    <div className="action-item-content">
                      <div className="action-item-count">{escalated}</div>
                      <strong className="action-item-title">Escalated to Deans</strong>
                      <p className="action-item-desc">
                        High priority cases escalated due to complexity or time threshold.
                      </p>
                    </div>
                    <div className="action-item-link">
                      <span>View Escalations</span>
                      <ArrowRight size={14} />
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* WORKFLOW LIFECYCLE TRACKER */}
          <section className="workflow-tracker-card" aria-label="Grievance Operational Lifecycle">
            <div className="workflow-tracker-header">
              <div className="workflow-tracker-title-wrap">
                <Layers size={16} className="workflow-tracker-icon" />
                <h3>Institutional Redressal Lifecycle</h3>
              </div>
              <span className="workflow-tracker-total">{total} Total Grievances Tracked</span>
            </div>

            <div className="workflow-steps-track">
              {/* Step 1: Intake */}
              <div
                className={`workflow-step ${filterStatus === "ALL" ? "selected" : ""}`}
                onClick={() => setFilterStatus("ALL")}
                title="View All Intake"
                role="button"
                tabIndex={0}
              >
                <div className="step-number-circle">1</div>
                <div className="step-details">
                  <span className="step-label">Intake Received</span>
                  <strong className="step-count">{total}</strong>
                </div>
              </div>

              <div className="step-connector" />

              {/* Step 2: AI Review */}
              <div
                className={`workflow-step ${filterStatus === "PENDING_REVIEW" ? "selected" : ""}`}
                onClick={() => setFilterStatus("PENDING_REVIEW")}
                title="View Pending AI Review"
                role="button"
                tabIndex={0}
              >
                <div className="step-number-circle warning">2</div>
                <div className="step-details">
                  <span className="step-label">AI Review</span>
                  <strong className="step-count text-amber-600">{pendingReview}</strong>
                </div>
              </div>

              <div className="step-connector" />

              {/* Step 3: Investigation */}
              <div
                className={`workflow-step ${filterStatus === "ASSIGNED" ? "selected" : ""}`}
                onClick={() => setFilterStatus("ASSIGNED")}
                title="View Active Cases"
                role="button"
                tabIndex={0}
              >
                <div className="step-number-circle blue">3</div>
                <div className="step-details">
                  <span className="step-label">Authority Action</span>
                  <strong className="step-count text-blue-600">{inProgress}</strong>
                </div>
              </div>

              <div className="step-connector" />

              {/* Step 4: Closure Review */}
              <div
                className={`workflow-step ${filterStatus === "RESOLVED" ? "selected" : ""}`}
                onClick={() => setFilterStatus("RESOLVED")}
                title="View Closure Review"
                role="button"
                tabIndex={0}
              >
                <div className="step-number-circle success">4</div>
                <div className="step-details">
                  <span className="step-label">Closure Review</span>
                  <strong className="step-count text-emerald-600">{resolvedReview}</strong>
                </div>
              </div>

              <div className="step-connector" />

              {/* Step 5: Closed */}
              <div
                className={`workflow-step ${filterStatus === "CLOSED" ? "selected" : ""}`}
                onClick={() => setFilterStatus("CLOSED")}
                title="View Closed Cases"
                role="button"
                tabIndex={0}
              >
                <div className="step-number-circle neutral">5</div>
                <div className="step-details">
                  <span className="step-label">Concluded</span>
                  <strong className="step-count text-slate-700">{closed}</strong>
                </div>
              </div>
            </div>
          </section>

          {/* KPI CARDS GRID */}
          <section className="authority-stat-grid" aria-label="Operational Key Metrics">
            <StatCard
              icon={<Inbox size={18} />}
              title="TOTAL CASES"
              value={total}
              subtitle="Across all grievance categories"
              variant="default"
              active={filterStatus === "ALL" && !searchQuery}
              onClick={() => {
                setFilterStatus("ALL");
                setSearchQuery("");
              }}
            />

            <StatCard
              icon={<ClipboardCheck size={18} />}
              title="AWAITING REVIEW"
              value={pendingReview}
              subtitle="Requires administrative action"
              variant="orange"
              active={filterStatus === "PENDING_REVIEW"}
              onClick={() => setFilterStatus("PENDING_REVIEW")}
            />

            <StatCard
              icon={<Activity size={18} />}
              title="AI PROCESSING"
              value={aiProcessing}
              subtitle="Inference pipeline analyzing"
              variant="purple"
              active={filterStatus === "AI_PROCESSING"}
              onClick={() => setFilterStatus("AI_PROCESSING")}
            />

            <StatCard
              icon={<FolderOpen size={18} />}
              title="ACTIVE CASES"
              value={inProgress}
              subtitle="Currently under resolution"
              variant="blue"
              active={filterStatus === "ASSIGNED"}
              onClick={() => setFilterStatus("ASSIGNED")}
            />

            <StatCard
              icon={<FileCheck size={18} />}
              title="PENDING CLOSURE"
              value={resolvedReview}
              subtitle="Awaiting final verification"
              variant="green"
              active={filterStatus === "RESOLVED"}
              onClick={() => setFilterStatus("RESOLVED")}
            />

            <StatCard
              icon={<CheckCircle2 size={18} />}
              title="CLOSED CASES"
              value={closed}
              subtitle="Resolved and formally concluded"
              variant="maroon"
              active={filterStatus === "CLOSED"}
              onClick={() => setFilterStatus("CLOSED")}
            />
          </section>

          {/* GRIEVANCE LIST CARD */}
          <section className="authority-content-card data-table-card">
            {/* CARD TOOLBAR */}
            <div className="table-card-toolbar">
              {/* SEARCH BOX */}
              <div className="table-search-box">
                <Search size={16} className="search-icon" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Search by Grievance ID, title, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search grievances"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setSearchQuery("")}
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* FILTER PILLS */}
              <div className="table-filter-pills" role="tablist" aria-label="Grievance Status Filters">
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterStatus === "ALL"}
                  className={`filter-pill ${filterStatus === "ALL" ? "active" : ""}`}
                  onClick={() => setFilterStatus("ALL")}
                >
                  <span>All Cases</span>
                  <span className="pill-count">{total}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterStatus === "PENDING_REVIEW"}
                  className={`filter-pill ${filterStatus === "PENDING_REVIEW" ? "active" : ""}`}
                  onClick={() => setFilterStatus("PENDING_REVIEW")}
                >
                  <span>Pending AI</span>
                  <span className="pill-count warning">{pendingReview}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterStatus === "ASSIGNED"}
                  className={`filter-pill ${filterStatus === "ASSIGNED" ? "active" : ""}`}
                  onClick={() => setFilterStatus("ASSIGNED")}
                >
                  <span>In Progress</span>
                  <span className="pill-count">{inProgress}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterStatus === "RESOLVED"}
                  className={`filter-pill ${filterStatus === "RESOLVED" ? "active" : ""}`}
                  onClick={() => setFilterStatus("RESOLVED")}
                >
                  <span>Closure Review</span>
                  <span className="pill-count success">{resolvedReview}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterStatus === "ESCALATED"}
                  className={`filter-pill ${filterStatus === "ESCALATED" ? "active" : ""}`}
                  onClick={() => setFilterStatus("ESCALATED")}
                >
                  <span>Escalated</span>
                  <span className="pill-count danger">{escalated}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterStatus === "CLOSED"}
                  className={`filter-pill ${filterStatus === "CLOSED" ? "active" : ""}`}
                  onClick={() => setFilterStatus("CLOSED")}
                >
                  <span>Closed</span>
                  <span className="pill-count">{closed}</span>
                </button>
              </div>
            </div>

            {/* TABLE CONTENT */}
            {loading ? (
              <LoadingState message="Loading institutional grievance records..." />
            ) : filteredGrievances.length === 0 ? (
              <EmptyState
                icon={<Inbox size={40} strokeWidth={1.5} className="text-slate-400" />}
                title="No grievances found"
                description={
                  searchQuery || filterStatus !== "ALL"
                    ? "No grievances match the active search criteria or filter selection."
                    : "No grievances currently recorded in the institutional database."
                }
                actionText={searchQuery || filterStatus !== "ALL" ? "Reset All Filters" : ""}
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
                      <th scope="col" style={{ width: "160px" }}>CASE ID</th>
                      <th scope="col">GRIEVANCE DETAILS</th>
                      <th scope="col" style={{ width: "170px" }}>CATEGORY</th>
                      <th scope="col" style={{ width: "110px" }}>PRIORITY</th>
                      <th scope="col" style={{ width: "130px" }}>SUBMITTED</th>
                      <th scope="col" style={{ width: "160px" }}>STATUS</th>
                      <th scope="col" style={{ width: "130px", textAlign: "right" }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGrievances.map((g) => (
                      <tr key={g.id || g.grievance_id} className="data-table-row">
                        <td>
                          <span className="table-id-chip font-mono" title={`Grievance ID: ${g.grievance_id}`}>
                            {g.grievance_id}
                          </span>
                        </td>
                        <td>
                          <div className="table-detail-cell">
                            <strong className="table-row-title">{g.title}</strong>
                            <p className="table-row-desc">{g.description}</p>
                          </div>
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
                            title={`Review grievance ${g.grievance_id}`}
                          >
                            <span>Review</span>
                            <ChevronRight size={14} className="action-arrow" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* TABLE FOOTER / META */}
                <div className="table-card-footer">
                  <span className="table-footer-count">
                    Showing <strong>{filteredGrievances.length}</strong> of <strong>{total}</strong> cases
                  </span>
                  {(searchQuery || filterStatus !== "ALL") && (
                    <button
                      type="button"
                      className="table-footer-clear-btn"
                      onClick={() => {
                        setFilterStatus("ALL");
                        setSearchQuery("");
                      }}
                    >
                      Clear active filters
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default ManagerDashboard;