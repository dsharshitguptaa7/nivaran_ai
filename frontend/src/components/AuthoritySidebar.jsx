import { Link, useLocation } from "react-router-dom";

export default function AuthoritySidebar({
  portalLabel = "AUTHORITY PORTAL",
  navItems = [],
  userName = "Officer",
  userRole = "OFFICER",
  onLogout,
}) {
  const location = useLocation();
  const initial = userName ? userName.charAt(0).toUpperCase() : "A";
  const formattedRole = String(userRole).replaceAll("_", " ");

  return (
    <aside className="authority-sidebar">
      {/* PORTAL LABEL CHIP */}
      <div className="authority-sidebar-label">
        <span>{portalLabel}</span>
      </div>

      {/* NAVIGATION ITEMS */}
      <nav className="authority-sidebar-nav">
        {navItems.map((item, idx) => {
          const isActive = item.active !== undefined 
            ? item.active 
            : (item.path ? location.pathname === item.path : false);

          if (item.href) {
            return (
              <a
                key={idx}
                href={item.href}
                className={`authority-nav-item ${isActive ? "active" : ""}`}
              >
                {item.icon && <span className="authority-nav-icon">{item.icon}</span>}
                <span className="authority-nav-text">{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className="authority-nav-badge">{item.count}</span>
                )}
              </a>
            );
          }

          return (
            <Link
              key={idx}
              to={item.path || "#"}
              className={`authority-nav-item ${isActive ? "active" : ""}`}
              onClick={item.onClick}
            >
              {item.icon && <span className="authority-nav-icon">{item.icon}</span>}
              <span className="authority-nav-text">{item.label}</span>
              {item.count !== undefined && item.count > 0 && (
                <span className="authority-nav-badge">{item.count}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* SIDEBAR FOOTER USER MINI */}
      <div className="authority-sidebar-bottom">
        <div className="authority-sidebar-user">
          <div className="authority-sidebar-avatar">{initial}</div>
          <div className="authority-sidebar-user-details">
            <strong>{userName}</strong>
            <span>{formattedRole}</span>
          </div>
        </div>

        {onLogout && (
          <button
            type="button"
            className="authority-sidebar-logout-btn"
            onClick={onLogout}
            title="Sign out"
          >
            ↪ Sign Out
          </button>
        )}
      </div>
    </aside>
  );
}
