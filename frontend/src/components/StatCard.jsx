import React from "react";

export default function StatCard({
  icon,
  title = "Metric",
  value = "0",
  subtitle = "",
  variant = "default", // default, blue, green, orange, purple, maroon, red
  onClick,
  active = false,
  className = "",
}) {
  const handleKeyDown = (e) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`stat-card ${variant} ${active ? "active" : ""} ${onClick ? "clickable" : ""} ${className}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-pressed={onClick ? active : undefined}
    >
      <div className="stat-card-header">
        <span className="stat-title">{title}</span>
        {icon && (
          <div className={`stat-icon-wrapper ${variant}`} aria-hidden="true">
            {typeof icon === "string" ? <span className="stat-icon-text">{icon}</span> : icon}
          </div>
        )}
      </div>

      <div className="stat-content">
        <strong className="stat-value">{value}</strong>
        {subtitle && <span className="stat-subtitle">{subtitle}</span>}
      </div>

      {onClick && <div className="stat-card-active-indicator" aria-hidden="true" />}
    </div>
  );
}

