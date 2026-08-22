import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";

export default function AuthoritySidebar({
  portalLabel = "AUTHORITY PORTAL",
  navItems = [],
  userName = "Officer",
  userRole = "OFFICER",
  onLogout,
}) {
  const location = useLocation();
  const initial = userName ? userName.charAt(0).toUpperCase() : "A";
  const formattedRole = String(userRole).replaceAll("_", " ").toUpperCase();

  return (
    <aside className="authority-sidebar">
      {/* PORTAL LABEL CHIP */}
      <div className="authority-sidebar-label">
        <div className="sidebar-label-indicator" />
        <span>{portalLabel}</span>
      </div>

      {/* NAVIGATION ITEMS */}
      <nav className="authority-sidebar-nav">
        {navItems.map((item, idx) => {
          if (item.isHeader) {
            return (
              <div key={idx} className="authority-nav-section-title">
                {item.label}
              </div>
            );
          }

          const isActive =
            item.active !== undefined
              ? item.active
              : item.path
              ? location.pathname === item.path
              : false;

          const content = (
            <>
              {item.icon && (
                <span className="authority-nav-icon" aria-hidden="true">
                  {typeof item.icon === "string" ? item.icon : React.cloneElement(item.icon, { size: 16 })}
                </span>
              )}
              <span className="authority-nav-text">{item.label}</span>
              {item.count !== undefined && item.count > 0 && (
                <span className={`authority-nav-badge ${item.badgeVariant || ""}`}>
                  {item.count}
                </span>
              )}
            </>
          );

          if (item.href) {
            return (
              <a
                key={idx}
                href={item.href}
                className={`authority-nav-item ${isActive ? "active" : ""}`}
              >
                {content}
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
              {content}
            </Link>
          );
        })}
      </nav>

      {/* SIDEBAR FOOTER USER MINI */}
      <div className="authority-sidebar-bottom">
        <div className="authority-sidebar-user">
          <div className="authority-sidebar-avatar">{initial}</div>
          <div className="authority-sidebar-user-details">
            <strong className="authority-sidebar-user-name">{userName}</strong>
            <span className="authority-sidebar-user-role">{formattedRole}</span>
          </div>
        </div>

        {onLogout && (
          <button
            type="button"
            className="authority-sidebar-logout-btn"
            onClick={onLogout}
            title="Sign out of portal"
          >
            <LogOut size={14} className="sidebar-logout-icon" />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </aside>
  );
}
