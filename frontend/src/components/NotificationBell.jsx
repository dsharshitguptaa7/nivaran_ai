import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../services/notificationService";

export default function NotificationBell({ userRole = "APPLICANT" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // 1. Fetch unread count periodically
  const fetchUnreadCount = async () => {
    try {
      const data = await getUnreadNotificationCount();
      setUnreadCount(data?.unread_count || 0);
    } catch (err) {
      console.error("Failed to fetch unread notification count:", err);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // 30s polling
    return () => clearInterval(interval);
  }, []);

  // 2. Fetch recent notifications when dropdown opens
  const fetchRecent = async () => {
    try {
      setLoading(true);
      const items = await getNotifications({ unread_only: false, limit: 8, offset: 0 });
      setRecentNotifications(items || []);
    } catch (err) {
      console.error("Failed to fetch recent notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDropdown = () => {
    if (!isOpen) {
      fetchRecent();
      fetchUnreadCount();
    }
    setIsOpen((prev) => !prev);
  };

  // 3. Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // 4. Mark all as read
  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      await markAllNotificationsAsRead();
      setUnreadCount(0);
      setRecentNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  // 5. Navigate to grievance based on role
  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      try {
        markNotificationAsRead(notif.id);
        setUnreadCount((c) => Math.max(0, c - 1));
        setRecentNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
      } catch (e) {
        console.error(e);
      }
    }

    setIsOpen(false);

    const trackingId = notif.grievance_tracking_id || notif.grievance_id;
    if (!trackingId) {
      navigate("/notifications");
      return;
    }

    const role = (userRole || "").toUpperCase();
    if (role === "MANAGER") {
      navigate(`/manager/grievances/${trackingId}`);
    } else if (role === "ASSISTANT_DEAN") {
      navigate(`/assistant-dean/grievances/${trackingId}`);
    } else if (role === "ASSOCIATE_DEAN") {
      navigate(`/associate-dean/grievances/${trackingId}`);
    } else if (role === "DEAN") {
      navigate(`/dean/grievances/${trackingId}`);
    } else {
      navigate(`/dashboard/grievances/${trackingId}`);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "DOCUMENT_REQUESTED":
        return { icon: "📄", bg: "#fef3c7", color: "#92400e" };
      case "DOCUMENT_UPLOADED":
        return { icon: "📤", bg: "#eff6ff", color: "#1e40af" };
      case "DOCUMENT_APPROVED":
        return { icon: "✓", bg: "#ecfdf5", color: "#065f46" };
      case "DOCUMENT_REJECTED":
        return { icon: "⚠️", bg: "#fef2f2", color: "#991b1b" };
      case "GRIEVANCE_ASSIGNED":
        return { icon: "📌", bg: "#eef2ff", color: "#3730a3" };
      case "GRIEVANCE_FORWARDED":
        return { icon: "↗️", bg: "#f3e8ff", color: "#6b21a8" };
      case "GRIEVANCE_ESCALATED":
        return { icon: "🚨", bg: "#ffe4e6", color: "#9f1239" };
      case "GRIEVANCE_RESOLVED":
        return { icon: "🎉", bg: "#f0fdf4", color: "#166534" };
      case "GRIEVANCE_CLOSED":
        return { icon: "🔒", bg: "#f1f5f9", color: "#334155" };
      case "REMINDER":
        return { icon: "⏳", bg: "#fff7ed", color: "#9a3412" };
      case "GRIEVANCE_SUBMITTED":
        return { icon: "📝", bg: "#f0fdfa", color: "#115e59" };
      default:
        return { icon: "🔔", bg: "#f8fafc", color: "#475569" };
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "";
    try {
      const now = new Date();
      const date = new Date(dateStr);
      const diffMs = now - date;
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSec < 60) return "Just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="notif-bell-container" ref={dropdownRef}>
      {/* BELL BUTTON */}
      <button
        type="button"
        className="notif-bell-btn"
        onClick={toggleDropdown}
        aria-label="Notifications"
        title="View Notifications"
      >
        <span className="notif-bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notif-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* DROPDOWN PANEL */}
      {isOpen && (
        <div className="notif-dropdown">
          {/* HEADER */}
          <div className="notif-dropdown-header">
            <div className="notif-dropdown-title">
              <strong>Notifications</strong>
              {unreadCount > 0 && (
                <span className="notif-header-unread-chip">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                className="notif-mark-all-btn"
                onClick={handleMarkAllRead}
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* LIST ITEMS */}
          <div className="notif-dropdown-list">
            {loading ? (
              <div className="notif-empty-state">
                <div style={{ fontSize: "1.5rem", marginBottom: "6px" }}>⏳</div>
                <p>Loading notifications...</p>
              </div>
            ) : recentNotifications.length === 0 ? (
              <div className="notif-empty-state">
                <div style={{ fontSize: "1.8rem", marginBottom: "8px" }}>🔕</div>
                <p style={{ fontWeight: "600", color: "#1e293b", margin: "0 0 4px 0" }}>
                  No notifications yet
                </p>
                <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                  You are all caught up!
                </span>
              </div>
            ) : (
              recentNotifications.map((notif) => {
                const styleMeta = getNotificationIcon(notif.notification_type);
                return (
                  <div
                    key={notif.id}
                    className={`notif-item ${!notif.is_read ? "notif-item-unread" : ""}`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div
                      className="notif-type-icon-wrapper"
                      style={{ background: styleMeta.bg, color: styleMeta.color }}
                    >
                      {styleMeta.icon}
                    </div>

                    <div className="notif-item-content">
                      <div className="notif-item-top">
                        <span className="notif-item-title">{notif.title}</span>
                        {!notif.is_read && <span className="notif-unread-dot" />}
                      </div>

                      <p className="notif-item-msg">{notif.message}</p>

                      <div className="notif-item-footer">
                        {notif.grievance_tracking_id && (
                          <span className="notif-grievance-tag">
                            {notif.grievance_tracking_id}
                          </span>
                        )}
                        <span className="notif-time-ago">
                          {formatTimeAgo(notif.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* FOOTER */}
          <div className="notif-dropdown-footer">
            <button
              type="button"
              className="notif-view-all-link"
              onClick={() => {
                setIsOpen(false);
                navigate("/notifications");
              }}
            >
              View All Notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
