import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  getAllGrievances,
  processGrievanceAI,
} from "../services/grievanceService";

function ReviewerDashboard() {
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

      const data = await getAllGrievances();

      setGrievances(data);
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to load grievances."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProcessAI = async (grievanceId) => {
    try {
      setProcessingId(grievanceId);
      setError("");

      await processGrievanceAI(
        grievanceId
      );

      // Refresh list after AI processing
      await loadGrievances();
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "AI processing failed."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const total = grievances.length;

  const pendingReview =
    grievances.filter(
      (g) =>
        g.status === "PENDING_REVIEW"
    ).length;

  const aiProcessing =
    grievances.filter(
      (g) =>
        g.status === "AI_PROCESSING"
    ).length;

  const resolved =
    grievances.filter(
      (g) =>
        g.status === "RESOLVED"
    ).length;

  const formatStatus = (status) => {
    return status
      ?.replaceAll("_", " ")
      || "-";
  };

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  return (
    <div className="dashboard-page">

      {/* Sidebar */}

      <aside className="dashboard-sidebar">

        <Link
          to="/"
          className="dashboard-logo"
        >
          NIVARAN<span>-AI</span>
        </Link>

        <nav className="dashboard-nav">

          <Link
            to="/reviewer"
            className="dashboard-nav-item active"
          >
            <span>⌂</span>
            Reviewer Dashboard
          </Link>

          <Link
            to="/dashboard/grievances"
            className="dashboard-nav-item"
          >
            <span>▤</span>
            Applicant View
          </Link>

        </nav>

      </aside>

      {/* Main */}

      <main className="dashboard-main">

        <header className="dashboard-header">

          <div>

            <h1>
              Reviewer Dashboard
            </h1>

            <p>
              Review and process submitted
              grievances using NIVARAN-AI.
            </p>

          </div>

        </header>

        {/* Statistics */}

        <section className="dashboard-stats">

          <div className="stat-card">
            <div className="stat-icon blue">
              ▤
            </div>

            <div>
              <span>
                Total Grievances
              </span>

              <strong>
                {total}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">
              ◉
            </div>

            <div>
              <span>
                Pending Review
              </span>

              <strong>
                {pendingReview}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">
              ◷
            </div>

            <div>
              <span>
                AI Processing
              </span>

              <strong>
                {aiProcessing}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">
              ✓
            </div>

            <div>
              <span>
                Resolved
              </span>

              <strong>
                {resolved}
              </strong>
            </div>
          </div>

        </section>

        {/* Error */}

        {error && (
          <div className="submit-error">
            {error}
          </div>
        )}

        {/* Grievances */}

        <section className="grievances-section">

          <div className="section-top">

            <div>

              <h2>
                All Grievances
              </h2>

              <p>
                Review submitted grievances
                and run AI analysis.
              </p>

            </div>

          </div>

          {loading ? (

            <div className="dashboard-loading">
              <div className="dashboard-loading-spinner">
                AI
              </div>

              <p>
                Loading grievances...
              </p>
            </div>

          ) : (

            <div className="grievance-table">

              <div className="table-header">

                <span>
                  Grievance
                </span>

                <span>
                  Status
                </span>

                <span>
                  Priority
                </span>

                <span>
                  Date
                </span>

                <span>
                  Action
                </span>

              </div>

              {grievances.map(
                (grievance) => (

                  <div
                    className="table-row reviewer-row"
                    key={grievance.id}
                  >

                    <div className="grievance-info">

                      <strong>
                        {grievance.title}
                      </strong>

                      <span>
                        {grievance.grievance_id}
                      </span>

                    </div>

                    <span>

                      <span
                        className={`status-badge ${
                          grievance.status
                            ?.toLowerCase()
                            .replaceAll(
                              "_",
                              "-"
                            )
                        }`}
                      >
                        {formatStatus(
                          grievance.status
                        )}
                      </span>

                    </span>

                    <span
                      className={`priority ${
                        grievance.priority?.toLowerCase()
                      }`}
                    >
                      {grievance.priority}
                    </span>

                    <span className="date-text">
                      {formatDate(
                        grievance.created_at
                      )}
                    </span>

                    <div className="reviewer-actions">

                      <Link
                        to={`/dashboard/grievances/${grievance.grievance_id}`}
                        className="secondary-button small"
                      >
                        View
                      </Link>

                      {grievance.status ===
                        "SUBMITTED" && (
                        <button
                          className="dashboard-primary-button small"
                          onClick={() =>
                            handleProcessAI(
                              grievance.grievance_id
                            )
                          }
                          disabled={
                            processingId ===
                            grievance.grievance_id
                          }
                        >
                          {processingId ===
                          grievance.grievance_id
                            ? "Processing..."
                            : "Process AI"}
                        </button>
                      )}

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </section>

      </main>

    </div>
  );
}

export default ReviewerDashboard;