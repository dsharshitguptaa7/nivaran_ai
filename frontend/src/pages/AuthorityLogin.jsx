import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  loginUser,
  getCurrentUser,
} from "../services/authService";


function AuthorityLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);


  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      // Login and save access token
      await loginUser(email, password);

      // Get logged-in user's details
      const user = await getCurrentUser();

      console.log("Authority user:", user);

      // Check authority role
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
        // Applicant or unknown role
        setError(
          "This account does not have authority access."
        );

        localStorage.removeItem("access_token");
      }

    } catch (err) {
      console.error("Authority login error:", err);

      setError(
        err?.message ||
        "Invalid authority credentials"
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="auth-page">

      {/* ================= LEFT BRAND ================= */}

      <div className="auth-brand">

        <Link
          to="/"
          className="auth-logo"
        >
          NIVARAN<span>-AI</span>
        </Link>


        <div className="auth-brand-content">

          <div className="auth-badge">
            AUTHORITY PORTAL
          </div>


          <h1>
            Manage grievances
            <span> intelligently.</span>
          </h1>


          <p>
            Review, assign, escalate and resolve
            grievances through the NIVARAN-AI
            administrative workflow.
          </p>


          <div className="auth-features">

            <div>
              <span>✓</span>
              AI-assisted grievance review
            </div>

            <div>
              <span>✓</span>
              Hierarchical grievance workflow
            </div>

            <div>
              <span>✓</span>
              Transparent escalation and tracking
            </div>

          </div>

        </div>

      </div>


      {/* ================= RIGHT FORM ================= */}

      <div className="auth-form-section">

        <div className="auth-form-container">

          <Link
            to="/"
            className="back-home"
          >
            ← Back to Home
          </Link>


          <div className="auth-heading">

            <h2>
              Authority Login
            </h2>

            <p>
              Login to your NIVARAN-AI
              administrative account
            </p>

          </div>


          {/* ERROR */}

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}


          {/* LOGIN FORM */}

          <form
            className="auth-form"
            onSubmit={handleLogin}
          >

            {/* EMAIL */}

            <div className="form-group">

              <label htmlFor="email">
                Official Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="Enter official email"
                autoComplete="email"
                required
              />

            </div>


            {/* PASSWORD */}

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
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />

            </div>


            {/* SUBMIT */}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading
                ? "Logging in..."
                : "Authority Login →"}
            </button>

          </form>


          <div className="auth-divider">
            <span>OR</span>
          </div>


          <p className="register-prompt">

            Applicant?

            {" "}

            <Link to="/login">
              Applicant Login
            </Link>

          </p>

        </div>

      </div>

    </div>
  );
}


export default AuthorityLogin;