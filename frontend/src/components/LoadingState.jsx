export default function LoadingState({
  message = "Loading information...",
  fullPage = false,
}) {
  if (fullPage) {
    return (
      <div className="loading-full-page">
        <div className="loading-spinner-ring" />
        <p className="loading-text">{message}</p>
      </div>
    );
  }

  return (
    <div className="loading-inline-state">
      <div className="loading-spinner-ring small" />
      <span className="loading-text">{message}</span>
    </div>
  );
}
