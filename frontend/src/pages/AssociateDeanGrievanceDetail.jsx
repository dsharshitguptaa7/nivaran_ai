import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  getGrievance,
  getGrievanceHistory,
  escalateGrievance,
} from "../services/grievanceService";

import {
  getCurrentUser,
  logoutUser,
} from "../services/authService";


function AssociateDeanGrievanceDetail() {

  const { grievanceId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  const [grievance, setGrievance] =
    useState(null);

  const [history, setHistory] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [actionLoading, setActionLoading] =
    useState(false);

  const [actionMessage, setActionMessage] =
    useState("");

  const [actionError, setActionError] =
    useState("");

  const [remarks, setRemarks] =
    useState("");


  /* =====================================================
     LOAD GRIEVANCE
  ====================================================== */

  useEffect(() => {
    loadGrievance();
  }, [grievanceId]);


  async function loadGrievance() {

    try {

      setLoading(true);
      setError("");

      const [
        grievanceData,
        historyData,
        currentUser,
      ] = await Promise.all([

        getGrievance(
          grievanceId
        ),

        getGrievanceHistory(
          grievanceId
        ),

        getCurrentUser(),

      ]);

      setGrievance(
        grievanceData
      );

      setHistory(
        historyData
      );

      setUser(
        currentUser
      );


    } catch (err) {

      console.error(
        "Associate Dean grievance error:",
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
        "Unable to load grievance."
      );


    } finally {

      setLoading(false);

    }

  }


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


  function formatDateTime(date) {

    if (!date) {
      return "-";
    }

    return new Date(
      date
    ).toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
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


  /* =====================================================
     FORWARD TO DEAN
  ====================================================== */

  async function handleForwardToDean() {

    if (!grievance) {
      return;
    }


    const confirmed =
      window.confirm(
        "Forward this grievance to Dean?"
      );


    if (!confirmed) {
      return;
    }


    try {

      setActionLoading(true);

      setActionMessage("");

      setActionError("");


      const response =
        await escalateGrievance(
          grievance.grievance_id,
          "Final administrative review is required.",
          remarks ||
            "Forwarding to Dean for final consideration."
        );


      setGrievance(
        response
      );

      setRemarks("");


      setActionMessage(
        "Grievance successfully forwarded to Dean."
      );


      const updatedHistory =
        await getGrievanceHistory(
          grievance.grievance_id
        );


      setHistory(
        updatedHistory
      );


    } catch (err) {

      console.error(
        "Forward to Dean error:",
        err
      );


      setActionError(
        err?.message ||
        "Unable to forward grievance."
      );


    } finally {

      setActionLoading(false);

    }

  }


  /* =====================================================
     LOADING
  ====================================================== */

  if (loading) {

    return (

      <div className="authority-page authority-state-page">

        <div className="authority-state-card">

          <div className="authority-state-icon">
            AI
          </div>

          <h3>
            Loading grievance details
          </h3>

          <p>
            Please wait while the grievance
            information is being loaded.
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

      <div className="authority-page">


        {/* HEADER */}

        <header className="authority-header">

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


        {/* BODY */}

        <div className="authority-body">


          <aside className="authority-sidebar">

            <div className="authority-sidebar-label">
              ASSOCIATE DEAN PORTAL
            </div>


            <nav className="authority-sidebar-nav">

              <Link
                to="/associate-dean"
                className="authority-nav-item"
              >

                <span className="authority-nav-icon">
                  ▦
                </span>

                <span>
                  Dashboard
                </span>

              </Link>


              <Link
                to="/associate-dean"
                className="authority-nav-item active"
              >

                <span className="authority-nav-icon">
                  ≡
                </span>

                <span>
                  My Grievances
                </span>

              </Link>


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

          </aside>


          <main className="authority-main">

            <div className="authority-state-card error">

              <div className="authority-state-icon error">
                !
              </div>

              <h2>
                Unable to load grievance
              </h2>

              <p>
                {error}
              </p>

              <Link
                to="/associate-dean"
                className="authority-primary-button"
              >
                ← Back to Dashboard
              </Link>

            </div>

          </main>

        </div>

      </div>

    );

  }


  if (!grievance) {
    return null;
  }


  return (

    <div className="authority-page">


      {/* =================================================
          HEADER
      ================================================= */}

      <header className="authority-header">

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


            <Link
              to="/associate-dean"
              className="authority-nav-item"
            >

              <span className="authority-nav-icon">
                ▦
              </span>

              <span>
                Dashboard
              </span>

            </Link>


            <Link
              to="/associate-dean"
              className="authority-nav-item active"
            >

              <span className="authority-nav-icon">
                ≡
              </span>

              <span>
                My Grievances
              </span>

            </Link>


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

        </aside>


        {/* =================================================
            MAIN
        ================================================= */}

        <main className="authority-main">


          {/* BACK */}

          <Link
            to="/associate-dean"
            className="authority-back-link"
          >
            ← Back to Associate Dean Dashboard
          </Link>


          {/* =================================================
              DETAIL HEADER
          ================================================= */}

          <section className="authority-detail-header">

            <div>

              <span className="authority-detail-id">
                {grievance.grievance_id}
              </span>


              <h1>
                {grievance.title}
              </h1>


              <p>
                Submitted on{" "}
                {formatDate(
                  grievance.submitted_at
                )}
              </p>

            </div>


            <span
              className={`authority-status-badge large ${
                statusClass(
                  grievance.status
                )
              }`}
            >

              {formatStatus(
                grievance.status
              )}

            </span>

          </section>


          {/* =================================================
              MESSAGES
          ================================================= */}

          {actionMessage && (

            <div className="authority-success">

              <span>
                ✓
              </span>

              <p>
                {actionMessage}
              </p>

            </div>

          )}


          {actionError && (

            <div className="authority-error">

              <span>
                !
              </span>

              <p>
                {actionError}
              </p>

            </div>

          )}


          {/* =================================================
              DETAILS + AI
          ================================================= */}

          <section className="authority-detail-grid">


            {/* GRIEVANCE DETAILS */}

            <div className="authority-content-card">


              <div className="authority-card-header">

                <h2>
                  Grievance Details
                </h2>

              </div>


              <div className="authority-card-body">


                <div className="authority-detail-field full">

                  <label>
                    Title
                  </label>

                  <p>
                    {grievance.title}
                  </p>

                </div>


                <div className="authority-detail-field full">

                  <label>
                    Description
                  </label>

                  <p className="authority-description">
                    {grievance.description}
                  </p>

                </div>


                <div className="authority-detail-fields-row">


                  <div className="authority-detail-field">

                    <label>
                      Priority
                    </label>

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


                  <div className="authority-detail-field">

                    <label>
                      Submitted
                    </label>

                    <p>
                      {formatDate(
                        grievance.submitted_at
                      )}
                    </p>

                  </div>

                </div>

              </div>

            </div>


            {/* AI ANALYSIS */}

            <div className="authority-content-card authority-ai-analysis-card">


              <div className="authority-card-header">

                <div className="authority-ai-title">

                  <div className="authority-ai-small-icon">
                    AI
                  </div>

                  <h2>
                    AI Analysis
                  </h2>

                </div>

              </div>


              <div className="authority-card-body">


                <div className="authority-ai-result-row">

                  <span>
                    Category
                  </span>

                  <strong>
                    {grievance.category_id
                      ? "Classified"
                      : "Not classified"}
                  </strong>

                </div>


                <div className="authority-ai-result-row">

                  <span>
                    Cluster
                  </span>

                  <strong>
                    {grievance.cluster_id
                      ? "Assigned"
                      : "Not assigned"}
                  </strong>

                </div>


                <div className="authority-ai-result-row">

                  <span>
                    AI Confidence
                  </span>

                  <strong>
                    {grievance.ai_confidence != null
                      ? `${(
                          grievance.ai_confidence *
                          100
                        ).toFixed(2)}%`
                      : "Not available"}
                  </strong>

                </div>


                <div className="authority-ai-processing-status">

                  <span>
                    ●
                  </span>

                  AI processing completed

                </div>

              </div>

            </div>

          </section>


          {/* =================================================
              ASSOCIATE DEAN ACTIONS
          ================================================= */}

          {grievance.routing?.can_forward && (
          <section className="authority-content-card authority-role-actions">


            <div className="authority-card-header">

              <div>

                <h2>
                  Associate Dean Actions
                </h2>

                <span>
                  Final Administrative Review
                </span>

              </div>

            </div>


            <div className="authority-card-body">


              <div className="authority-action-info">

                <strong>
                  Current Level: Associate Dean
                </strong>

                <p>
                  Review the grievance and forward it
                  to the Dean when final administrative
                  consideration is required.
                </p>

              </div>


              <div className="authority-detail-field full">

                <label htmlFor="remarks">
                  Remarks
                </label>


                <textarea
                  id="remarks"
                  value={remarks}
                  onChange={(e) =>
                    setRemarks(
                      e.target.value
                    )
                  }
                  placeholder="Add remarks before forwarding..."
                  rows="4"
                  disabled={actionLoading}
                />

              </div>


              <div className="authority-action-buttons">

                <button
                  type="button"
                  className="authority-primary-button"
                  onClick={
                    handleForwardToDean
                  }
                  disabled={
                    actionLoading ||
                    grievance.status !==
                      "ESCALATED"
                  }
                >

                  {actionLoading
                    ? "Forwarding..."
                    : "Forward to Dean →"}

                </button>

              </div>

            </div>

          </section>
          )}


          {/* =================================================
              TIMELINE
          ================================================= */}

          <section className="authority-content-card authority-timeline-card">


            <div className="authority-section-header">

              <div>

                <h2>
                  Grievance Timeline
                </h2>

                <p>
                  Track every status update
                  related to this grievance.
                </p>

              </div>


              <span className="authority-timeline-count">

                {history.length}{" "}

                {history.length === 1
                  ? "event"
                  : "events"}

              </span>

            </div>


            <div className="authority-timeline">


              {history.length === 0 ? (

                <div className="authority-timeline-empty">
                  No status history available.
                </div>

              ) : (

                history.map(
                  (event, index) => (

                    <div
                      className="authority-timeline-item"
                      key={
                        event.id ||
                        `${event.created_at}-${index}`
                      }
                    >

                      <div className="authority-timeline-marker">
                        ✓
                      </div>


                      <div className="authority-timeline-content">

                        <div className="authority-timeline-top">

                          <strong>
                            {formatStatus(
                              event.new_status
                            )}
                          </strong>

                          <span>
                            {formatDateTime(
                              event.created_at
                            )}
                          </span>

                        </div>


                        {event.reason && (

                          <p>
                            {event.reason}
                          </p>

                        )}

                      </div>

                    </div>

                  )
                )

              )}

            </div>

          </section>


        </main>

      </div>

    </div>

  );

}


export default AssociateDeanGrievanceDetail;