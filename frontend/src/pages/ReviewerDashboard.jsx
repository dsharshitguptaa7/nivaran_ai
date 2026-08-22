import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Inbox,
  ClipboardCheck,
  FileCheck,
  Activity,
  RefreshCw,
} from "lucide-react";

import {
  getAllGrievances,
  processGrievanceAI,
} from "../services/grievanceService";
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


function ReviewerDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadGrievances();
  }, []);

  const loadGrievances = async () => {
    try {
      setLoading(true);
      setError("");

      const [currentUser, data] = await Promise.all([
        getCurrentUser().catch(() => null),
        getAllGrievances(),
      ]);

      setUser(currentUser);
      setGrievances(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      if (
        err.message?.toLowerCase().includes("401") ||
        err.message?.toLowerCase().includes("unauthorized")
      ) {
        logoutUser();
        navigate("/login?type=authority");
        return;
      }
      setError(err.message || "Unable to load grievances.");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessAI = async (grievanceId) => {
    try {
      setProcessingId(grievanceId);
      setError("");

      await processGrievanceAI(grievanceId);
      await loadGrievances();
    } catch (err) {
      console.error(err);
      setError(err.message || "AI processing failed.");
    } finally {
      setProcessingId(null);
    }
  };

  const total = grievances.length;
  const pendingReview = grievances.filter((g) => g.status === "PENDING_REVIEW").length;
  const aiProcessing = grievances.filter((g) => g.status === "AI_PROCESSING").length;
  const resolved = grievances.filter((g) => g.status === "RESOLVED" || g.status === "CLOSED").length;

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
    { label: "Dashboard", path: "/reviewer", icon: <Inbox size={16} />, active: true },
    { label: "Pending AI Review", path: "#", icon: <ClipboardCheck size={16} />, count: pendingReview },
    { label: "Resolved", path: "#", icon: <FileCheck size={16} />, count: resolved },
  ];

  return (
    <div className="authority-page">
      <AuthorityHeader
        userName={user?.full_name || user?.name || "Reviewer"}
        userRole={user?.role || "REVIEWER"}
        portalHome="/reviewer"
        onLogout={handleLogout}
      />

      <div className="authority-body">
        <AuthoritySidebar
          portalLabel="AI REVIEWER PORTAL"
          navItems={navItems}
          userName={user?.full_name || user?.name || "Reviewer"}
          userRole={user?.role || "REVIEWER"}
          onLogout={handleLogout}
        />

        <main className="authority-main">
          <section className="authority-page-header">
            <div>
              <div className="authority-page-eyebrow">AI BENCHMARK & CLASSIFICATION</div>
              <h1>AI Reviewer Portal</h1>
              <p>Trigger autonomous classification pipeline, audit predictions, and manage pending intake queues.</p>
            </div>

            <div className="authority-header-actions">
              <LiveDateTime format="full" />
              <button
                type="button"
                className="authority-primary-button"
                onClick={loadGrievances}
                disabled={loading}
              >
                <RefreshCw size={14} className={loading ? "spin-animation" : ""} />
                <span>{loading ? "Refreshing..." : "Refresh"}</span>
              </button>
            </div>
          </section>

          {error && (
            <ErrorState
              title="Unable to load grievances"
              message={error}
              onRetry={loadGrievances}
            />
          )}

          <section className="authority-stat-grid">
            <StatCard icon={<Inbox size={18} />} title="Total Intake" value={total} subtitle="All grievances" variant="default" />
            <StatCard icon={<ClipboardCheck size={18} />} title="Pending Review" value={pendingReview} subtitle="Awaiting validation" variant="orange" />
            <StatCard icon={<Activity size={18} />} title="AI Processing" value={aiProcessing} subtitle="Currently analyzing" variant="purple" />
            <StatCard icon={<FileCheck size={18} />} title="Resolved / Closed" value={resolved} subtitle="Redressed cases" variant="green" />
          </section>

          <section className="authority-content-card data-table-card">
            <div className="authority-card-header" style={{ padding: "20px 24px 16px" }}>
              <div>
                <h2>Grievance Classification Queue</h2>
                <p>Execute BERT model classification or review model confidence levels.</p>
              </div>
            </div>

            {loading ? (
              <LoadingState message="Loading grievance records..." />
            ) : grievances.length === 0 ? (
              <EmptyState title="No grievances found" description="There are currently no grievances in the system." />
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
                      <th style={{ textAlign: "right" }}>AI Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grievances.map((g) => (
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
                          {g.status === "SUBMITTED" ? (
                            <button
                              type="button"
                              className="authority-primary-button"
                              onClick={() => handleProcessAI(g.grievance_id)}
                              disabled={processingId === g.grievance_id}
                            >
                              {processingId === g.grievance_id ? "Classifying..." : "⚡ Run AI Classification"}
                            </button>
                          ) : (
                            <Link to={`/manager/grievances/${g.grievance_id}`} className="table-action-link">
                              View Details →
                            </Link>
                          )}
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

export default ReviewerDashboard;