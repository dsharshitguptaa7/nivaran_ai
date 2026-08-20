import { Link } from "react-router-dom";
import universityLogo from "../images/logo.png";

function Landing() {
  return (
    <div className="landing-page">

      {/* =====================================================
          HEADER / NAVIGATION
      ====================================================== */}
      <header className="univ-header">

        <div className="header-container">

          <Link to="/" className="logo-section">

            <div className="logo-box">
              <img
                src={universityLogo}
                alt="CSJMU Logo"
              />
            </div>

            <div className="univ-title">
              <h2>
                Chhatrapati Shahu Ji Maharaj University
              </h2>

              <p>
                Kanpur, Uttar Pradesh
              </p>
            </div>

          </Link>


          <nav className="nav-links">

            <a href="#home">
              Home
            </a>

            <a href="#about">
              About Portal
            </a>

            <a href="#process">
              How It Works
            </a>

            <a href="#contact">
              Contact Support
            </a>

            <Link to="/login">
              Login
            </Link>

            <Link
              to="/login?type=authority"
              className="authority-link"
            >
              Authority Login
            </Link>

            <Link
              to="/register"
              className="register-link"
            >
              Register
            </Link>

          </nav>

        </div>

      </header>


      {/* =====================================================
          HERO
      ====================================================== */}
      <section
        className="hero"
        id="home"
      >

        <div className="container hero-container">

          {/* LEFT */}

          <div className="hero-content">

            <span className="badge">
              AI-POWERED GRIEVANCE REDRESSAL
            </span>


            <h1>
              Smarter Grievance
              <br />

              <span>
                Redressal with AI
              </span>
            </h1>


            <p>
              NIVARAN-AI is an intelligent grievance
              redressal platform designed for students,
              faculty, and staff of CSJM University to
              submit concerns, track progress, and seek
              timely resolutions.
            </p>


            <div className="hero-buttons">

              <Link
                to="/login"
                className="btn btn-primary"
              >
                <i className="fa-solid fa-pen-to-square"></i>

                Submit a Grievance
              </Link>


              <a
                href="#process"
                className="btn btn-secondary"
              >
                <i className="fa-solid fa-route"></i>

                See How It Works
              </a>

            </div>


            <div className="hero-trust">

              <span>
                <i className="fa-solid fa-shield-halved"></i>
                Secure
              </span>

              <span>
                <i className="fa-solid fa-brain"></i>
                AI-Assisted
              </span>

              <span>
                <i className="fa-solid fa-eye"></i>
                Transparent
              </span>

            </div>

          </div>


          {/* RIGHT — AI DEMO */}

          <div className="hero-ai-panel">

            <div className="ai-panel-card">

              <div className="ai-panel-header">

                <div className="ai-panel-title">

                  <div className="ai-panel-icon">
                    AI
                  </div>

                  <div>
                    <strong>
                      NIVARAN-AI
                    </strong>

                    <span>
                      Intelligence Engine
                    </span>
                  </div>

                </div>


                <span className="ai-live">
                  <span></span>
                  LIVE
                </span>

              </div>


              <div className="ai-panel-body">

                <div className="ai-section-label">
                  GRIEVANCE ANALYSIS
                </div>


                <div className="ai-analysis-item">

                  <div>
                    <span>
                      Category
                    </span>

                    <strong>
                      Fellowship
                    </strong>
                  </div>

                  <i className="fa-solid fa-check"></i>

                </div>


                <div className="ai-analysis-item">

                  <div>
                    <span>
                      Semantic Cluster
                    </span>

                    <strong>
                      #14 · Payment Issues
                    </strong>
                  </div>

                  <i className="fa-solid fa-check"></i>

                </div>


                <div className="ai-analysis-item">

                  <div>
                    <span>
                      AI Confidence
                    </span>

                    <strong>
                      81.55%
                    </strong>
                  </div>

                  <i className="fa-solid fa-chart-line"></i>

                </div>


                <div className="ai-routing">

                  <div className="ai-routing-title">
                    <span>
                      Intelligent Routing
                    </span>

                    <strong>
                      Completed
                    </strong>
                  </div>


                  <div className="routing-line">

                    <span className="routing-dot active">
                      01
                    </span>

                    <div></div>

                    <span className="routing-dot active">
                      02
                    </span>

                    <div></div>

                    <span className="routing-dot active">
                      03
                    </span>

                  </div>


                  <div className="routing-labels">

                    <span>
                      AI
                    </span>

                    <span>
                      Review
                    </span>

                    <span>
                      Authority
                    </span>

                  </div>

                </div>


                <div className="ai-complete">

                  <i className="fa-solid fa-circle-check"></i>

                  AI processing completed

                </div>

              </div>

            </div>


            <div className="ai-floating-card">

              <i className="fa-solid fa-layer-group"></i>

              <div>

                <strong>
                  Smart Clustering
                </strong>

                <span>
                  Similar grievances grouped automatically
                </span>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          ABOUT / CORE CAPABILITIES
      ====================================================== */}
      <section
        className="features-section"
        id="about"
      >

        <div className="container">

          <div className="section-title">

            <span className="section-eyebrow">
              CORE CAPABILITIES
            </span>

            <h2>
              Intelligent grievance management
            </h2>

            <p>
              NIVARAN-AI combines AI-assisted analysis
              with a transparent administrative workflow.
            </p>

          </div>


          <div className="cards-grid">


            <div className="info-card">

              <div className="card-icon">
                <i className="fa-solid fa-brain"></i>
              </div>

              <h3>
                AI Classification
              </h3>

              <p>
                Automatically identifies the relevant
                grievance category using AI-assisted
                analysis.
              </p>

            </div>


            <div className="info-card">

              <div className="card-icon">
                <i className="fa-solid fa-layer-group"></i>
              </div>

              <h3>
                Smart Clustering
              </h3>

              <p>
                Groups semantically similar grievances
                to identify recurring issues and patterns.
              </p>

            </div>


            <div className="info-card">

              <div className="card-icon">
                <i className="fa-solid fa-route"></i>
              </div>

              <h3>
                Intelligent Routing
              </h3>

              <p>
                Routes grievances through the appropriate
                administrative workflow for review.
              </p>

            </div>


            <div className="info-card">

              <div className="card-icon">
                <i className="fa-solid fa-clock-rotate-left"></i>
              </div>

              <h3>
                Transparent Tracking
              </h3>

              <p>
                Track grievance status, administrative
                actions, and progress throughout resolution.
              </p>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          HOW IT WORKS
      ====================================================== */}
      <section
        className="process-section"
        id="process"
      >

        <div className="container">

          <div className="section-title light">

            <span className="section-eyebrow">
              WORKFLOW
            </span>

            <h2>
              How NIVARAN-AI works
            </h2>

            <p>
              From grievance submission to final resolution,
              every stage follows a structured workflow.
            </p>

          </div>


          <div className="workflow">

            <div className="workflow-step">

              <span>
                01
              </span>

              <i className="fa-solid fa-file-pen"></i>

              <h3>
                Submit
              </h3>

              <p>
                Applicant submits the grievance
                through the portal.
              </p>

            </div>


            <div className="workflow-connector">
              →
            </div>


            <div className="workflow-step">

              <span>
                02
              </span>

              <i className="fa-solid fa-brain"></i>

              <h3>
                AI Analysis
              </h3>

              <p>
                AI classifies, clusters and
                analyzes the grievance.
              </p>

            </div>


            <div className="workflow-connector">
              →
            </div>


            <div className="workflow-step">

              <span>
                03
              </span>

              <i className="fa-solid fa-user-shield"></i>

              <h3>
                Human Review
              </h3>

              <p>
                Authorized authorities review
                the grievance.
              </p>

            </div>


            <div className="workflow-connector">
              →
            </div>


            <div className="workflow-step">

              <span>
                04
              </span>

              <i className="fa-solid fa-circle-check"></i>

              <h3>
                Resolution
              </h3>

              <p>
                Appropriate action is taken
                and the grievance is resolved.
              </p>

            </div>

          </div>


          {/* ADMINISTRATIVE CHAIN */}

          <div className="authority-flow">

            <div className="authority-flow-title">
              Administrative Escalation
            </div>


            <div className="authority-chain">

              <span>
                Applicant
              </span>

              <i className="fa-solid fa-chevron-right"></i>

              <span>
                Manager
              </span>

              <i className="fa-solid fa-chevron-right"></i>

              <span>
                Assistant Dean
              </span>

              <i className="fa-solid fa-chevron-right"></i>

              <span>
                Associate Dean
              </span>

              <i className="fa-solid fa-chevron-right"></i>

              <span>
                Dean
              </span>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          TRUST / SECURITY
      ====================================================== */}
      <section className="trust-section">

        <div className="container">

          <div className="section-title">

            <span className="section-eyebrow">
              TRUST & TRANSPARENCY
            </span>

            <h2>
              Designed for a fairer grievance process
            </h2>

          </div>


          <div className="trust-grid">

            <div className="trust-item">

              <i className="fa-solid fa-shield-halved"></i>

              <div>

                <h3>
                  Confidential
                </h3>

                <p>
                  Grievances are handled through
                  authorized access-controlled workflows.
                </p>

              </div>

            </div>


            <div className="trust-item">

              <i className="fa-solid fa-list-check"></i>

              <div>

                <h3>
                  Structured Workflow
                </h3>

                <p>
                  Every grievance follows a defined
                  review and escalation process.
                </p>

              </div>

            </div>


            <div className="trust-item">

              <i className="fa-solid fa-clock-rotate-left"></i>

              <div>

                <h3>
                  Complete History
                </h3>

                <p>
                  Status changes and administrative
                  actions remain traceable.
                </p>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          CTA / HELP
      ====================================================== */}
      <section
        className="help-banner"
        id="contact"
      >

        <div className="container banner-box">

          <div>

            <span className="section-eyebrow">
              NEED ASSISTANCE?
            </span>

            <h2>
              Have a grievance?
            </h2>

            <p>
              Submit your concern through NIVARAN-AI
              and track its progress through the
              grievance redressal workflow.
            </p>

          </div>


          <div className="cta-actions">

            <Link
              to="/login"
              className="btn btn-primary"
            >
              Submit a Grievance →
            </Link>


            <div className="contact-info">

              <p>
                <i className="fa-solid fa-envelope"></i>
                helpline@csjmu.ac.in
              </p>

              <p>
                <i className="fa-solid fa-phone"></i>
                +91 512 2581280
              </p>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          FOOTER
      ====================================================== */}
      <footer>

        <div className="footer-brand">

          <img
            src={universityLogo}
            alt="CSJMU Logo"
          />

          <div>

            <strong>
              Chhatrapati Shahu Ji Maharaj University
            </strong>

            <span>
              Kanpur, Uttar Pradesh
            </span>

          </div>

        </div>


        <p>
          © 2026 Chhatrapati Shahu Ji Maharaj University,
          Kanpur. All Rights Reserved.
        </p>


        <p>
          Powered by{" "}
          <strong>
            NIVARAN-AI
          </strong>{" "}
          · AI-Assisted Grievance Redressal System
        </p>

      </footer>

    </div>
  );
}

export default Landing;