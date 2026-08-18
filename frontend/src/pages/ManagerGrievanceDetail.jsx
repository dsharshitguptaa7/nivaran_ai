import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  getGrievance,
  getGrievanceHistory,
  reviewAIRecommendation,
  getCategories,
} from "../services/grievanceService";

import {
  getCurrentUser,
  logoutUser,
} from "../services/authService";


function ManagerGrievanceDetail() {

  const { grievanceId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  const [grievance, setGrievance] = useState(null);
  const [history, setHistory] = useState([]);

  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [actionLoading, setActionLoading] =
    useState(false);

  const [actionMessage, setActionMessage] =
    useState("");

  const [actionError, setActionError] =
    useState("");

  const [remarks, setRemarks] =
    useState("");

  // =====================================================
  // AI REVIEW STATE
  // =====================================================

  const [reviewLoading, setReviewLoading] =
    useState(false);

  const [reviewMode, setReviewMode] =
    useState(null);

  const [selectedCategoryId, setSelectedCategoryId] =
    useState("");

  const [reviewError, setReviewError] =
    useState("");

  const [reviewMessage, setReviewMessage] =
    useState("");


  // =====================================================
  // LOAD GRIEVANCE
  // =====================================================

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
        categoriesData,
      ] = await Promise.all([
        getGrievance(grievanceId),
        getGrievanceHistory(grievanceId),
        getCurrentUser(),
        getCategories(),
      ]);

      setGrievance(grievanceData);
      setHistory(historyData);
      setUser(currentUser);
      setCategories(categoriesData || []);

    } catch (err) {

      console.error(
        "Manager grievance detail error:",
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
        "Unable to load grievance."
      );

    } finally {

      setLoading(false);

    }

  }


  // =====================================================
  // FORMATTERS
  // =====================================================

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

    return status.replaceAll("_", " ");

  };


  const getStatusClass = (status) => {

    if (!status) {
      return "";
    }

    return status
      .toLowerCase()
      .replaceAll("_", "-");

  };


  // =====================================================
  // USER
  // =====================================================

  const userName =
    user?.full_name ||
    user?.name ||
    "Manager";

  const userRole =
    user?.role
      ? user.role.replaceAll("_", " ")
      : "MANAGER";

  const userInitial =
    userName.charAt(0).toUpperCase();


  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {

    logoutUser();
    navigate("/authority/login");

  };


  // =====================================================
  // ACCEPT AI CATEGORY
  // =====================================================

  async function handleAcceptAI() {

    if (
      !grievance ||
      !grievance.category_id
    ) {
      return;
    }

    try {

      setReviewLoading(true);
      setReviewError("");
      setReviewMessage("");

      const response =
        await reviewAIRecommendation(
          grievance.grievance_id,
          grievance.category_id,
          "CONFIRMED"
        );

      setGrievance(response);

      setReviewMessage(
        "AI category has been successfully confirmed."
      );

      setReviewMode(null);

    } catch (err) {

      console.error(
        "AI category confirmation error:",
        err
      );

      setReviewError(
        err?.message ||
        "Unable to confirm AI category."
      );

    } finally {

      setReviewLoading(false);

    }

  }


  // =====================================================
  // OPEN OVERRIDE
  // =====================================================

  function handleOpenOverride() {

    setReviewError("");
    setReviewMessage("");

    setSelectedCategoryId(
      grievance?.final_category_id ||
      grievance?.category_id ||
      ""
    );

    setReviewMode("override");

  }


  // =====================================================
  // CANCEL OVERRIDE
  // =====================================================

  function handleCancelOverride() {

    setReviewMode(null);
    setSelectedCategoryId("");
    setReviewError("");
    setReviewMessage("");

  }


  // =====================================================
  // CONFIRM OVERRIDE
  // =====================================================

  async function handleConfirmOverride() {

    if (
      !grievance ||
      !selectedCategoryId
    ) {
      setReviewError(
        "Please select a final category."
      );

      return;
    }

    try {

      setReviewLoading(true);
      setReviewError("");
      setReviewMessage("");

      const response =
        await reviewAIRecommendation(
          grievance.grievance_id,
          selectedCategoryId,
          "OVERRIDDEN"
        );

      setGrievance(response);

      setReviewMessage(
        "Category has been successfully overridden."
      );

      setReviewMode(null);
      setSelectedCategoryId("");

    } catch (err) {

      console.error(
        "Category override error:",
        err
      );

      setReviewError(
        err?.message ||
        "Unable to override category."
      );

    } finally {

      setReviewLoading(false);

    }

  }


  // =====================================================
  // FORWARD TO ASSISTANT DEAN
  // =====================================================

  async function handleForwardToAssistantDean() {

    if (!grievance) {
      return;
    }

    // Manager must review category first
    if (!grievance.category_reviewed) {

      setActionError(
        "Please review and confirm the grievance category before forwarding."
      );

      return;

    }

    const confirmed =
      window.confirm(
        "Forward this grievance to Assistant Dean?"
      );

    if (!confirmed) {
      return;
    }

    try {

      setActionLoading(true);
      setActionMessage("");
      setActionError("");

      const response =
        await fetch(
          `http://127.0.0.1:8000/api/v1/grievances/${grievance.grievance_id}/escalate`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${localStorage.getItem(
                  "access_token"
                )}`,
            },

            body: JSON.stringify({
              reason:
                "Additional administrative review is required.",

              remarks:
                remarks ||
                "Forwarding to Assistant Dean.",
            }),

          }
        );

      let data = null;

      try {

        data =
          await response.json();

      } catch {

        data = null;

      }

      if (!response.ok) {

        throw new Error(
          data?.detail ||
          "Failed to forward grievance."
        );

      }

      setGrievance(data);
      setRemarks("");

      setActionMessage(
        "Grievance successfully forwarded to Assistant Dean."
      );

      const updatedHistory =
        await getGrievanceHistory(
          grievance.grievance_id
        );

      setHistory(updatedHistory);

    } catch (err) {

      console.error(
        "Forward grievance error:",
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


  // =====================================================
  // LOADING
  // =====================================================

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


  // =====================================================
  // ERROR
  // =====================================================

  if (error) {

    return (

      <div className="authority-page">

        <header className="authority-header">

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


        <div className="authority-body">

          <aside className="authority-sidebar">

            <div className="authority-sidebar-label">
              MANAGER PORTAL
            </div>

            <nav className="authority-sidebar-nav">

              <Link
                to="/manager"
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
                to="/manager/grievances"
                className="authority-nav-item active"
              >
                <span className="authority-nav-icon">
                  ≡
                </span>

                <span>
                  All Grievances
                </span>
              </Link>


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
                to="/manager"
                className="authority-primary-button"
              >
                ← Back to Manager Dashboard
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


  // =====================================================
  // MAIN UI
  // =====================================================

  return (

    <div className="authority-page">


      {/* =================================================
          HEADER
      ================================================= */}

      <header className="authority-header">

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

            <Link
              to="/manager"
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
              to="/manager/grievances"
              className="authority-nav-item active"
            >

              <span className="authority-nav-icon">
                ≡
              </span>

              <span>
                All Grievances
              </span>

            </Link>


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

        </aside>


        {/* =================================================
            MAIN
        ================================================= */}

        <main className="authority-main">


          <Link
            to="/manager"
            className="authority-back-link"
          >
            ← Back to Manager Dashboard
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
                getStatusClass(
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
              ACTION MESSAGES
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
              AI REVIEW MESSAGES
          ================================================= */}

          {reviewMessage && (

            <div className="authority-success">

              <span>
                ✓
              </span>

              <p>
                {reviewMessage}
              </p>

            </div>

          )}


          {reviewError && (

            <div className="authority-error">

              <span>
                !
              </span>

              <p>
                {reviewError}
              </p>

            </div>

          )}


          {/* =================================================
              DETAILS + AI
          ================================================= */}

          <section className="authority-detail-grid">


            {/* =================================================
                GRIEVANCE DETAILS
            ================================================= */}

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


            {/* =================================================
                AI ANALYSIS
            ================================================= */}

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


                {/* AI CATEGORY */}

                <div className="authority-ai-result-row">

                  <span>
                    AI Predicted Category
                  </span>

                  <strong>
                    {grievance.category?.name ||
                      "Not classified"}
                  </strong>

                </div>


                {/* AI CONFIDENCE */}

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


                {/* AI PROCESSING STATUS */}

                <div className="authority-ai-processing-status">

                  <span>
                    ●
                  </span>

                  {grievance.status ===
                    "SUBMITTED" &&
                    "Waiting for AI processing"}

                  {grievance.status ===
                    "AI_PROCESSING" &&
                    "AI processing in progress"}

                  {grievance.status !==
                    "SUBMITTED" &&
                    grievance.status !==
                    "AI_PROCESSING" &&
                    "AI processing completed"}

                </div>


                {/* =================================================
                    CATEGORY REVIEW
                ================================================= */}

                <div className="authority-category-review">

                  <div className="authority-review-heading">

                    <strong>
                      Category Review
                    </strong>

                    <span>
                      {grievance.category_reviewed
                        ? "Review completed"
                        : "Manager decision required"}
                    </span>

                  </div>


                  {!grievance.category_reviewed && (
                    <>
                      {reviewMode !== "override" ? (

                        <div className="authority-action-buttons">

                          <button
                            type="button"
                            className="authority-primary-button"
                            onClick={handleAcceptAI}
                            disabled={
                              reviewLoading ||
                              !grievance.category_id
                            }
                          >

                            {reviewLoading
                              ? "Confirming..."
                              : "✓ Accept AI Category"}

                          </button>


                          <button
                            type="button"
                            className="authority-secondary-button"
                            onClick={
                              handleOpenOverride
                            }
                            disabled={
                              reviewLoading
                            }
                          >

                            ↻ Override Category

                          </button>

                        </div>

                      ) : (

                        <div className="authority-category-override">

                          <div className="authority-detail-field full">

                            <label htmlFor="final-category">

                              Select Final Category

                            </label>

                            <select
                              id="final-category"
                              value={
                                selectedCategoryId
                              }
                              onChange={(e) =>
                                setSelectedCategoryId(
                                  e.target.value
                                )
                              }
                              disabled={
                                reviewLoading
                              }
                            >

                              <option value="">
                                Select category
                              </option>

                              {categories.map(
                                (category) => (

                                  <option
                                    key={category.id}
                                    value={category.id}
                                  >
                                    {category.name}
                                  </option>

                                )
                              )}

                            </select>

                          </div>


                          <div className="authority-action-buttons">

                            <button
                              type="button"
                              className="authority-secondary-button"
                              onClick={
                                handleCancelOverride
                              }
                              disabled={
                                reviewLoading
                              }
                            >
                              Cancel
                            </button>


                            <button
                              type="button"
                              className="authority-primary-button"
                              onClick={
                                handleConfirmOverride
                              }
                              disabled={
                                reviewLoading ||
                                !selectedCategoryId
                              }
                            >

                              {reviewLoading
                                ? "Saving..."
                                : "Confirm Override"}

                            </button>

                          </div>

                        </div>

                      )}
                    </>
                  )}


                  {/* =================================================
                      REVIEWED RESULT
                  ================================================= */}

                  {grievance.category_reviewed && (

                    <div className="authority-reviewed-category">

                      <div className="authority-ai-result-row">

                        <span>
                          AI Category
                        </span>

                        <strong>
                          {grievance.category?.name ||
                            "Not available"}
                        </strong>

                      </div>


                      <div className="authority-ai-result-row">

                        <span>
                          Final Category
                        </span>

                        <strong>
                          {grievance.final_category?.name ||
                            "Not available"}
                        </strong>

                      </div>


                      <div className="authority-ai-processing-status">

                        <span>
                          {grievance.category_overridden
                            ? "⚠"
                            : "✓"}
                        </span>

                        {grievance.category_overridden
                          ? "Category overridden by Manager"
                          : "AI category confirmed by Manager"}

                      </div>

                    </div>

                  )}

                </div>

              </div>

            </div>

          </section>


          {/* =================================================
              MANAGER ACTIONS
          ================================================= */}

          <section className="authority-content-card authority-manager-actions">

            <div className="authority-card-header">

              <div>

                <h2>
                  Manager Actions
                </h2>

                <span>
                  Administrative Review
                </span>

              </div>

            </div>


            <div className="authority-card-body">


              <div className="authority-action-info">

                <strong>
                  Current Level: Manager
                </strong>

                <p>
                  {grievance.category_reviewed
                    ? "Category review is complete. The grievance can now proceed for administrative review."
                    : "Please review the AI predicted category before forwarding this grievance."}
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
                    setRemarks(e.target.value)
                  }
                  placeholder="Add remarks before forwarding..."
                  rows="4"
                  disabled={
                    actionLoading ||
                    !grievance.category_reviewed
                  }
                />

              </div>


              <div className="authority-action-buttons">

                <button
                  type="button"
                  className="authority-primary-button"
                  onClick={
                    handleForwardToAssistantDean
                  }
                  disabled={
                    actionLoading ||
                    !grievance.category_reviewed ||
                    grievance.status === "CLOSED" ||
                    grievance.status === "RESOLVED"
                  }
                >

                  {actionLoading
                    ? "Forwarding..."
                    : "Forward to Assistant Dean →"}

                </button>

              </div>

            </div>

          </section>


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


export default ManagerGrievanceDetail;