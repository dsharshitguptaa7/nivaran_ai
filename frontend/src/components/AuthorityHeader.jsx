import { Link } from "react-router-dom";
import NotificationBell from "./NotificationBell";

export default function AuthorityHeader({
  userName = "Authority Officer",
  userRole = "OFFICER",
  portalHome = "/manager",
  onLogout,
}) {
  const initial = userName ? userName.charAt(0).toUpperCase() : "A";
  const formattedRole = String(userRole).replaceAll("_", " ").toUpperCase();

  return (
    <header className="authority-header">
      {/* BRAND / LOGO */}
      <Link to={portalHome} className="authority-brand">
        <div className="authority-brand-mark">N</div>
        <div className="authority-brand-text">
          <strong>
            NIVARAN<span>-AI</span>
          </strong>
          <span>AI-Assisted Grievance Redressal System • CSJMU</span>
        </div>
      </Link>


      {/* USER PROFILE, NOTIFICATIONS & LOGOUT */}
      <div className="authority-header-user">
        <NotificationBell userRole={userRole} />

        <div className="authority-user-info">
          <strong>{userName}</strong>
          <span className="authority-user-role-badge">{formattedRole}</span>
        </div>

        <div className="authority-user-avatar" title={userName}>
          {initial}
        </div>

        <button
          type="button"
          className="authority-logout"
          onClick={onLogout}
          title="Sign out of portal"
        >
          <span>↪</span>
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
