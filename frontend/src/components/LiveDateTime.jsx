import { useEffect, useState } from "react";

export default function LiveDateTime({ format = "full", className = "" }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentDate.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const formattedTime = currentDate.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  if (format === "compact") {
    return (
      <div className={`live-datetime-chip compact ${className}`} title="System Current Time">
        <span className="live-clock-icon">🕒</span>
        <span className="live-date-text">{formattedDate}</span>
        <span className="live-time-divider">•</span>
        <span className="live-time-text">{formattedTime}</span>
      </div>
    );
  }

  return (
    <div className={`live-datetime-chip ${className}`} title="Real-time Portal Clock">
      <div className="live-pulse-dot" />
      <span className="live-clock-icon">📅</span>
      <span className="live-date-text">{formattedDate}</span>
      <span className="live-time-divider">|</span>
      <span className="live-clock-icon">⏰</span>
      <strong className="live-time-text">{formattedTime}</strong>
    </div>
  );
}
