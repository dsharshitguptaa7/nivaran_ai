import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";

import { apiRequest } from "../services/api";


function DeanGrievanceDetail() {

  const { grievanceId } = useParams();
  const navigate = useNavigate();

  const [grievance, setGrievance] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [decision, setDecision] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);


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

      /*
        Backend endpoint can be connected here.

        For now we keep a fallback object so that
        the UI can be developed independently.
      */

      try {

        const data = await apiRequest(
          `/grievances/${grievanceId}`
        );

        setGrievance(data);

      } catch (backendError) {

        console.warn(
          "Using temporary grievance data:",
          backendError
        );

        setGrievance({
          grievance_id: grievanceId,
          title:
            "Research scholarship payment delayed",

          description:
            "My research scholarship payment for the current month has not been credited to my account.",

          category:
            "Research / Fellowship",

          cluster:
            "Scholarship / Fellowship",

          priority:
            "HIGH",

          status:
            "PENDING_APPROVAL",

          ai_confidence:
            91.42,

          submitted_at:
            "12 Aug 2026",

          submitted_by:
            "Test Applicant",

          department:
            "Department of Mathematics",

          referred_by:
            "Associate Dean",

          assigned_to:
            "Dean R&D",

          timeline: [

            {
              status: "SUBMITTED",
              description:
                "Grievance submitted by applicant.",
              date:
                "12 Aug 2026, 01:06 PM",
            },

            {
              status: "AI_PROCESSING",
              description:
                "AI classification and semantic clustering completed.",
              date:
                "12 Aug 2026, 05:51 PM",
            },

            {
              status: "PENDING_REVIEW",
              description:
                "Grievance reviewed at administrative level.",
              date:
                "12 Aug 2026, 05:51 PM",
            },

            {
              status: "ESCALATED",
              description:
                "Case referred for higher-level administrative review.",
              date:
                "12 Aug 2026, 05:52 PM",
            },

            {
              status: "PENDING_APPROVAL",
              description:
                "Dean R&D decision is required.",
              date:
                "13 Aug 2026, 10:20 AM",
            },

          ],

        });

      }

    } catch (err) {

      console.error(err);

      setError(
        err?.message ||
        "Unable to load grievance."
      );

    } finally {

      setLoading(false);

    }

  }


  // =====================================================
  // FORMAT HELPERS
  // =====================================================

  function formatStatus(status) {

    if (!status) return "-";

    return status
      .replaceAll("_", " ");

  }


  function statusClass(status) {

    if (!status) return "";

    return status
      .toLowerCase()
      .replaceAll("_", "-");

  }


  // =====================================================
  // DECISION
  // =====================================================

  async function handleDecision(e) {

    e.preventDefault();

    if (!decision) {

      setError(
        "Please select a decision."
      );

      return;

    }


    if (!remarks.trim()) {

      setError(
        "Please enter decision remarks."
      );

      return;

    }


    try {

      setSubmitting(true);
      setError("");

      /*
        Backend decision endpoint will be connected
        once the final API is available.

        Example structure:

        await apiRequest(
          `/dean/grievances/${grievanceId}/decision`,
          {
            method: "POST",
            body: {
              decision,
              remarks
            }
          }
        );
      */


      console.log(
        "Dean decision:",
        {
          grievanceId,
          decision,
          remarks,
        }
      );


      // Temporary UI update

      setGrievance((previous) => ({
        ...previous,

        status: decision,
      }));


      setDecision("");
      setRemarks("");

    } catch (err) {

      console.error(err);

      setError(
        err?.message ||
        "Unable to record decision."
      );

    } finally {

      setSubmitting(false);

    }

  }


  // =====================================================
  // LOGOUT
  // =====================================================

  function handleLogout() {

    localStorage.removeItem(
      "access_token"
    );

    window.location.href =
      "/authority/login";

  }


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (

      <div className="dashboard-page">

        <aside className="dashboard-sidebar">

          <Link
            to="/"
            className="dashboard-logo"
          >
            NIVARAN<span>-AI</span>
          </Link>

        </aside>


        <main className="dashboard-main">

          <div className="detail-loading">
            Loading grievance...
          </div>

        </main>

      </div>

    );

  }


  // =====================================================
  // ERROR
  // =====================================================

  if (error && !grievance) {

    return (

      <div className="dashboard-page">

        <main className="dashboard-main">

          <div className="dashboard-error">
            {error}
          </div>

          <Link
            to="/dean"
            className="secondary-button"
          >
            ← Back to Dashboard
          </Link>

        </main>

      </div>

    );

  }


  // =====================================================
  // MAIN
  // =====================================================

  return (

    <div className="dashboard-page">


      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className="dashboard-sidebar">

        <Link
          to="/"
          className="dashboard-logo"
        >
          NIVARAN<span>-AI</span>
        </Link>


        <div className="sidebar-role">

          <span>
            UNIVERSITY AUTHORITY
          </span>

          <strong>
            DEAN R&D
          </strong>

        </div>


        <nav className="dashboard-nav">

          <Link
            to="/dean"
            className="dashboard-nav-item"
          >
            <span>⌂</span>
            Dashboard
          </Link>


          <Link
            to="/dean/grievances"
            className="dashboard-nav-item active"
          >
            <span>▤</span>
            All Grievances
          </Link>


          <Link
            to="/dean/approvals"
            className="dashboard-nav-item"
          >
            <span>✓</span>
            Pending Approvals
          </Link>


          <Link
            to="/dean/analytics"
            className="dashboard-nav-item"
          >
            <span>◉</span>
            Analytics
          </Link>


          <Link
            to="/dean/history"
            className="dashboard-nav-item"
          >
            <span>◷</span>
            Decision History
          </Link>

        </nav>


        {/* SIDEBAR USER */}

        <div className="sidebar-bottom">

          <div className="user-mini">

            <div className="user-avatar">
              D
            </div>

            <div>

              <strong>
                Dean R&D
              </strong>

              <span>
                UNIVERSITY AUTHORITY
              </span>

            </div>

          </div>


          <button
            type="button"
            className="logout-link"
            onClick={handleLogout}
          >
            ↪ Logout
          </button>

        </div>

      </aside>


      {/* =================================================
          MAIN
      ================================================= */}

      <main className="dashboard-main">


        {/* =================================================
            BACK LINK
        ================================================= */}

        <Link
          to="/dean"
          className="detail-back-link"
        >
          ← Back to Dashboard
        </Link>


        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <header className="detail-page-header">

          <div>

            <span className="detail-grievance-id">
              {grievance.grievance_id}
            </span>


            <h1>
              {grievance.title}
            </h1>


            <p>
              Submitted on{" "}
              {grievance.submitted_at}
            </p>

          </div>


          <span
            className={`detail-status-badge ${
              statusClass(
                grievance.status
              )
            }`}
          >
            {formatStatus(
              grievance.status
            )}
          </span>

        </header>


        {/* =================================================
            ERROR
        ================================================= */}

        {error && (

          <div className="dashboard-error">
            {error}
          </div>

        )}


        {/* =================================================
            DETAILS + AI
        ================================================= */}

        <div className="detail-top-grid">


          {/* GRIEVANCE DETAILS */}

          <section className="detail-card">

            <div className="detail-card-header">

              <h2>
                Grievance Details
              </h2>

            </div>


            <div className="detail-card-body">


              <div className="detail-field">

                <span>
                  TITLE
                </span>

                <strong>
                  {grievance.title}
                </strong>

              </div>


              <div className="detail-field">

                <span>
                  DESCRIPTION
                </span>

                <p>
                  {grievance.description}
                </p>

              </div>


              <div className="detail-meta-grid">


                <div className="detail-field">

                  <span>
                    CATEGORY
                  </span>

                  <strong>
                    {grievance.category ||
                      "Not classified"}
                  </strong>

                </div>


                <div className="detail-field">

                  <span>
                    CLUSTER
                  </span>

                  <strong>
                    {grievance.cluster ||
                      "Not assigned"}
                  </strong>

                </div>


                <div className="detail-field">

                  <span>
                    PRIORITY
                  </span>

                  <strong
                    className={`priority ${
                      grievance.priority
                        ?.toLowerCase() ||
                      ""
                    }`}
                  >
                    {grievance.priority}
                  </strong>

                </div>


                <div className="detail-field">

                  <span>
                    DEPARTMENT
                  </span>

                  <strong>
                    {grievance.department ||
                      "-"}
                  </strong>

                </div>


              </div>


              <div className="detail-submission-info">

                <div>

                  <span>
                    Submitted By
                  </span>

                  <strong>
                    {grievance.submitted_by}
                  </strong>

                </div>


                <div>

                  <span>
                    Referred By
                  </span>

                  <strong>
                    {grievance.referred_by ||
                      "-"}
                  </strong>

                </div>


                <div>

                  <span>
                    Assigned To
                  </span>

                  <strong>
                    {grievance.assigned_to ||
                      "-"}
                  </strong>

                </div>

              </div>

            </div>

          </section>


          {/* AI ANALYSIS */}

          <section className="detail-card ai-analysis-card">

            <div className="detail-card-header">

              <div className="ai-card-title">

                <div className="ai-detail-icon">
                  AI
                </div>

                <h2>
                  AI Analysis
                </h2>

              </div>

            </div>


            <div className="detail-card-body">


              <div className="ai-detail-row">

                <span>
                  Category
                </span>

                <strong>
                  {grievance.category ||
                    "Not classified"}
                </strong>

              </div>


              <div className="ai-detail-row">

                <span>
                  Semantic Cluster
                </span>

                <strong>
                  {grievance.cluster ||
                    "Not assigned"}
                </strong>

              </div>


              <div className="ai-detail-row">

                <span>
                  AI Confidence
                </span>

                <strong>
                  {grievance.ai_confidence
                    ? `${grievance.ai_confidence}%`
                    : "Not available"}
                </strong>

              </div>


              <div className="ai-advisory-box">

                <span>
                  •
                </span>

                <div>

                  <strong>
                    AI Decision Support
                  </strong>

                  <p>
                    AI analysis is advisory.
                    Final administrative decisions
                    remain with the authorized
                    university authority.
                  </p>

                </div>

              </div>

            </div>

          </section>

        </div>


        {/* =================================================
            TIMELINE
        ================================================= */}

        <section className="detail-card timeline-card">

          <div className="detail-card-header">

            <h2>
              Grievance Timeline
            </h2>

            <span>
              {grievance.timeline?.length || 0}
              {" "}events
            </span>

          </div>


          <div className="timeline-body">

            {grievance.timeline?.map(
              (event, index) => (

                <div
                  className="timeline-item"
                  key={index}
                >

                  <div className="timeline-marker">
                    ✓
                  </div>


                  <div className="timeline-content">

                    <strong>
                      {formatStatus(
                        event.status
                      )}
                    </strong>

                    <p>
                      {event.description}
                    </p>

                    <span>
                      {event.date}
                    </span>

                  </div>

                </div>

              )
            )}

          </div>

        </section>


        {/* =================================================
            DEAN DECISION
        ================================================= */}

        {grievance.status ===
          "PENDING_APPROVAL" && (

          <section className="detail-card dean-decision-card">

            <div className="detail-card-header">

              <div>

                <h2>
                  Dean Decision
                </h2>

                <p>
                  Record the institutional-level
                  decision for this grievance.
                </p>

              </div>

              <span className="decision-required-badge">
                ACTION REQUIRED
              </span>

            </div>


            <form
              className="decision-form"
              onSubmit={handleDecision}
            >


              {/* DECISION OPTIONS */}

              <div className="decision-options">

                <label
                  className={
                    decision === "APPROVED"
                      ? "decision-option selected"
                      : "decision-option"
                  }
                >

                  <input
                    type="radio"
                    name="decision"
                    value="APPROVED"
                    checked={
                      decision === "APPROVED"
                    }
                    onChange={(e) =>
                      setDecision(
                        e.target.value
                      )
                    }
                  />

                  <div>

                    <strong>
                      Approve / Accept
                    </strong>

                    <span>
                      Approve the recommended
                      administrative resolution.
                    </span>

                  </div>

                </label>


                <label
                  className={
                    decision === "RETURNED"
                      ? "decision-option selected"
                      : "decision-option"
                  }
                >

                  <input
                    type="radio"
                    name="decision"
                    value="RETURNED"
                    checked={
                      decision === "RETURNED"
                    }
                    onChange={(e) =>
                      setDecision(
                        e.target.value
                      )
                    }
                  />

                  <div>

                    <strong>
                      Return for Clarification
                    </strong>

                    <span>
                      Send the grievance back for
                      additional information or review.
                    </span>

                  </div>

                </label>


                <label
                  className={
                    decision === "ESCALATED"
                      ? "decision-option selected"
                      : "decision-option"
                  }
                >

                  <input
                    type="radio"
                    name="decision"
                    value="ESCALATED"
                    checked={
                      decision === "ESCALATED"
                    }
                    onChange={(e) =>
                      setDecision(
                        e.target.value
                      )
                    }
                  />

                  <div>

                    <strong>
                      Escalate Further
                    </strong>

                    <span>
                      Refer the matter for additional
                      institutional intervention.
                    </span>

                  </div>

                </label>

              </div>


              {/* REMARKS */}

              <div className="form-group">

                <label htmlFor="remarks">
                  Decision Remarks *
                </label>

                <textarea
                  id="remarks"
                  rows={5}
                  value={remarks}
                  onChange={(e) =>
                    setRemarks(
                      e.target.value
                    )
                  }
                  placeholder="Enter the reasoning, instructions or remarks associated with your decision..."
                  disabled={submitting}
                />

              </div>


              {/* ACTIONS */}

              <div className="decision-actions">

                <Link
                  to="/dean"
                  className="secondary-button"
                >
                  Cancel
                </Link>


                <button
                  type="submit"
                  className="dashboard-primary-button"
                  disabled={submitting}
                >
                  {submitting
                    ? "Recording Decision..."
                    : "Record Decision →"}
                </button>

              </div>


            </form>

          </section>

        )}


        {/* =================================================
            AI FOOTER
        ================================================= */}

        <section className="ai-info-card">

          <div className="ai-info-icon">
            AI
          </div>


          <div className="ai-info-content">

            <div className="ai-eyebrow">
              AI-ASSISTED GRIEVANCE MANAGEMENT
            </div>

            <h3>
              NIVARAN-AI Intelligence
            </h3>

            <p>
              AI-assisted classification and semantic
              clustering support administrative review.
              The final grievance decision remains under
              authorized human control.
            </p>

          </div>


          <div className="ai-active">
            • AI System Active
          </div>

        </section>


      </main>

    </div>

  );

}


export default DeanGrievanceDetail;