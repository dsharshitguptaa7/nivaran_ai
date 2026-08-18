import { useMemo, useState } from "react";
import { Link } from "react-router-dom";


function DeanDashboard() {

  // =====================================================
  // TEMPORARY DATA
  // Backend connect hone ke baad yahan API data aayega.
  // =====================================================

  const [grievances, setGrievances] = useState([
    {
      id: 1,
      grievance_id: "GRV-1024",
      title: "Research Fellowship Payment Delayed",
      subject: "Research",
      cluster: "Scholarship / Fellowship",
      officer: "Associate Dean",
      status: "PENDING_APPROVAL",
      priority: "HIGH",
      created_at: "2026-08-10",
      aging: 6,
    },
    {
      id: 2,
      grievance_id: "GRV-1019",
      title: "Examination Complaint",
      subject: "Examination",
      cluster: "Academic",
      officer: "Assistant Dean",
      status: "PENDING_APPROVAL",
      priority: "HIGH",
      created_at: "2026-08-09",
      aging: 7,
    },
    {
      id: 3,
      grievance_id: "GRV-1009",
      title: "Fee Related Complaint",
      subject: "Finance",
      cluster: "Fees",
      officer: "Manager",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      created_at: "2026-08-07",
      aging: 9,
    },
    {
      id: 4,
      grievance_id: "GRV-1002",
      title: "Department Infrastructure Issue",
      subject: "Administration",
      cluster: "Infrastructure",
      officer: "Associate Dean",
      status: "RESOLVED",
      priority: "LOW",
      created_at: "2026-08-05",
      aging: 11,
    },
  ]);


  const [activeFilter, setActiveFilter] =
    useState("ALL");


  // =====================================================
  // STATISTICS
  // =====================================================

  const stats = useMemo(() => {

    return {
      total: grievances.length,

      pendingApproval:
        grievances.filter(
          (g) =>
            g.status === "PENDING_APPROVAL"
        ).length,

      inProgress:
        grievances.filter(
          (g) =>
            g.status === "IN_PROGRESS"
        ).length,

      resolved:
        grievances.filter(
          (g) =>
            g.status === "RESOLVED"
        ).length,

      overdue:
        grievances.filter(
          (g) =>
            g.aging > 7 &&
            g.status !== "RESOLVED"
        ).length,
    };

  }, [grievances]);


  // =====================================================
  // FILTER
  // =====================================================

  const filteredGrievances = useMemo(() => {

    if (activeFilter === "ALL") {
      return grievances;
    }

    return grievances.filter(
      (g) => g.status === activeFilter
    );

  }, [grievances, activeFilter]);


  // =====================================================
  // HELPERS
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


  function formatDate(date) {

    if (!date) return "-";

    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );

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
  // RENDER
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
            className="dashboard-nav-item active"
          >
            <span>⌂</span>
            Dashboard
          </Link>


          <Link
            to="/dean/grievances"
            className="dashboard-nav-item"
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


        {/* Sidebar Bottom */}

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
          MAIN CONTENT
      ================================================= */}

      <main className="dashboard-main">


        {/* =================================================
            HEADER
        ================================================= */}

        <header className="dashboard-header">

          <div>

            <div className="dashboard-eyebrow">
              SECURE GRIEVANCE MANAGEMENT SYSTEM
            </div>

            <h1>
              Dean R&D Dashboard
            </h1>

            <p>
              Institutional oversight, grievance
              decisions and redressal monitoring.
            </p>

          </div>


          <div className="dashboard-header-actions">

            <div className="dashboard-date-card">

              <span>
                TODAY
              </span>

              <strong>
                16 Aug 2026
              </strong>

            </div>

          </div>

        </header>


        {/* =================================================
            EXECUTIVE STATISTICS
        ================================================= */}

        <section className="dashboard-stats">


          {/* TOTAL */}

          <div className="stat-card">

            <div className="stat-icon blue">
              ▤
            </div>

            <div>

              <span>
                Total Grievances
              </span>

              <strong>
                {stats.total}
              </strong>

              <small>
                Institution-wide
              </small>

            </div>

          </div>


          {/* APPROVAL */}

          <div className="stat-card">

            <div className="stat-icon purple">
              ✓
            </div>

            <div>

              <span>
                Pending Approval
              </span>

              <strong>
                {stats.pendingApproval}
              </strong>

              <small>
                Require Dean decision
              </small>

            </div>

          </div>


          {/* IN PROGRESS */}

          <div className="stat-card">

            <div className="stat-icon orange">
              ◷
            </div>

            <div>

              <span>
                In Progress
              </span>

              <strong>
                {stats.inProgress}
              </strong>

              <small>
                Currently processing
              </small>

            </div>

          </div>


          {/* RESOLVED */}

          <div className="stat-card">

            <div className="stat-icon green">
              ✓
            </div>

            <div>

              <span>
                Resolved
              </span>

              <strong>
                {stats.resolved}
              </strong>

              <small>
                Successfully closed
              </small>

            </div>

          </div>


        </section>


        {/* =================================================
            OVERDUE ALERT
        ================================================= */}

        {stats.overdue > 0 && (

          <section className="dashboard-alert">

            <div className="dashboard-alert-icon">
              !
            </div>

            <div>

              <strong>
                {stats.overdue} grievance
                {stats.overdue > 1 ? "s are" : " is"}
                {" "}overdue
              </strong>

              <p>
                These cases have exceeded the
                expected processing period and
                may require administrative attention.
              </p>

            </div>

            <Link
              to="/dean/grievances?filter=overdue"
              className="dashboard-alert-action"
            >
              Review Overdue →
            </Link>

          </section>

        )}


        {/* =================================================
            PENDING DECISIONS
        ================================================= */}

        <section className="dashboard-section">

          <div className="section-heading">

            <div>

              <h2>
                Pending Dean Decisions
              </h2>

              <p>
                Grievances requiring institutional
                level review or approval.
              </p>

            </div>


            <Link
              to="/dean/approvals"
              className="section-view-link"
            >
              View All →
            </Link>

          </div>


          <div className="approval-grid">


            {grievances
              .filter(
                (g) =>
                  g.status ===
                  "PENDING_APPROVAL"
              )
              .map((grievance) => (

                <div
                  className="approval-card"
                  key={grievance.id}
                >

                  <div className="approval-card-top">

                    <span className="grievance-id">
                      {grievance.grievance_id}
                    </span>

                    <span
                      className={`priority ${
                        grievance.priority
                          ?.toLowerCase() || ""
                      }`}
                    >
                      {grievance.priority}
                    </span>

                  </div>


                  <h3>
                    {grievance.title}
                  </h3>


                  <div className="approval-meta">

                    <span>
                      Subject:
                      {" "}
                      <strong>
                        {grievance.subject}
                      </strong>
                    </span>

                    <span>
                      Referred by:
                      {" "}
                      <strong>
                        {grievance.officer}
                      </strong>
                    </span>

                  </div>


                  <div className="approval-card-footer">

                    <span>
                      {grievance.aging} days pending
                    </span>


                    <Link
                      to={`/dean/grievances/${grievance.grievance_id}`}
                      className="table-action"
                    >
                      Review →
                    </Link>

                  </div>

                </div>

              ))}


            {grievances.filter(
              (g) =>
                g.status ===
                "PENDING_APPROVAL"
            ).length === 0 && (

              <div className="table-empty">

                <strong>
                  No pending decisions
                </strong>

                <p>
                  All current grievances have
                  been reviewed.
                </p>

              </div>

            )}

          </div>

        </section>


        {/* =================================================
            INSTITUTIONAL GRIEVANCE MONITOR
        ================================================= */}

        <section className="dashboard-section">

          <div className="section-heading">

            <div>

              <h2>
                Institutional Grievance Monitor
              </h2>

              <p>
                Monitor grievances across the
                university redressal workflow.
              </p>

            </div>

          </div>


          {/* FILTERS */}

          <div className="dashboard-filter-bar">

            <button
              type="button"
              className={
                activeFilter === "ALL"
                  ? "filter-button active"
                  : "filter-button"
              }
              onClick={() =>
                setActiveFilter("ALL")
              }
            >
              All
            </button>


            <button
              type="button"
              className={
                activeFilter ===
                "PENDING_APPROVAL"
                  ? "filter-button active"
                  : "filter-button"
              }
              onClick={() =>
                setActiveFilter(
                  "PENDING_APPROVAL"
                )
              }
            >
              Pending Approval
            </button>


            <button
              type="button"
              className={
                activeFilter === "IN_PROGRESS"
                  ? "filter-button active"
                  : "filter-button"
              }
              onClick={() =>
                setActiveFilter(
                  "IN_PROGRESS"
                )
              }
            >
              In Progress
            </button>


            <button
              type="button"
              className={
                activeFilter === "RESOLVED"
                  ? "filter-button active"
                  : "filter-button"
              }
              onClick={() =>
                setActiveFilter(
                  "RESOLVED"
                )
              }
            >
              Resolved
            </button>

          </div>


          {/* TABLE */}

          <div className="grievance-table">

            <div className="table-header">

              <span>
                GRIEVANCE
              </span>

              <span>
                SUBJECT
              </span>

              <span>
                OFFICER
              </span>

              <span>
                STATUS
              </span>

              <span>
                ACTION
              </span>

            </div>


            {filteredGrievances.length === 0 ? (

              <div className="table-empty">
                No grievances found.
              </div>

            ) : (

              filteredGrievances.map(
                (grievance) => (

                  <div
                    className="table-row"
                    key={grievance.id}
                  >


                    {/* GRIEVANCE */}

                    <div className="grievance-info">

                      <strong>
                        {grievance.title}
                      </strong>

                      <span>
                        {grievance.grievance_id}
                      </span>

                    </div>


                    {/* SUBJECT */}

                    <span>
                      {grievance.subject}
                    </span>


                    {/* OFFICER */}

                    <span>
                      {grievance.officer}
                    </span>


                    {/* STATUS */}

                    <span
                      className={`status-badge ${
                        statusClass(
                          grievance.status
                        )
                      }`}
                    >
                      {formatStatus(
                        grievance.status
                      )}
                    </span>


                    {/* ACTION */}

                    <Link
                      to={`/dean/grievances/${grievance.grievance_id}`}
                      className="table-action"
                    >
                      View →
                    </Link>

                  </div>

                )
              )

            )}

          </div>

        </section>


        {/* =================================================
            OVERSIGHT SNAPSHOT
        ================================================= */}

        <section className="oversight-grid">


          {/* SUBJECT-WISE */}

          <div className="oversight-card">

            <div className="oversight-card-header">

              <div>

                <h3>
                  Subject-wise Overview
                </h3>

                <p>
                  Grievance distribution by
                  subject area.
                </p>

              </div>

              <span>
                ◉
              </span>

            </div>


            <div className="oversight-list">

              <div>
                <span>
                  Research
                </span>

                <strong>
                  {
                    grievances.filter(
                      (g) =>
                        g.subject ===
                        "Research"
                    ).length
                  }
                </strong>
              </div>


              <div>
                <span>
                  Examination
                </span>

                <strong>
                  {
                    grievances.filter(
                      (g) =>
                        g.subject ===
                        "Examination"
                    ).length
                  }
                </strong>
              </div>


              <div>
                <span>
                  Finance
                </span>

                <strong>
                  {
                    grievances.filter(
                      (g) =>
                        g.subject ===
                        "Finance"
                    ).length
                  }
                </strong>
              </div>


              <div>
                <span>
                  Administration
                </span>

                <strong>
                  {
                    grievances.filter(
                      (g) =>
                        g.subject ===
                        "Administration"
                    ).length
                  }
                </strong>
              </div>

            </div>

          </div>


          {/* CLUSTER */}

          <div className="oversight-card">

            <div className="oversight-card-header">

              <div>

                <h3>
                  Cluster Overview
                </h3>

                <p>
                  AI-generated grievance
                  cluster distribution.
                </p>

              </div>

              <span>
                AI
              </span>

            </div>


            <div className="oversight-list">

              <div>
                <span>
                  Scholarship / Fellowship
                </span>

                <strong>
                  {
                    grievances.filter(
                      (g) =>
                        g.cluster ===
                        "Scholarship / Fellowship"
                    ).length
                  }
                </strong>
              </div>


              <div>
                <span>
                  Academic
                </span>

                <strong>
                  {
                    grievances.filter(
                      (g) =>
                        g.cluster ===
                        "Academic"
                    ).length
                  }
                </strong>
              </div>


              <div>
                <span>
                  Fees
                </span>

                <strong>
                  {
                    grievances.filter(
                      (g) =>
                        g.cluster ===
                        "Fees"
                    ).length
                  }
                </strong>
              </div>


              <div>
                <span>
                  Infrastructure
                </span>

                <strong>
                  {
                    grievances.filter(
                      (g) =>
                        g.cluster ===
                        "Infrastructure"
                    ).length
                  }
                </strong>
              </div>

            </div>

          </div>


        </section>


        {/* =================================================
            AI INFORMATION
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
              AI-assisted classification, semantic
              clustering and confidence scoring
              provide decision-support insights
              before administrative review.
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


export default DeanDashboard;