import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();

  // =========================================================
  // FORM STATE
  // =========================================================

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // =========================================================
  // SUBJECT STATE
  // =========================================================

  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);

  // =========================================================
  // UI STATE
  // =========================================================

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // =========================================================
  // FETCH SUBJECTS
  // =========================================================

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setSubjectsLoading(true);
        setError("");

        const response = await fetch(
          "http://127.0.0.1:8000/api/v1/subjects"
        );

        if (!response.ok) {
          throw new Error("Failed to load subjects.");
        }

        const data = await response.json();

        setSubjects(data);
      } catch (err) {
        console.error("Subject fetch error:", err);

        setError(
          "Unable to load subjects. Please refresh the page."
        );
      } finally {
        setSubjectsLoading(false);
      }
    };

    fetchSubjects();
  }, []);

  // =========================================================
  // REGISTER
  // =========================================================

  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");

    // -------------------------------------------------------
    // Password validation
    // -------------------------------------------------------

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // -------------------------------------------------------
    // Subject validation
    // -------------------------------------------------------

    if (!subjectId) {
      setError("Please select your subject.");
      return;
    }

    // -------------------------------------------------------
    // Start loading
    // -------------------------------------------------------

    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/v1/auth/register",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            full_name: fullName,
            email: email,
            password: password,
            department: department || null,
            subject_id: subjectId,
          }),
        }
      );

      const data = await response.json();

      // -----------------------------------------------------
      // Backend error
      // -----------------------------------------------------

      if (!response.ok) {
        throw new Error(
          data?.detail || "Registration failed."
        );
      }

      // -----------------------------------------------------
      // Registration successful
      // -----------------------------------------------------

      console.log("Registration successful:", data);

      navigate("/login", {
        state: {
          message:
            "Account created successfully. Please login.",
        },
      });

    } catch (err) {
      console.error("Registration error:", err);

      setError(
        err?.message ||
        "Unable to create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      {/* =====================================================
          LEFT BRAND SECTION
      ====================================================== */}
      
      
      <div className="auth-brand">

        <Link
          to="/"
          className="auth-logo"
        >
          NIVARAN<span>.AI</span>
        </Link>

         <div className="login-tagline">
          AI-Assisted Grievance Redressal for
          Students, Faculty & Staff
        </div>


        <div className="auth-brand-content">

          <div className="auth-badge">
            JOIN NIVARAN-AI
          </div>


          <h1>
            Your grievance.
            <span>Your voice.</span>
          </h1>


          <p>
            Create your account to submit grievances,
            track their progress and stay informed
            throughout the redressal process.
          </p>


          <div className="auth-features">

            <div>
              <span>✓</span>
              Submit grievances digitally
            </div>

            <div>
              <span>✓</span>
              Track grievance status
            </div>

            <div>
              <span>✓</span>
              Receive transparent updates
            </div>

          </div>

        </div>

      </div>


      {/* =====================================================
          RIGHT FORM SECTION
      ====================================================== */}

      <div className="auth-form-section">

        <div className="auth-form-container">


          {/* Back */}

          <Link
            to="/"
            className="back-home"
          >
            ← Back to Home
          </Link>


          {/* Heading */}

          <div className="auth-heading">

            <h2>
              Create account
            </h2>

            <p>
              Register for your NIVARAN-AI account
            </p>

          </div>


          {/* Error */}

          {error && (
            <div className="login-error">

              <span>!</span>

              <p>
                {error}
              </p>

            </div>
          )}


          {/* =================================================
              REGISTRATION FORM
          ================================================== */}

          <form
            className="auth-form"
            onSubmit={handleRegister}
          >


            {/* Full Name */}

            <div className="form-group">

              <label htmlFor="name">
                Full Name
              </label>

              <input
                id="name"
                type="text"
                value={fullName}
                onChange={(e) =>
                  setFullName(e.target.value)
                }
                placeholder="Enter your full name"
                autoComplete="name"
                required
              />

            </div>


            {/* Email */}

            <div className="form-group">

              <label htmlFor="email">
                Email Address
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="Enter your email address"
                autoComplete="email"
                required
              />

            </div>


            {/* Department */}

            <div className="form-group">

              <label htmlFor="department">
                Department
              </label>

              <input
                id="department"
                type="text"
                value={department}
                onChange={(e) =>
                  setDepartment(e.target.value)
                }
                placeholder="Enter your department"
                autoComplete="organization"
              />

            </div>


            {/* Subject */}

            <div className="form-group">

              <label htmlFor="subject">
                Subject
              </label>

              <select
                id="subject"
                value={subjectId}
                onChange={(e) =>
                  setSubjectId(e.target.value)
                }
                required
                disabled={subjectsLoading}
              >

                <option
                  value=""
                  disabled
                >
                  {subjectsLoading
                    ? "Loading subjects..."
                    : "Select your subject"}
                </option>


                {subjects.map((subject) => (
                  <option
                    key={subject.id}
                    value={subject.id}
                  >
                    {subject.name}
                  </option>
                ))}

              </select>

            </div>


            {/* Password */}

            <div className="form-group">

              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Create a password"
                autoComplete="new-password"
                required
              />

            </div>


            {/* Confirm Password */}

            <div className="form-group">

              <label htmlFor="confirmPassword">
                Confirm Password
              </label>

              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                placeholder="Confirm your password"
                autoComplete="new-password"
                required
              />

            </div>


            {/* Submit */}

            <button
              type="submit"
              className="auth-submit"
              disabled={
                loading ||
                subjectsLoading
              }
            >

              {loading ? (
                <>
                  <span className="login-spinner"></span>
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <span>→</span>
                </>
              )}

            </button>

          </form>


          {/* =================================================
              LOGIN LINK
          ================================================== */}

          <div className="auth-divider">
            <span>OR</span>
          </div>


          <p className="register-prompt">

            Already have an account?{" "}

            <Link to="/login">
              Login
            </Link>

          </p>

        </div>

      </div>

    </div>
  );
}

export default Register;