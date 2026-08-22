export default function StatusBadge({ status, className = "" }) {
  if (!status) return <span className="status-badge unknown">-</span>;

  const raw = String(status).toUpperCase();
  const formatted = raw.replaceAll("_", " ");
  const statusSlug = raw.toLowerCase().replaceAll("_", "-");

  return (
    <span className={`status-badge ${statusSlug} ${className}`}>
      <span className="status-badge-dot" aria-hidden="true" />
      <span className="status-badge-text">{formatted}</span>
    </span>
  );
}

