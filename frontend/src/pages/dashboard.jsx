import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  getCurrentUser,
  logoutUser,
} from "../services/authService";

import {
  getMyGrievances,
} from "../services/grievanceService";


function Dashboard() {

  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [grievances, setGrievances] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  /* =====================================================
     LOAD DASHBOARD
  ====================================================== */

  useEffect(() => {
    loadDashboard();
  }, []);


  const loadDashboard = async () => {

    try {

      setLoading(true);
      setError("");

      const [
        currentUser,
        myGrievances,
      ] = await Promise.all([
        getCurrentUser(),
        getMyGrievances(),
      ]);

      setUser(currentUser);
      setGrievances(myGrievances);

    } catch (err) {

      console.error(
        "Dashboard loading error:",
        err
      );

      if (
        err.message
          ?.toLowerCase()
          .includes("401") ||
        err.message
          ?.toLowerCase()
          .includes("unauthorized")
      ) {

        logoutUser();
        navigate("/login");

        return;
      }

      setError(
        err.message ||
        "Unable to load dashboard data."
      );

    } finally {

      setLoading(false);

    }
  };


  /* =====================================================
     STATISTICS
  ====================================================== */

  const statistics = useMemo(() => {

    const total =
      grievances.length;

    const pending =
      grievances.filter(
        (g) =>
          g.status === "PENDING_REVIEW" ||
          g.status === "SUBMITTED" ||
          g.status === "AI_PROCESSING"
      ).length;

    const inProgress =
      grievances.filter(
        (g) =>
          g.status === "IN_PROGRESS"
      ).length;

    const resolved =
      grievances.filter(
        (g) =>
          g.status === "RESOLVED" ||
          g.status === "CLOSED"
      ).length;

    return {
      total,
      pending,
      inProgress,
      resolved,
    };

  }, [grievances]);


  /* =====================================================
     RECENT GRIEVANCES
  ====================================================== */

  const recentGrievances =
    grievances.slice(0, 5);


  /* =====================================================
     HELPERS
  ====================================================== */

  const formatDate = (dateString) => {

    if (!dateString) {
      return "-";
    }

    return new Date(
      dateString
    ).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };


  const formatStatus = (status) => {

    if (!status) {
      return "-";
    }

    return status.replaceAll(
      "_",
      " "
    );

  };


  /* =====================================================
     LOGOUT
  ====================================================== */

  const handleLogout = () => {

    logoutUser();
    navigate("/login");

  };


  /* =====================================================
     LOADING
  ====================================================== */

  if (loading) {

    return (

      <div className="applicant-page applicant-state-page">

        <div className="applicant-state-card">

          <div className="applicant-state-icon">
            N
          </div>

          <p>
            Loading your NIVARAN dashboard...
          </p>

        </div>

      </div>

    );

  }


  /* =====================================================
     ERROR
  ====================================================== */

  if (error) {

    return (

      <div className="applicant-page applicant-state-page">

        <div className="applicant-state-card">

          <div className="applicant-state-icon error">
            !
          </div>

          <h2>
            Unable to load dashboard
          </h2>

          <p>
            {error}
          </p>

          <button
            className="applicant-primary-button"
            onClick={loadDashboard}
          >
            Try Again
          </button>

        </div>

      </div>

    );

  }


  /* =====================================================
     USER DATA
  ====================================================== */

  const userName =
    user?.full_name || "Applicant";

  const userRole =
    user?.role
      ? user.role.replaceAll(
          "_",
          " "
        )
      : "Applicant";

  const userInitial =
    userName
      .charAt(0)
      .toUpperCase();


  /* =====================================================
     LATEST GRIEVANCE
  ====================================================== */

  const latestGrievance =
    grievances.length > 0
      ? grievances[0]
      : null;


  return (

    <div className="applicant-page">


      {/* =================================================
          HEADER
      ================================================= */}

      <header className="applicant-header">

        <Link
          to="/dashboard"
          className="applicant-brand"
        >

          <div className="applicant-brand-mark">
            N
          </div>

          <div className="applicant-brand-text">

            <strong>
              NIVARAN
            </strong>

            <span>
              Grievance Redressal System
            </span>

          </div>

        </Link>


        <div className="applicant-header-user">

          <div className="applicant-user-info">

            <strong>
              {userName}
            </strong>

            <span>
              {userRole}
            </span>

          </div>


          <div className="applicant-user-avatar">
            {userInitial}
          </div>


          <button
            type="button"
            className="applicant-logout"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </header>


      {/* =================================================
          BODY
      ================================================= */}

      <div className="applicant-body">


        {/* =================================================
            SIDEBAR
        ================================================= */}

        <aside className="applicant-sidebar">

          <div className="applicant-sidebar-label">
            APPLICANT
          </div>


          <nav className="applicant-sidebar-nav">


            <Link
              to="/dashboard"
              className="applicant-nav-item active"
            >

              <span className="applicant-nav-icon">
                ▦
              </span>

              <span>
                Dashboard
              </span>

            </Link>


            <Link
              to="/dashboard/grievances"
              className="applicant-nav-item"
            >

              <span className="applicant-nav-icon">
                ≡
              </span>

              <span>
                My Grievances
              </span>

            </Link>


            <Link
              to="/dashboard/submit"
              className="applicant-nav-item"
            >

              <span className="applicant-nav-icon">
                +
              </span>

              <span>
                Submit Grievance
              </span>

            </Link>


          </nav>

        </aside>


        {/* =================================================
            MAIN CONTENT
        ================================================= */}

        <main className="applicant-main">


          {/* =================================================
              PAGE HEADER
          ================================================= */}

          <section className="applicant-page-header">

            <div>

              <div className="applicant-page-eyebrow">
                SECURE GRIEVANCE MANAGEMENT SYSTEM
              </div>

              <h1>
                Welcome, {userName}
              </h1>

              <p>
                Submit and track your grievances
              </p>

            </div>


            <Link
              to="/dashboard/submit"
              className="applicant-primary-button"
            >
              + Submit Grievance
            </Link>

          </section>


          {/* =================================================
              STATISTICS
          ================================================= */}

          <section className="applicant-stat-grid">


            <div className="applicant-stat-card">

              <div className="applicant-stat-icon maroon">
                #
              </div>

              <div className="applicant-stat-content">

                <strong>
                  {String(
                    statistics.total
                  ).padStart(2, "0")}
                </strong>

                <span>
                  Total Grievances
                </span>

              </div>

            </div>


            <div className="applicant-stat-card">

              <div className="applicant-stat-icon gold">
                !
              </div>

              <div className="applicant-stat-content">

                <strong>
                  {String(
                    statistics.pending
                  ).padStart(2, "0")}
                </strong>

                <span>
                  Pending
                </span>

              </div>

            </div>


            <div className="applicant-stat-card">

              <div className="applicant-stat-icon progress">
                ↻
              </div>

              <div className="applicant-stat-content">

                <strong>
                  {String(
                    statistics.inProgress
                  ).padStart(2, "0")}
                </strong>

                <span>
                  In Progress
                </span>

              </div>

            </div>


            <div className="applicant-stat-card">

              <div className="applicant-stat-icon success">
                ✓
              </div>

              <div className="applicant-stat-content">

                <strong>
                  {String(
                    statistics.resolved
                  ).padStart(2, "0")}
                </strong>

                <span>
                  Resolved
                </span>

              </div>

            </div>

          </section>


          {/* =================================================
              MY GRIEVANCES
          ================================================= */}

          <section className="applicant-content-card">


            <div className="applicant-section-header">

              <div>

                <h2>
                  My Grievances
                </h2>

                <p>
                  Track the status and progress
                  of your grievances
                </p>

              </div>


              <Link
                to="/dashboard/grievances"
                className="applicant-view-all"
              >
                View All
              </Link>

            </div>


            <div className="applicant-grievance-list">

              {recentGrievances.length === 0 ? (

                <div className="applicant-empty-state">

                  <div className="applicant-empty-icon">
                    +
                  </div>

                  <h3>
                    No grievances yet
                  </h3>

                  <p>
                    Submit your first grievance
                    to get started.
                  </p>

                  <Link
                    to="/dashboard/submit"
                    className="applicant-primary-button"
                  >
                    Submit Grievance
                  </Link>

                </div>

              ) : (

                recentGrievances.map(
                  (grievance) => (

                    <div
                      className="applicant-grievance-row"
                      key={grievance.id}
                    >

                      <div className="applicant-grievance-main">

                        <span className="applicant-grievance-id">
                          {grievance.grievance_id}
                        </span>

                        <strong>
                          {grievance.title}
                        </strong>

                        <span className="applicant-grievance-date">
                          Submitted on{" "}
                          {formatDate(
                            grievance.created_at
                          )}
                        </span>

                      </div>


                      <div className="applicant-grievance-meta">

                        <span
                          className={`applicant-status-badge ${
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


                        <span
                          className={`applicant-priority ${
                            grievance.priority
                              ?.toLowerCase()
                          }`}
                        >
                          {grievance.priority}
                        </span>


                        <span className="applicant-updated">

                          Last updated:{" "}

                          {formatDate(
                            grievance.updated_at ||
                            grievance.created_at
                          )}

                        </span>


                        <Link
                          to={`/dashboard/grievances/${grievance.grievance_id}`}
                          className="applicant-outline-button"
                        >
                          {grievance.status ===
                          "RESOLVED"
                            ? "View"
                            : "Track"}
                        </Link>

                      </div>

                    </div>

                  )
                )

              )}

            </div>

          </section>


          {/* =================================================
              QUICK ACTIONS
          ================================================= */}

          <section className="applicant-content-card">

            <div className="applicant-section-title">

              <h2>
                Quick Actions
              </h2>

            </div>


            <div className="applicant-quick-actions">


              <Link
                to="/dashboard/submit"
                className="applicant-quick-action"
              >

                <div className="applicant-quick-icon maroon">
                  +
                </div>

                <div>

                  <strong>
                    Submit Grievance
                  </strong>

                  <span>
                    Register a new grievance
                  </span>

                </div>

              </Link>


              <Link
                to="/dashboard/grievances"
                className="applicant-quick-action"
              >

                <div className="applicant-quick-icon neutral">
                  #
                </div>

                <div>

                  <strong>
                    My Grievances
                  </strong>

                  <span>
                    View all your grievances
                  </span>

                </div>

              </Link>

            </div>

          </section>


          {/* =================================================
              RECENT UPDATE
          ================================================= */}

          <section className="applicant-content-card">

            <div className="applicant-section-header">

              <div>

                <h2>
                  Recent Update
                </h2>

                <p>
                  Latest update related to
                  your grievances
                </p>

              </div>

            </div>


            {latestGrievance ? (

              <div className="applicant-notification">

                <div className="applicant-notification-icon">
                  !
                </div>

                <div className="applicant-notification-content">

                  <strong>
                    Grievance{" "}
                    {latestGrievance.grievance_id}
                    {" "}has been updated
                  </strong>

                  <p>
                    Your grievance is currently{" "}
                    {formatStatus(
                      latestGrievance.status
                    ).toLowerCase()}
                    .
                  </p>

                  <span>
                    {formatDate(
                      latestGrievance.updated_at ||
                      latestGrievance.created_at
                    )}
                  </span>

                </div>

              </div>

            ) : (

              <div className="applicant-no-notification">
                No recent updates.
              </div>

            )}

          </section>


          {/* =================================================
              AI INFORMATION
          ================================================= */}

          <section className="applicant-ai-card">

            <div className="applicant-ai-icon">
              AI
            </div>


            <div className="applicant-ai-content">

              <span>
                AI-ASSISTED GRIEVANCE MANAGEMENT
              </span>

              <h3>
                NIVARAN-AI Intelligence
              </h3>

              <p>
                Your grievances are analyzed using
                AI-assisted classification and
                semantic clustering before entering
                the administrative review workflow.
              </p>

            </div>


            <div className="applicant-ai-status">
              <span>●</span>
              AI System Active
            </div>

          </section>


        </main>

      </div>

    </div>

  );

}


export default Dashboard;