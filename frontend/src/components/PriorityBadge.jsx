export default function PriorityBadge({ priority, className = "" }) {
  if (!priority) return <span className="priority-badge unknown">-</span>;

  const raw = String(priority).toUpperCase();
  const slug = raw.toLowerCase();

  return (
    <span className={`priority-badge ${slug} ${className}`}>
      <span className="priority-badge-dot">•</span>
      <span className="priority-badge-text">{raw}</span>
    </span>
  );
}
