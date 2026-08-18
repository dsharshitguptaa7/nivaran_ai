import { Link } from "react-router-dom";

function Register() {
  return (
    <div className="auth-page">

      {/* Left Section */}
      <div className="auth-brand">

        <Link to="/" className="auth-logo">
          NIVARAN<span>-AI</span>
        </Link>

        <div className="auth-brand-content">
          <div className="auth-badge">
            JOIN NIVARAN-AI
          </div>

          <h1>
            Your grievance.
            <span> Your voice.</span>
          </h1>

          <p>
            Create your account to submit grievances, track
            their progress and stay informed throughout the
            redressal process.
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

      {/* Right Section */}
      <div className="auth-form-section">

        <div className="auth-form-container">

          <Link to="/" className="back-home">
            ← Back to Home
          </Link>

          <div className="auth-heading">
            <h2>Create account</h2>

            <p>
              Register for your NIVARAN-AI account
            </p>
          </div>

          <form className="auth-form">

            <div className="form-group">
              <label htmlFor="name">
                Full Name
              </label>

              <input
                id="name"
                type="text"
                placeholder="Enter your full name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">
                Email Address
              </label>

              <input
                id="email"
                type="email"
                placeholder="Enter your email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                placeholder="Create a password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                Confirm Password
              </label>

              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
              />
            </div>

            <button
              type="submit"
              className="auth-submit"
            >
              Create Account →
            </button>

          </form>

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