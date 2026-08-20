import { Link } from "react-router-dom";

export default function ErrorState({
  title = "Unable to complete request",
  message = "An unexpected error occurred while processing your request.",
  backLink = "",
  backText = "← Go Back",
  onRetry,
  className = "",
}) {
  return (
    <div className={`error-state-card ${className}`}>
      <div className="error-state-icon">!</div>
      <div className="error-state-content">
        <h3 className="error-state-title">{title}</h3>
        <p className="error-state-message">{message}</p>
      </div>

      <div className="error-state-actions">
        {onRetry && (
          <button
            type="button"
            className="authority-primary-button"
            onClick={onRetry}
          >
            ↻ Try Again
          </button>
        )}

        {backLink && (
          <Link to={backLink} className="secondary-button">
            {backText}
          </Link>
        )}
      </div>
    </div>
  );
}
