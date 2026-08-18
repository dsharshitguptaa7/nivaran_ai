import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { createGrievance } from "../services/grievanceService";


function SubmitGrievance() {

  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  /* =====================================================
     SUBMIT GRIEVANCE
  ====================================================== */

  const handleSubmit = async (e) => {

    e.preventDefault();

    setError("");


    /* TITLE VALIDATION */

    if (title.trim().length < 5) {

      setError(
        "Title must contain at least 5 characters."
      );

      return;

    }


    /* DESCRIPTION VALIDATION */

    if (description.trim().length < 20) {

      setError(
        "Description must contain at least 20 characters."
      );

      return;

    }


    try {

      setLoading(true);


      const grievance =
        await createGrievance(
          title.trim(),
          description.trim()
        );


      console.log(
        "Grievance created:",
        grievance
      );


      /* GO TO TRACK PAGE */

      navigate(
        `/dashboard/grievances/${grievance.grievance_id}`
      );


    } catch (err) {

      console.error(
        "Create grievance error:",
        err
      );


      setError(
        err.message ||
        "Unable to submit grievance."
      );


    } finally {

      setLoading(false);

    }

  };


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
              Applicant
            </strong>

            <span>
              APPLICANT
            </span>

          </div>


          <div className="applicant-user-avatar">
            A
          </div>


          <button
            type="button"
            className="applicant-logout"
            onClick={() => {
              localStorage.removeItem(
                "access_token"
              );

              navigate("/login");
            }}
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


            {/* DASHBOARD */}

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


            {/* MY GRIEVANCES */}

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


            {/* SUBMIT — ACTIVE */}

            <Link
              to="/dashboard/submit"
              className="applicant-nav-item active"
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
            to="/dashboard"
            className="applicant-back-link"
          >
            ← Back to Dashboard
          </Link>


          {/* =================================================
              PAGE HEADER
          ================================================= */}

          <section className="applicant-page-header">

            <div>

              <div className="applicant-page-eyebrow">
                SECURE GRIEVANCE MANAGEMENT SYSTEM
              </div>

              <h1>
                Submit a Grievance
              </h1>

              <p>
                Describe your issue clearly so
                NIVARAN-AI can process it efficiently.
              </p>

            </div>

          </section>


          {/* =================================================
              SUBMIT LAYOUT
          ================================================= */}

          <div className="applicant-submit-layout">


            {/* =================================================
                FORM CARD
            ================================================= */}

            <section className="applicant-content-card applicant-submit-card">


              <div className="applicant-section-header">

                <div>

                  <h2>
                    Grievance Information
                  </h2>

                  <p>
                    Required fields *
                  </p>

                </div>

              </div>


              <form
                onSubmit={handleSubmit}
                className="applicant-submit-form"
              >


                {/* ERROR */}

                {error && (

                  <div className="applicant-form-error">

                    <span>
                      !
                    </span>

                    <p>
                      {error}
                    </p>

                  </div>

                )}


                {/* TITLE */}

                <div className="applicant-form-group">

                  <label htmlFor="title">
                    Grievance Title *
                  </label>


                  <input
                    id="title"
                    type="text"
                    placeholder="e.g. Research fellowship payment pending"
                    value={title}
                    onChange={(e) =>
                      setTitle(
                        e.target.value
                      )
                    }
                    disabled={loading}
                    maxLength={255}
                  />


                  <span className="applicant-field-hint">
                    Briefly describe your issue.
                  </span>

                </div>


                {/* DESCRIPTION */}

                <div className="applicant-form-group">

                  <label htmlFor="description">
                    Description *
                  </label>


                  <textarea
                    id="description"
                    rows={8}
                    placeholder="Describe your grievance, including relevant details, dates, department or other information..."
                    value={description}
                    onChange={(e) =>
                      setDescription(
                        e.target.value
                      )
                    }
                    disabled={loading}
                  />


                  <span className="applicant-field-hint">
                    Minimum 20 characters.
                  </span>

                </div>


                {/* =================================================
                    WHAT HAPPENS NEXT
                ================================================= */}

                <div className="applicant-submit-info">

                  <div className="applicant-submit-info-icon">
                    AI
                  </div>


                  <div>

                    <strong>
                      What happens next?
                    </strong>

                    <p>
                      Your grievance will be submitted
                      and assigned a unique grievance ID.
                      NIVARAN-AI will then analyze it
                      using AI-based classification and
                      semantic clustering.
                    </p>

                  </div>

                </div>


                {/* ACTIONS */}

                <div className="applicant-submit-actions">

                  <Link
                    to="/dashboard"
                    className="applicant-secondary-button"
                  >
                    Cancel
                  </Link>


                  <button
                    type="submit"
                    className="applicant-primary-button"
                    disabled={loading}
                  >

                    {loading
                      ? "Submitting..."
                      : "Submit Grievance →"}

                  </button>

                </div>


              </form>

            </section>


            {/* =================================================
                AI SIDE CARD
            ================================================= */}

            <aside className="applicant-submit-side-card">


              <div className="applicant-submit-ai-icon">
                AI
              </div>


              <h3>
                NIVARAN-AI
              </h3>


              <p>
                Your grievance will be processed
                through the intelligent grievance
                redressal workflow.
              </p>


              {/* STEP 1 */}

              <div className="applicant-submit-step">

                <span>
                  1
                </span>

                <div>

                  <strong>
                    Submit
                  </strong>

                  <p>
                    Your grievance is securely
                    recorded.
                  </p>

                </div>

              </div>


              {/* STEP 2 */}

              <div className="applicant-submit-step">

                <span>
                  2
                </span>

                <div>

                  <strong>
                    AI Analysis
                  </strong>

                  <p>
                    Category and semantic cluster
                    are identified.
                  </p>

                </div>

              </div>


              {/* STEP 3 */}

              <div className="applicant-submit-step">

                <span>
                  3
                </span>

                <div>

                  <strong>
                    Review
                  </strong>

                  <p>
                    The grievance enters the
                    redressal workflow.
                  </p>

                </div>

              </div>


            </aside>

          </div>


        </main>

      </div>

    </div>

  );

}


export default SubmitGrievance;