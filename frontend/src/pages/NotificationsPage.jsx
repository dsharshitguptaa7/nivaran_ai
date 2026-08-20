import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCurrentUser, logoutUser } from "../services/authService";
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../services/notificationService";

import AuthorityHeader from "../components/AuthorityHeader";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("ALL"); // ALL, UNREAD, READ
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadUserAndNotifications();
  }, []);

  const loadUserAndNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      const currentUser = await getCurrentUser();
      if (!currentUser) {
        navigate("/login");
        return;
      }
      setUser(currentUser);

      const notifs = await getNotifications({ unread_only: false, limit: 100 });
      setNotifications(notifs || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  const handleMarkRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
    } catch (err) {
      console.error("Failed to mark read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setActionLoading(true);
      await markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
    } catch (err) {
      console.error("Failed to mark all read:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this notification?")) return;
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const handleNavigateToGrievance = (notif) => {
    if (!notif.is_read) {
      markNotificationAsRead(notif.id).catch(console.error);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
    }

    const trackingId = notif.grievance_tracking_id || notif.grievance_id;
    if (!trackingId) return;

    const role = (user?.role || "").toUpperCase();
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

  const getPortalHome = () => {
    const role = (user?.role || "").toUpperCase();
    if (role === "MANAGER") return "/manager";
    if (role === "ASSISTANT_DEAN") return "/assistant-dean";
    if (role === "ASSOCIATE_DEAN") return "/associate-dean";
    if (role === "DEAN") return "/dean";
    return "/dashboard";
  };

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  const readCount = useMemo(() => {
    return notifications.filter((n) => n.is_read).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (activeTab === "UNREAD") {
      return notifications.filter((n) => !n.is_read);
    }
    if (activeTab === "READ") {
      return notifications.filter((n) => n.is_read);
    }
    return notifications;
  }, [notifications, activeTab]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case "DOCUMENT_REQUESTED":
        return { icon: "📄", bg: "#fef3c7", color: "#92400e", label: "Document Request" };
      case "DOCUMENT_UPLOADED":
        return { icon: "📤", bg: "#eff6ff", color: "#1e40af", label: "Document Uploaded" };
      case "DOCUMENT_APPROVED":
        return { icon: "✓", bg: "#ecfdf5", color: "#065f46", label: "Document Approved" };
      case "DOCUMENT_REJECTED":
        return { icon: "⚠️", bg: "#fef2f2", color: "#991b1b", label: "Action Required" };
      case "GRIEVANCE_ASSIGNED":
        return { icon: "📌", bg: "#eef2ff", color: "#3730a3", label: "Assignment" };
      case "GRIEVANCE_FORWARDED":
        return { icon: "↗️", bg: "#f3e8ff", color: "#6b21a8", label: "Forwarded" };
      case "GRIEVANCE_ESCALATED":
        return { icon: "🚨", bg: "#ffe4e6", color: "#9f1239", label: "Escalated" };
      case "GRIEVANCE_RESOLVED":
        return { icon: "🎉", bg: "#f0fdf4", color: "#166534", label: "Resolved" };
      case "GRIEVANCE_CLOSED":
        return { icon: "🔒", bg: "#f1f5f9", color: "#334155", label: "Closed" };
      case "REMINDER":
        return { icon: "⏳", bg: "#fff7ed", color: "#9a3412", label: "Reminder" };
      case "GRIEVANCE_SUBMITTED":
        return { icon: "📝", bg: "#f0fdfa", color: "#115e59", label: "Submitted" };
      default:
        return { icon: "🔔", bg: "#f8fafc", color: "#475569", label: "Notification" };
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(dateStr);
    }
  };

  return (
    <div className="notif-page-layout">
      <AuthorityHeader
        userName={user?.full_name || "User"}
        userRole={user?.role || "USER"}
        portalHome={getPortalHome()}
        onLogout={handleLogout}
      />

      <main className="notif-page-main">
        {/* BREADCRUMB & HEADER */}
        <div className="notif-page-topbar">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <Link to={getPortalHome()} style={{ color: "#64748b", textDecoration: "none", fontSize: "0.85rem" }}>
                ← Back to Dashboard
              </Link>
            </div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "800", color: "#0f172a" }}>
              Notification Center
            </h1>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.88rem", color: "#64748b" }}>
              Stay updated on grievance progress, document requirements, and workflow actions.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {unreadCount > 0 && (
              <button
                type="button"
                className="authority-btn-secondary"
                onClick={handleMarkAllRead}
                disabled={actionLoading}
                style={{ fontSize: "0.84rem", padding: "8px 16px" }}
              >
                ✓ Mark all as read
              </button>
            )}

            <button
              type="button"
              className="authority-btn-secondary"
              onClick={loadUserAndNotifications}
              style={{ fontSize: "0.84rem", padding: "8px 14px" }}
              title="Refresh Notifications"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="notif-tabs-bar">
          <button
            type="button"
            className={`notif-tab-btn ${activeTab === "ALL" ? "notif-tab-btn-active" : ""}`}
            onClick={() => setActiveTab("ALL")}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            className={`notif-tab-btn ${activeTab === "UNREAD" ? "notif-tab-btn-active" : ""}`}
            onClick={() => setActiveTab("UNREAD")}
          >
            Unread ({unreadCount})
          </button>
          <button
            type="button"
            className={`notif-tab-btn ${activeTab === "READ" ? "notif-tab-btn-active" : ""}`}
            onClick={() => setActiveTab("READ")}
          >
            Read ({readCount})
          </button>
        </div>

        {/* ERROR / LOADING */}
        {loading && <LoadingState message="Loading your notifications..." />}
        {error && <ErrorState message={error} onRetry={loadUserAndNotifications} />}

        {/* NOTIFICATIONS LIST */}
        {!loading && !error && (
          <div className="notif-full-list">
            {filteredNotifications.length === 0 ? (
              <div className="notif-page-empty">
                <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🔕</div>
                <h3 style={{ margin: "0 0 6px 0", fontSize: "1.1rem", color: "#1e293b" }}>
                  {activeTab === "UNREAD"
                    ? "No unread notifications"
                    : activeTab === "READ"
                    ? "No read notifications"
                    : "No notifications found"}
                </h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                  When important grievance actions occur, they will appear here.
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const styleMeta = getNotificationIcon(notif.notification_type);
                return (
                  <div
                    key={notif.id}
                    className={`notif-card ${!notif.is_read ? "notif-card-unread" : ""}`}
                    onClick={() => handleNavigateToGrievance(notif)}
                  >
                    <div
                      className="notif-card-icon"
                      style={{ background: styleMeta.bg, color: styleMeta.color }}
                    >
                      {styleMeta.icon}
                    </div>

                    <div className="notif-card-body">
                      <div className="notif-card-header">
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span
                            className="notif-badge-pill"
                            style={{ background: styleMeta.bg, color: styleMeta.color }}
                          >
                            {styleMeta.label}
                          </span>

                          {notif.grievance_tracking_id && (
                            <span className="notif-grievance-tag">
                              {notif.grievance_tracking_id}
                            </span>
                          )}

                          {!notif.is_read && <span className="notif-unread-badge">NEW</span>}
                        </div>

                        <span className="notif-card-time">
                          {formatDateTime(notif.created_at)}
                        </span>
                      </div>

                      <h3 className="notif-card-title">{notif.title}</h3>
                      <p className="notif-card-message">{notif.message}</p>

                      {notif.grievance_title && (
                        <div className="notif-card-grievance-title">
                          <strong>Related Subject:</strong> {notif.grievance_title}
                        </div>
                      )}
                    </div>

                    <div className="notif-card-actions" onClick={(e) => e.stopPropagation()}>
                      {notif.grievance_tracking_id && (
                        <button
                          type="button"
                          className="authority-btn-primary"
                          style={{ fontSize: "0.82rem", padding: "7px 14px", whiteSpace: "nowrap" }}
                          onClick={() => handleNavigateToGrievance(notif)}
                        >
                          View Grievance →
                        </button>
                      )}

                      {!notif.is_read && (
                        <button
                          type="button"
                          className="authority-btn-secondary"
                          style={{ fontSize: "0.8rem", padding: "6px 12px", whiteSpace: "nowrap" }}
                          onClick={(e) => handleMarkRead(notif.id, e)}
                          title="Mark as Read"
                        >
                          ✓ Read
                        </button>
                      )}

                      <button
                        type="button"
                        className="notif-delete-btn"
                        onClick={(e) => handleDelete(notif.id, e)}
                        title="Delete notification"
                        aria-label="Delete"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
}
