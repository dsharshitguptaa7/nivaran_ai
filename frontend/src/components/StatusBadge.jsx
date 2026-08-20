export default function StatusBadge({ status, className = "" }) {
  if (!status) return <span className="status-badge unknown">-</span>;

  const raw = String(status).toUpperCase();
  const formatted = raw.replaceAll("_", " ");
  const statusSlug = raw.toLowerCase().replaceAll("_", "-");

  // Consistent icon mapping
  let icon = "●";
  if (raw === "RESOLVED") icon = "✓";
  if (raw === "CLOSED") icon = "🔒";
  if (raw === "ESCALATED") icon = "▲";
  if (raw === "AI_PROCESSING") icon = "⚡";
  if (raw === "PENDING_REVIEW") icon = "⏳";
  if (raw === "ASSIGNED" || raw === "IN_PROGRESS") icon = "◉";
  if (raw === "AWAITING_INFORMATION" || raw === "PENDING_APPLICANT_RESPONSE") icon = "📂";
  if (raw === "REOPENED") icon = "↻";

  return (
    <span className={`status-badge ${statusSlug} ${className}`}>
      <span className="status-badge-dot">{icon}</span>
      <span className="status-badge-text">{formatted}</span>
    </span>
  );
}
