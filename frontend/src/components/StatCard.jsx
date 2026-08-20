export default function StatCard({
  icon = "▤",
  title = "Metric",
  value = "0",
  subtitle = "",
  variant = "default", // default, blue, green, orange, purple, maroon
  onClick,
  active = false,
  className = "",
}) {
  return (
    <div
      className={`stat-card ${variant} ${active ? "active" : ""} ${onClick ? "clickable" : ""} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={`stat-icon ${variant}`}>
        {icon}
      </div>

      <div className="stat-content">
        <span className="stat-title">{title}</span>
        <strong className="stat-value">{value}</strong>
        {subtitle && <small className="stat-subtitle">{subtitle}</small>}
      </div>
    </div>
  );
}
