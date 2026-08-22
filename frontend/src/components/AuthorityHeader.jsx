import { Link } from "react-router-dom";
import { LogOut, ShieldCheck } from "lucide-react";
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
      <Link to={portalHome} className="authority-brand" title="NIVARAN-AI Central Redressal System">
        <div className="authority-brand-mark">
          <ShieldCheck size={20} className="brand-shield-icon" />
        </div>
        <div className="authority-brand-text">
          <strong>
            NIVARAN<span className="brand-ai-tag">-AI</span>
          </strong>
          <span className="brand-institution-tag">Central Grievance Redressal • CSJMU</span>
        </div>
      </Link>

      {/* USER PROFILE, NOTIFICATIONS & LOGOUT */}
      <div className="authority-header-user">
        <NotificationBell userRole={userRole} />

        <div className="authority-user-info">
          <strong className="authority-user-name">{userName}</strong>
          <span className="authority-user-role-badge">{formattedRole}</span>
        </div>

        <div className="authority-user-avatar" title={userName}>
          {initial}
        </div>

        {onLogout && (
          <button
            type="button"
            className="authority-logout"
            onClick={onLogout}
            title="Sign out of portal"
          >
            <LogOut size={15} className="logout-icon" />
            <span>Logout</span>
          </button>
        )}
      </div>
    </header>
  );
}

