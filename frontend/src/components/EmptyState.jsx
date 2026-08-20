import { Link } from "react-router-dom";

export default function EmptyState({
  icon = "📭",
  title = "No records found",
  description = "There are no items matching your criteria at this time.",
  actionText = "",
  actionLink = "",
  onAction,
  className = "",
}) {
  return (
    <div className={`empty-state-card ${className}`}>
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{description}</p>

      {actionText && actionLink && (
        <Link to={actionLink} className="authority-primary-button empty-state-btn">
          {actionText}
        </Link>
      )}

      {actionText && onAction && !actionLink && (
        <button
          type="button"
          className="authority-primary-button empty-state-btn"
          onClick={onAction}
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
