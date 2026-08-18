import { useEffect, useState } from "react";
import {
  Link,
  useParams,
  useNavigate,
} from "react-router-dom";

import {
  getGrievance,
  getGrievanceHistory,
} from "../services/grievanceService";

import {
  getCurrentUser,
  logoutUser,
} from "../services/authService";


function GrievanceDetail() {

  const { grievanceId } = useParams();
  const navigate = useNavigate();

  const [grievance, setGrievance] = useState(null);
  const [history, setHistory] = useState([]);
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  /* =====================================================
     LOAD DATA
  ====================================================== */

  useEffect(() => {
    loadGrievance();
  }, [grievanceId]);


  const loadGrievance = async () => {

    try {

      setLoading(true);
      setError("");

      const [
        grievanceData,
        historyData,
      ] = await Promise.all([
        getGrievance(grievanceId),
        getGrievanceHistory(grievanceId),
      ]);

      setGrievance(grievanceData);
      setHistory(historyData);


      try {

        const currentUser =
          await getCurrentUser();

        setUser(currentUser);

      } catch (userError) {

        console.warn(
          "Unable to load current user:",
          userError
        );

      }

    } catch (err) {

      console.error(
        "Grievance detail error:",
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
        "Unable to load grievance."
      );

    } finally {

      setLoading(false);

    }

  };


  /* =====================================================
     FORMATTERS
  ====================================================== */

  const formatDate = (date) => {

    if (!date) {
      return "-";
    }

    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );

  };


  const formatDateTime = (date) => {

    if (!date) {
      return "-";
    }

    return new Date(date).toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
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


  const getStatusClass = (status) => {

    if (!status) {
      return "";
    }

    return status
      .toLowerCase()
      .replaceAll(
        "_",
        "-"
      );

  };


  const getUserName = () => {

    if (!user) {
      return "Applicant";
    }

    return (
      user.full_name ||
      user.name ||
      user.email?.split("@")[0] ||
      "Applicant"
    );

  };


  const getInitial = () => {

    const name =
      getUserName();

    return name
      .charAt(0)
      .toUpperCase();

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

      <div className="applicant-page">


        {/* HEADER */}

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
                {getUserName()}
              </strong>

              <span>
                APPLICANT
              </span>

            </div>


            <div className="applicant-user-avatar">
              {getInitial()}
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


        {/* BODY */}

        <div className="applicant-body">


          {/* SIDEBAR */}

          <aside className="applicant-sidebar">

            <div className="applicant-sidebar-label">
              APPLICANT
            </div>


            <nav className="applicant-sidebar-nav">

              <Link
                to="/dashboard"
                className="applicant-nav-item"
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
                className="applicant-nav-item active"
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


          <main className="applicant-main">

            <div className="applicant-state-card error">

              <div className="applicant-state-icon error">
                !
              </div>

              <h2>
                Unable to load grievance
              </h2>

              <p>
                {error}
              </p>

              <Link
                to="/dashboard/grievances"
                className="applicant-primary-button"
              >
                ← Back to My Grievances
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


  /* =====================================================
     USER DATA
  ====================================================== */

  const userName =
    getUserName();

  const userInitial =
    getInitial();


  /* =====================================================
     MAIN PAGE
  ====================================================== */

  return (

    <div className="applicant-page">


      {/* =================================================
          SAME HEADER
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
              APPLICANT
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
          SAME BODY
      ================================================= */}

      <div className="applicant-body">


        {/* =================================================
            SAME SIDEBAR
        ================================================= */}

        <aside className="applicant-sidebar">

          <div className="applicant-sidebar-label">
            APPLICANT
          </div>


          <nav className="applicant-sidebar-nav">


            <Link
              to="/dashboard"
              className="applicant-nav-item"
            >

              <span className="applicant-nav-icon">
                ▦
              </span>

              <span>
                Dashboard
              </span>

            </Link>


            {/* ACTIVE BECAUSE DETAIL BELONGS
                TO MY GRIEVANCES */}

            <Link
              to="/dashboard/grievances"
              className="applicant-nav-item active"
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
            MAIN
        ================================================= */}

        <main className="applicant-main">


          {/* =================================================
              BACK
          ================================================= */}

          <Link
            to="/dashboard/grievances"
            className="applicant-back-link"
          >
            ← Back to My Grievances
          </Link>


          {/* =================================================
              PAGE HEADER
          ================================================= */}

          <section className="applicant-detail-header">

            <div className="applicant-detail-title">

              <span className="applicant-detail-id">
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
              className={`applicant-status-badge large ${getStatusClass(
                grievance.status
              )}`}
            >
              {formatStatus(
                grievance.status
              )}
            </span>

          </section>


          {/* =================================================
              DETAILS + AI
          ================================================= */}

          <section className="applicant-detail-grid">


            {/* GRIEVANCE DETAILS */}

            <div className="applicant-content-card">

              <div className="applicant-card-header">

                <h2>
                  Grievance Details
                </h2>

              </div>


              <div className="applicant-card-body">


                <div className="applicant-detail-field full">

                  <label>
                    TITLE
                  </label>

                  <p>
                    {grievance.title}
                  </p>

                </div>


                <div className="applicant-detail-field full">

                  <label>
                    DESCRIPTION
                  </label>

                  <p className="applicant-description">
                    {grievance.description}
                  </p>

                </div>


                <div className="applicant-detail-fields-row">


                  <div className="applicant-detail-field">

                    <label>
                      PRIORITY
                    </label>

                    <span
                      className={`applicant-priority ${
                        grievance.priority?.toLowerCase()
                      }`}
                    >
                      {grievance.priority}
                    </span>

                  </div>


                  <div className="applicant-detail-field">

                    <label>
                      SUBMITTED
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

            <div className="applicant-content-card applicant-ai-analysis-card">


              <div className="applicant-card-header">

                <div className="applicant-ai-title">

                  <div className="applicant-ai-small-icon">
                    AI
                  </div>

                  <h2>
                    AI Analysis
                  </h2>

                </div>

              </div>


              <div className="applicant-card-body">


                <div className="applicant-ai-result-row">

                  <span>
                    Category
                  </span>

                    <strong>
                    {grievance.category?.name || "Not classified"}
                    </strong>


                </div>


                <div className="applicant-ai-result-row">

                  <span>
                    Cluster
                  </span>

                  <strong>
                  {grievance.cluster?.name || "Not assigned"}
                  </strong>

                </div>


                <div className="applicant-ai-result-row">

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


                <div className="applicant-ai-processing-status">

                  <span>
                    ●
                  </span>

                  {grievance.status ===
                    "SUBMITTED" &&
                    "Waiting for AI processing"}

                  {grievance.status ===
                    "AI_PROCESSING" &&
                    "AI processing in progress"}

                  {grievance.status ===
                    "PENDING_REVIEW" &&
                    "AI processing completed"}

                  {grievance.status ===
                    "IN_PROGRESS" &&
                    "AI processing completed"}

                  {grievance.status ===
                    "RESOLVED" &&
                    "AI processing completed"}

                  {grievance.status ===
                    "CLOSED" &&
                    "AI processing completed"}

                </div>

              </div>

            </div>

          </section>


          {/* =================================================
              TIMELINE
          ================================================= */}

          <section className="applicant-content-card applicant-timeline-card">


            <div className="applicant-section-header">

              <div>

                <h2>
                  Grievance Timeline
                </h2>

                <p>
                  Track every status update
                  related to this grievance.
                </p>

              </div>


              <span className="applicant-timeline-count">
                {history.length}{" "}
                {history.length === 1
                  ? "event"
                  : "events"}
              </span>

            </div>


            <div className="applicant-timeline">


              {history.length === 0 ? (

                <div className="applicant-timeline-empty">
                  No status history available.
                </div>

              ) : (

                history.map(
                  (event, index) => (

                    <div
                      className="applicant-timeline-item"
                      key={
                        event.id ||
                        `${event.created_at}-${index}`
                      }
                    >

                      <div className="applicant-timeline-marker">
                        ✓
                      </div>


                      <div className="applicant-timeline-content">

                        <div className="applicant-timeline-top">

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


          {/* =================================================
              AI FOOTER
          ================================================= */}

          <section className="applicant-ai-footer">

            <div className="applicant-ai-footer-icon">
              AI
            </div>


            <div className="applicant-ai-footer-content">

              <span>
                AI-ASSISTED GRIEVANCE MANAGEMENT
              </span>

              <h3>
                NIVARAN-AI Intelligence
              </h3>

              <p>
                Your grievance is analyzed using
                AI-assisted classification and
                semantic clustering before entering
                the administrative review workflow.
              </p>

            </div>


            <div className="applicant-ai-active-pill">
              ● AI System Active
            </div>

          </section>


        </main>

      </div>

    </div>

  );

}


export default GrievanceDetail;