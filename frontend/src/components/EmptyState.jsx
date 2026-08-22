import React from "react";
import { Link } from "react-router-dom";
import { Inbox } from "lucide-react";

export default function EmptyState({
  icon,
  title = "No records found",
  description = "There are no items matching your criteria at this time.",
  actionText = "",
  actionLink = "",
  onAction,
  className = "",
}) {
  return (
    <div className={`empty-state-card ${className}`}>
      <div className="empty-state-icon" aria-hidden="true">
        {icon ? (
          typeof icon === "string" ? <span>{icon}</span> : icon
        ) : (
          <Inbox size={36} strokeWidth={1.5} className="empty-state-default-icon" />
        )}
      </div>
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

