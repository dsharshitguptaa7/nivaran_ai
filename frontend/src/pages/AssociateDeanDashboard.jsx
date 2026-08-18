import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { apiRequest } from "../services/api";

import {
  getCurrentUser,
  logoutUser,
} from "../services/authService";


function AssociateDeanDashboard() {

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


  async function loadDashboard() {

    try {

      setLoading(true);
      setError("");


      const [
        currentUser,
        assignedGrievances,
      ] = await Promise.all([

        getCurrentUser(),

        apiRequest(
          "/assignments/my/grievances"
        ),

      ]);


      setUser(currentUser);

      setGrievances(
        Array.isArray(assignedGrievances)
          ? assignedGrievances
          : []
      );


    } catch (err) {

      console.error(
        "Associate Dean dashboard error:",
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

        navigate(
          "/authority/login"
        );

        return;

      }


      setError(
        err?.message ||
        "Unable to load assigned grievances."
      );


    } finally {

      setLoading(false);

    }

  }


  /* =====================================================
     STATISTICS
  ====================================================== */

  const stats = useMemo(() => ({

    total:
      grievances.length,

    pending:
      grievances.filter(
        (grievance) =>
          grievance.status ===
            "ESCALATED" ||
          grievance.status ===
            "PENDING_REVIEW"
      ).length,

    inProgress:
      grievances.filter(
        (grievance) =>
          grievance.status ===
          "IN_PROGRESS"
      ).length,

    resolved:
      grievances.filter(
        (grievance) =>
          grievance.status ===
          "RESOLVED"
      ).length,

  }), [grievances]);


  /* =====================================================
     FORMATTERS
  ====================================================== */

  function formatDate(date) {

    if (!date) {
      return "-";
    }

    return new Date(
      date
    ).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );

  }


  function formatStatus(status) {

    if (!status) {
      return "-";
    }

    return status.replaceAll(
      "_",
      " "
    );

  }


  function statusClass(status) {

    if (!status) {
      return "";
    }

    return status
      .toLowerCase()
      .replaceAll(
        "_",
        "-"
      );

  }


  /* =====================================================
     USER
  ====================================================== */

  const userName =
    user?.full_name ||
    user?.name ||
    "Associate Dean";


  const userRole =
    user?.role
      ? user.role.replaceAll(
          "_",
          " "
        )
      : "ASSOCIATE DEAN";


  const userInitial =
    userName
      .charAt(0)
      .toUpperCase();


  /* =====================================================
     LOGOUT
  ====================================================== */

  function handleLogout() {

    logoutUser();

    navigate(
      "/authority/login"
    );

  }


  return (

    <div className="authority-page">


      {/* =================================================
          HEADER
      ================================================= */}

      <header className="authority-header">


        {/* BRAND */}

        <Link
          to="/associate-dean"
          className="authority-brand"
        >

          <div className="authority-brand-mark">
            N
          </div>


          <div className="authority-brand-text">

            <strong>
              NIVARAN
            </strong>

            <span>
              AI-Assisted Grievance Redressal System
            </span>

          </div>

        </Link>


        {/* USER */}

        <div className="authority-header-user">

          <div className="authority-user-info">

            <strong>
              {userName}
            </strong>

            <span>
              {userRole}
            </span>

          </div>


          <div className="authority-user-avatar">
            {userInitial}
          </div>


          <button
            type="button"
            className="authority-logout"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </header>


      {/* =================================================
          BODY
      ================================================= */}

      <div className="authority-body">


        {/* =================================================
            SIDEBAR
        ================================================= */}

        <aside className="authority-sidebar">


          <div className="authority-sidebar-label">
            ASSOCIATE DEAN PORTAL
          </div>


          <nav className="authority-sidebar-nav">


            {/* DASHBOARD */}

            <Link
              to="/associate-dean"
              className="authority-nav-item active"
            >

              <span className="authority-nav-icon">
                ▦
              </span>

              <span>
                Dashboard
              </span>

            </Link>


            {/* MY GRIEVANCES */}

            <Link
              to="/associate-dean"
              className="authority-nav-item"
            >

              <span className="authority-nav-icon">
                ≡
              </span>

              <span>
                My Grievances
              </span>

            </Link>


            {/* ANALYTICS */}

            <Link
              to="/associate-dean/analytics"
              className="authority-nav-item"
            >

              <span className="authority-nav-icon">
                ◉
              </span>

              <span>
                Analytics
              </span>

            </Link>


          </nav>


          {/* SIDEBAR BOTTOM */}

          <div className="authority-sidebar-bottom">

            <div className="authority-sidebar-user">

              <div className="authority-sidebar-avatar">
                {userInitial}
              </div>


              <div>

                <strong>
                  {userName}
                </strong>

                <span>
                  Associate Dean
                </span>

              </div>

            </div>

          </div>

        </aside>


        {/* =================================================
            MAIN
        ================================================= */}

        <main className="authority-main">


          {/* =================================================
              PAGE HEADER
          ================================================= */}

          <section className="authority-page-header">


            <div>

              <div className="authority-page-eyebrow">
                ASSOCIATE DEAN PORTAL
              </div>


              <h1>
                Associate Dean Dashboard
              </h1>


              <p>
                Review and manage grievances
                assigned to you.
              </p>

            </div>


            <button
              type="button"
              className="authority-primary-button"
              onClick={loadDashboard}
              disabled={loading}
            >

              {loading
                ? "Refreshing..."
                : "↻ Refresh"}

            </button>

          </section>


          {/* =================================================
              ERROR
          ================================================= */}

          {error && (

            <div className="authority-error">

              <span>
                !
              </span>

              <p>
                {error}
              </p>

            </div>

          )}


          {/* =================================================
              STATISTICS
          ================================================= */}

          <section className="authority-stat-grid">


            {/* ASSIGNED */}

            <div className="authority-stat-card">

              <div className="authority-stat-icon maroon">
                ▤
              </div>


              <div className="authority-stat-content">

                <span>
                  Assigned Grievances
                </span>

                <strong>
                  {stats.total}
                </strong>

              </div>

            </div>


            {/* PENDING */}

            <div className="authority-stat-card">

              <div className="authority-stat-icon gold">
                ◉
              </div>


              <div className="authority-stat-content">

                <span>
                  Pending Review
                </span>

                <strong>
                  {stats.pending}
                </strong>

              </div>

            </div>


            {/* IN PROGRESS */}

            <div className="authority-stat-card">

              <div className="authority-stat-icon champagne">
                ◷
              </div>


              <div className="authority-stat-content">

                <span>
                  In Progress
                </span>

                <strong>
                  {stats.inProgress}
                </strong>

              </div>

            </div>


            {/* RESOLVED */}

            <div className="authority-stat-card">

              <div className="authority-stat-icon success">
                ✓
              </div>


              <div className="authority-stat-content">

                <span>
                  Resolved
                </span>

                <strong>
                  {stats.resolved}
                </strong>

              </div>

            </div>


          </section>


          {/* =================================================
              ASSIGNED GRIEVANCES
          ================================================= */}

          <section className="authority-content-card">


            <div className="authority-section-header">

              <div>

                <h2>
                  My Assigned Grievances
                </h2>

                <p>
                  Grievances forwarded to you
                  for administrative review.
                </p>

              </div>


              <Link
                to="/associate-dean"
                className="authority-view-all"
              >
                View All →
              </Link>

            </div>


            {/* =================================================
                TABLE
            ================================================= */}

            <div className="authority-grievance-table">


              {/* TABLE HEADER */}

              <div className="authority-table-header">

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


              {/* LOADING */}

              {loading && (

                <div className="authority-table-state">

                  <div className="authority-state-spinner">
                    AI
                  </div>

                  <p>
                    Loading assigned grievances...
                  </p>

                </div>

              )}


              {/* EMPTY */}

              {!loading &&
                grievances.length === 0 && (

                  <div className="authority-table-state">

                    <div className="authority-empty-icon">
                      ◌
                    </div>


                    <h3>
                      No grievances assigned
                    </h3>


                    <p>
                      Grievances forwarded to you
                      will appear here.
                    </p>

                  </div>

                )}


              {/* DATA */}

              {!loading &&
                grievances.length > 0 &&
                grievances.map(
                  (grievance) => (

                    <div
                      className="authority-table-row"
                      key={grievance.id}
                    >


                      {/* GRIEVANCE */}

                      <div className="authority-grievance-info">

                        <strong>
                          {grievance.title}
                        </strong>

                        <span>
                          {grievance.grievance_id}
                        </span>

                      </div>


                      {/* STATUS */}

                      <div>

                        <span
                          className={`authority-status-badge ${
                            statusClass(
                              grievance.status
                            )
                          }`}
                        >

                          {formatStatus(
                            grievance.status
                          )}

                        </span>

                      </div>


                      {/* PRIORITY */}

                      <div>

                        <span
                          className={`authority-priority ${
                            grievance.priority
                              ?.toLowerCase() ||
                            ""
                          }`}
                        >

                          {grievance.priority}

                        </span>

                      </div>


                      {/* DATE */}

                      <span className="authority-date">

                        {formatDate(
                          grievance.created_at
                        )}

                      </span>


                      {/* ACTION */}

                      <Link
                        to={`/associate-dean/grievances/${grievance.grievance_id}`}
                        className="authority-outline-button"
                      >
                        View →
                      </Link>


                    </div>

                  )
                )}

            </div>

          </section>


          {/* =================================================
              AI INTELLIGENCE
          ================================================= */}

          <section className="authority-ai-card">


            <div className="authority-ai-icon">
              AI
            </div>


            <div className="authority-ai-content">

              <span>
                AI-ASSISTED GRIEVANCE MANAGEMENT
              </span>


              <h3>
                NIVARAN-AI Intelligence
              </h3>


              <p>
                AI automatically analyzes grievances
                using category classification, semantic
                clustering and confidence scoring before
                administrative review.
              </p>

            </div>


            <div className="authority-ai-status">

              <span>
                ●
              </span>

              AI System Active

            </div>


          </section>


        </main>

      </div>

    </div>

  );

}


export default AssociateDeanDashboard;