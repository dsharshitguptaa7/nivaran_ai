import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  getCurrentUser,
  logoutUser,
} from "../services/authService";

import {
  getMyGrievances,
} from "../services/grievanceService";


function MyGrievances() {

  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  const [grievances, setGrievances] = useState([]);
  const [filteredGrievances, setFilteredGrievances] =
    useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  /* =====================================================
     LOAD USER + GRIEVANCES
  ====================================================== */

  useEffect(() => {
    loadPage();
  }, []);


  const loadPage = async () => {

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
        "My grievances loading error:",
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
        "Unable to load grievances."
      );

    } finally {

      setLoading(false);

    }
  };


  /* =====================================================
     FILTER
  ====================================================== */

  useEffect(() => {

    filterGrievances();

  }, [
    grievances,
    search,
    statusFilter,
    priorityFilter,
  ]);


  const filterGrievances = () => {

    let result = [...grievances];


    /* SEARCH */

    if (search.trim()) {

      const query =
        search.toLowerCase();

      result = result.filter(
        (grievance) =>
          grievance.grievance_id
            ?.toLowerCase()
            .includes(query) ||

          grievance.title
            ?.toLowerCase()
            .includes(query) ||

          grievance.description
            ?.toLowerCase()
            .includes(query)
      );

    }


    /* STATUS */

    if (statusFilter !== "ALL") {

      result = result.filter(
        (grievance) =>
          grievance.status === statusFilter
      );

    }


    /* PRIORITY */

    if (priorityFilter !== "ALL") {

      result = result.filter(
        (grievance) =>
          grievance.priority === priorityFilter
      );

    }


    setFilteredGrievances(result);

  };


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


  const getCategory = (grievance) => {

    if (!grievance.category_id) {
      return "AI Processing";
    }

    return "Classified";

  };


  /* =====================================================
     LOGOUT
  ====================================================== */

  const handleLogout = () => {

    logoutUser();
    navigate("/login");

  };


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
     RENDER
  ====================================================== */

  return (

    <div className="applicant-page">


      {/* =================================================
          SAME HEADER AS DASHBOARD
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


            {/* MY GRIEVANCES — ACTIVE */}

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


            {/* SUBMIT */}

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
                My Grievances
              </h1>

              <p>
                View and track all your
                submitted grievances.
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
              SEARCH + FILTER
          ================================================= */}

          <section className="applicant-filter-card">


            <div className="applicant-filter-search">

              <span className="applicant-filter-search-icon">
                ⌕
              </span>

              <input
                type="text"
                placeholder="Search by grievance ID or title..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />

            </div>


            <div className="applicant-filter-select">

              <label>
                Status
              </label>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value
                  )
                }
              >

                <option value="ALL">
                  All Status
                </option>

                <option value="SUBMITTED">
                  Submitted
                </option>

                <option value="AI_PROCESSING">
                  AI Processing
                </option>

                <option value="PENDING_REVIEW">
                  Pending Review
                </option>

                <option value="IN_PROGRESS">
                  In Progress
                </option>

                <option value="RESOLVED">
                  Resolved
                </option>

                <option value="CLOSED">
                  Closed
                </option>

              </select>

            </div>


            <div className="applicant-filter-select">

              <label>
                Priority
              </label>

              <select
                value={priorityFilter}
                onChange={(e) =>
                  setPriorityFilter(
                    e.target.value
                  )
                }
              >

                <option value="ALL">
                  All Priority
                </option>

                <option value="LOW">
                  Low
                </option>

                <option value="MEDIUM">
                  Medium
                </option>

                <option value="HIGH">
                  High
                </option>

              </select>

            </div>

          </section>


          {/* =================================================
              LOADING
          ================================================= */}

          {loading && (

            <div className="applicant-state-card">

              <div className="applicant-state-icon">
                AI
              </div>

              <h3>
                Loading grievances
              </h3>

              <p>
                Please wait while your grievances
                are being loaded.
              </p>

            </div>

          )}


          {/* =================================================
              ERROR
          ================================================= */}

          {error && (

            <div className="applicant-state-card error">

              <div className="applicant-state-icon error">
                !
              </div>

              <h3>
                Unable to load grievances
              </h3>

              <p>
                {error}
              </p>

              <button
                type="button"
                className="applicant-primary-button"
                onClick={loadPage}
              >
                Try Again
              </button>

            </div>

          )}


          {/* =================================================
              GRIEVANCES
          ================================================= */}

          {!loading && !error && (

            <section className="applicant-content-card">


              {/* HEADER */}

              <div className="applicant-section-header">

                <div>

                  <h2>
                    All Grievances
                  </h2>

                  <p>
                    {filteredGrievances.length}{" "}
                    grievance
                    {filteredGrievances.length !== 1
                      ? "s"
                      : ""}{" "}
                    found
                  </p>

                </div>

              </div>


              {/* TABLE */}

              <div className="applicant-grievance-table">


                {/* TABLE HEADER */}

                <div className="applicant-grievance-table-header">

                  <span>
                    Grievance
                  </span>

                  <span>
                    Category
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


                {/* EMPTY */}

                {filteredGrievances.length === 0 ? (

                  <div className="applicant-empty-state">

                    <div className="applicant-empty-icon">
                      ◌
                    </div>

                    <h3>
                      No grievances found
                    </h3>

                    <p>
                      Try changing your search
                      or filters.
                    </p>

                  </div>

                ) : (

                  filteredGrievances.map(
                    (grievance) => (

                      <Link
                        key={grievance.id}
                        to={`/dashboard/grievances/${grievance.grievance_id}`}
                        className="applicant-grievance-table-row"
                      >


                        {/* GRIEVANCE */}

                        <div className="applicant-grievance-main-info">

                          <strong>
                            {grievance.title}
                          </strong>

                          <span>
                            {grievance.grievance_id}
                          </span>

                        </div>


                        {/* CATEGORY */}

                        <div className="applicant-grievance-category">

                          {getCategory(
                            grievance
                          )}

                        </div>


                        {/* STATUS */}

                        <div>

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

                        </div>


                        {/* PRIORITY */}

                        <div>

                          <span
                            className={`applicant-priority ${
                              grievance.priority
                                ?.toLowerCase()
                            }`}
                          >

                            {grievance.priority}

                          </span>

                        </div>


                        {/* DATE */}

                        <div className="applicant-grievance-date">

                          {formatDate(
                            grievance.created_at
                          )}

                        </div>


                        {/* ACTION */}

                        <div>

                          <span className="applicant-outline-button">
                            Track →
                          </span>

                        </div>


                      </Link>

                    )
                  )

                )}

              </div>

            </section>

          )}

        </main>

      </div>

    </div>

  );

}


export default MyGrievances;