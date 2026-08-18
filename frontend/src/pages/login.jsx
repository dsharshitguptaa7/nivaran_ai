import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  loginUser,
  getCurrentUser,
} from "../services/authService";

function Login() {
  const navigate = useNavigate();

  const [loginType, setLoginType] = useState("applicant");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTypeChange = (type) => {
    setLoginType(type);
    setError("");
    setEmail("");
    setPassword("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      // Login and save token
      await loginUser(email, password);

      // Get logged-in user
      const user = await getCurrentUser();

      console.log("Logged in user:", user);

      /* =====================================================
         APPLICANT LOGIN
      ====================================================== */

      if (loginType === "applicant") {
        if (user.role !== "APPLICANT") {
          localStorage.removeItem("access_token");

          throw new Error(
            "This account is not registered as an applicant."
          );
        }

        navigate("/dashboard");
        return;
      }

      /* =====================================================
         AUTHORITY LOGIN
      ====================================================== */

      if (loginType === "authority") {
        if (user.role === "MANAGER") {
          navigate("/manager");
        }

        else if (user.role === "ASSISTANT_DEAN") {
          navigate("/assistant-dean");
        }

        else if (user.role === "ASSOCIATE_DEAN") {
          navigate("/associate-dean");
        }

        else if (user.role === "DEAN") {
          navigate("/dean");
        }

        else {
          localStorage.removeItem("access_token");

          throw new Error(
            "This account does not have authority access."
          );
        }

        return;
      }

    } catch (err) {
      console.error("Login error:", err);

      setError(
        err?.message ||
        "Invalid email or password"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">

      {/* =====================================================
          LEFT BRAND PANEL
      ====================================================== */}

      <div className="login-header">

        <div className="login-secure">
          CSJM PORTAL
        </div>

        <Link
          to="/"
          className="login-logo"
        >
          NIVARAN<span>.AI</span>
        </Link>

        <div className="login-tagline">
          AI-Assisted Grievance Redressal for
          Students, Faculty & Staff
        </div>


        <div className="login-brand-content">

          <div className="login-brand-badge">
            {loginType === "applicant"
              ? "SECURE UNIVERSITY PORTAL"
              : "AUTHORITY PORTAL"}
          </div>


          <h1>
            {loginType === "applicant" ? (
              <>
                Resolve Your Grievances
                <span> Smarter.</span>
              </>
            ) : (
              <>
                Manage Grievances
                <span> Intelligently.</span>
              </>
            )}
          </h1>


          <p>
            {loginType === "applicant"
              ? "Login to submit, track and manage your grievances through the intelligent NIVARAN-AI redressal platform."
              : "Login to review, assign, escalate and resolve grievances through the NIVARAN-AI administrative workflow."}
          </p>


          <div className="login-benefits">

            {loginType === "applicant" ? (
              <>
                <div className="login-benefit">
                  <span>✓</span>
                  <p>
                    AI-powered grievance classification
                  </p>
                </div>

                <div className="login-benefit">
                  <span>✓</span>
                  <p>
                    Intelligent grievance clustering
                  </p>
                </div>

                <div className="login-benefit">
                  <span>✓</span>
                  <p>
                    Transparent grievance tracking
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="login-benefit">
                  <span>✓</span>
                  <p>
                    AI-assisted grievance review
                  </p>
                </div>

                <div className="login-benefit">
                  <span>✓</span>
                  <p>
                    Hierarchical grievance workflow
                  </p>
                </div>

                <div className="login-benefit">
                  <span>✓</span>
                  <p>
                    Transparent escalation and tracking
                  </p>
                </div>
              </>
            )}

          </div>

        </div>

      </div>


      {/* =====================================================
          RIGHT LOGIN PANEL
      ====================================================== */}

      <div className="login-card">

        <div className="login-card-content">

          {/* Back */}

          <Link
            to="/"
            className="login-back"
          >
            ← Back to Home
          </Link>


          {/* Heading */}

          <div className="login-heading">

            <h2>
              Welcome Back
            </h2>

            <p>
              Login to your NIVARAN-AI account
            </p>

          </div>


          {/* =================================================
              LOGIN TYPE SELECTOR
          ================================================== */}

          <div className="login-type-grid">

            {/* APPLICANT */}

            <button
              type="button"
              className={`login-type-card ${
                loginType === "applicant"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                handleTypeChange("applicant")
              }
            >

              <div className="login-type-icon">
                👤
              </div>

              <div className="login-type-content">

                <h3>
                  Applicant Login
                </h3>

                <p>
                  Submit and track your grievances
                </p>

              </div>

              {loginType === "applicant" && (
                <div className="login-type-check">
                  ✓
                </div>
              )}

            </button>


            {/* AUTHORITY */}

            <button
              type="button"
              className={`login-type-card ${
                loginType === "authority"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                handleTypeChange("authority")
              }
            >

              <div className="login-type-icon authority-icon">
                🏛
              </div>

              <div className="login-type-content">

                <h3>
                  Authority Login
                </h3>

                <p>
                  Review and manage grievances
                </p>

              </div>

              {loginType === "authority" && (
                <div className="login-type-check">
                  ✓
                </div>
              )}

            </button>

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
              LOGIN FORM
          ================================================== */}

          <form
            className="login-form"
            onSubmit={handleLogin}
          >

            {/* Email */}

            <div className="login-form-group">

              <label htmlFor="email">
                {loginType === "authority"
                  ? "Official Email"
                  : "Email Address"}
              </label>

              <div className="login-input-row">

                <div className="login-input-icon">
                  ✉
                </div>

                <input
                  id="email"
                  type="email"
                  className="login-form-input"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder={
                    loginType === "authority"
                      ? "authority@csjmu.ac.in"
                      : "student@csjmu.ac.in"
                  }
                  autoComplete="email"
                  required
                />

              </div>

            </div>


            {/* Password */}

            <div className="login-form-group">

              <div className="login-password-label">

                <label htmlFor="password">
                  Password
                </label>

                <a
                  href="#"
                  onClick={(e) =>
                    e.preventDefault()
                  }
                >
                  Forgot password?
                </a>

              </div>

              <div className="login-input-row">

                <div className="login-input-icon">
                  🔒
                </div>

                <input
                  id="password"
                  type="password"
                  className="login-form-input"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />

              </div>

            </div>


            {/* Submit */}

            <button
              type="submit"
              className="login-btn"
              disabled={loading}
            >

              {loading ? (
                <>
                  <span className="login-spinner"></span>
                  Logging in...
                </>
              ) : (
                <>
                  {loginType === "authority"
                    ? "Authority Login"
                    : "Login"}

                  <span>→</span>
                </>
              )}

            </button>

          </form>


          {/* =================================================
              APPLICANT REGISTER
          ================================================== */}

          {loginType === "applicant" && (
            <>
              <div className="login-divider">
                <span>OR</span>
              </div>

              <p className="login-register-prompt">

                Don't have an account?{" "}

                <Link to="/register">
                  Create an account
                </Link>

              </p>
            </>
          )}


          {/* =================================================
              SECURITY
          ================================================== */}

          <div className="login-security">

            <span>🔒</span>

            <p>
              Your account information is protected
              through the university portal.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Login;
