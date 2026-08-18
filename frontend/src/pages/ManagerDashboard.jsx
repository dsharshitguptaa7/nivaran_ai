import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  getCurrentUser,
  logoutUser,
} from "../services/authService";

import {
  getAllGrievances,
} from "../services/grievanceService";


function ManagerDashboard() {

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
        allGrievances,
      ] = await Promise.all([
        getCurrentUser(),
        getAllGrievances(),
      ]);


      setUser(currentUser);
      setGrievances(allGrievances);


    } catch (err) {

      console.error(
        "Failed to load manager dashboard:",
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
        navigate("/authority/login");

        return;

      }


      setError(
        err?.message ||
        "Unable to load dashboard."
      );


    } finally {

      setLoading(false);

    }

  }


  /* =====================================================
     STATISTICS
  ====================================================== */

  const total =
    grievances.length;


  const pendingReview = useMemo(() => {

    return grievances.filter(
      (grievance) =>
        grievance.status ===
        "PENDING_REVIEW"
    ).length;

  }, [grievances]);


  const aiProcessing = useMemo(() => {

    return grievances.filter(
      (grievance) =>
        grievance.status ===
        "AI_PROCESSING"
    ).length;

  }, [grievances]);


  const inProgress = useMemo(() => {

    return grievances.filter(
      (grievance) =>
        grievance.status ===
        "IN_PROGRESS"
    ).length;

  }, [grievances]);


  /* =====================================================
     FORMATTERS
  ====================================================== */

  const formatStatus = (status) => {

    if (!status) {
      return "-";
    }

    return status.replaceAll(
      "_",
      " "
    );

  };


  const formatDate = (date) => {

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

  };


  /* =====================================================
     USER
  ====================================================== */

  const userName =
    user?.full_name ||
    user?.name ||
    "Manager";


  const userRole =
    user?.role
      ? user.role.replaceAll(
          "_",
          " "
        )
      : "MANAGER";


  const userInitial =
    userName
      .charAt(0)
      .toUpperCase();


  /* =====================================================
     LOGOUT
  ====================================================== */

  const handleLogout = () => {

    logoutUser();
    navigate("/authority/login");

  };


  return (

    <div className="authority-page">


      {/* =================================================
          HEADER
      ================================================= */}

      <header className="authority-header">


        {/* BRAND */}

        <Link
          to="/manager"
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
            MANAGER PORTAL
          </div>


          <nav className="authority-sidebar-nav">


            {/* DASHBOARD */}

            <Link
              to="/manager"
              className="authority-nav-item active"
            >

              <span className="authority-nav-icon">
                ▦
              </span>

              <span>
                Dashboard
              </span>

            </Link>


            {/* ALL GRIEVANCES */}

            <Link
              to="/manager/grievances"
              className="authority-nav-item"
            >

              <span className="authority-nav-icon">
                ≡
              </span>

              <span>
                All Grievances
              </span>

            </Link>


            {/* ANALYTICS */}

            <Link
              to="/"
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


          {/* =================================================
              SIDEBAR BOTTOM
          ================================================= */}

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
                  Manager
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
                MANAGER PORTAL
              </div>


              <h1>
                Manager Dashboard
              </h1>


              <p>
                Monitor and manage grievances
                received by the system.
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


            {/* TOTAL */}

            <div className="authority-stat-card">

              <div className="authority-stat-icon maroon">
                ▤
              </div>


              <div className="authority-stat-content">

                <span>
                  Total Grievances
                </span>

                <strong>
                  {total}
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
                  {pendingReview}
                </strong>

              </div>

            </div>


            {/* AI */}

            <div className="authority-stat-card">

              <div className="authority-stat-icon champagne">
                ◷
              </div>


              <div className="authority-stat-content">

                <span>
                  AI Processing
                </span>

                <strong>
                  {aiProcessing}
                </strong>

              </div>

            </div>


            {/* IN PROGRESS */}

            <div className="authority-stat-card">

              <div className="authority-stat-icon success">
                ✓
              </div>


              <div className="authority-stat-content">

                <span>
                  In Progress
                </span>

                <strong>
                  {inProgress}
                </strong>

              </div>

            </div>


          </section>


          {/* =================================================
              ALL GRIEVANCES
          ================================================= */}

          <section className="authority-content-card">


            {/* SECTION HEADER */}

            <div className="authority-section-header">


              <div>

                <h2>
                  All Grievances
                </h2>

                <p>
                  Grievances received by NIVARAN-AI
                </p>

              </div>


              <Link
                to="/manager/grievances"
                className="authority-view-all"
              >
                View All →
              </Link>


            </div>


            {/* =================================================
                TABLE
            ================================================= */}

            <div className="authority-grievance-table">


              {/* HEADER */}

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
                    Loading grievances...
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
                      No grievances found
                    </h3>

                    <p>
                      There are currently no
                      grievances available.
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
                        to={`/manager/grievances/${grievance.grievance_id}`}
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
                using category classification,
                semantic clustering and confidence
                scoring before administrative review.
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


export default ManagerDashboard;