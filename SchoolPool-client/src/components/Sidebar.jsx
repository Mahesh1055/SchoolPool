import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const parentLinks = [
  { to: "/dashboard",     icon: "⊞",  label: "Dashboard" },
  { to: "/children",      icon: "👦",  label: "Children" },
  { to: "/vehicles",      icon: "🚗",  label: "Vehicles" },
  { to: "/groups",        icon: "🔍",  label: "Find Groups" },
  { to: "/my-groups",     icon: "👥",  label: "My Groups" },
  { to: "/start-ride",    icon: "▶",   label: "Start Ride" },
  { to: "/ride-history",  icon: "📋",  label: "Ride History" },
  { to: "/attendance",    icon: "✓",   label: "Attendance" },
  { to: "/live-tracking", icon: "📍",  label: "Live Tracking" },
  { to: "/notifications", icon: "🔔",  label: "Notifications" },
  { to: "/payments",      icon: "💳",  label: "Payments" },
  { to: "/emergency",     icon: "🚨",  label: "Emergency" },
];

const adminLinks = [
  { to: "/admin/dashboard", icon: "⊞", label: "Dashboard" },
  { to: "/admin/users", icon: "👤", label: "Users" },
  { to: "/admin/schools", icon: "🏫", label: "Schools" },
  { to: "/admin/groups", icon: "👥", label: "Groups" },
  { to: "/admin/children", icon: "👦", label: "Children" },
  { to: "/admin/vehicles", icon: "🚗", label: "Vehicles" },
  { to: "/admin/ride-approvals", icon: "✓", label: "Ride Approvals" },
  { to: "/admin/rides", icon: "🚌", label: "All Rides" },
  { to: "/admin/live-tracking", icon: "📍", label: "Live Tracking" },
  { to: "/admin/verifications", icon: "📄", label: "Verifications" },
  { to: "/admin/notifications", icon: "🔔", label: "Notifications" },
  { to: "/admin/emergency", icon: "🚨", label: "Emergency Alerts" },
  { to: "/admin/payments", icon: "💳", label: "Payments" },
];

function getInitials(name = "") {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

// ── Weather Widget ────────────────────────────────────────────────────────────
function WeatherWidget() {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    // Get user location then fetch weather
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current_weather=true`
          );
          const data = await res.json();
          const code = data.current_weather?.weathercode;
          const temp = Math.round(data.current_weather?.temperature);

          // Map weather code to label and icon
          const getWeather = (c) => {
            if (c === 0)          return { label: "Sunny",        icon: "☀️" };
            if (c <= 2)           return { label: "Partly Cloudy", icon: "⛅" };
            if (c <= 3)           return { label: "Cloudy",        icon: "☁️" };
            if (c <= 48)          return { label: "Foggy",         icon: "🌫️" };
            if (c <= 57)          return { label: "Drizzle",       icon: "🌦️" };
            if (c <= 67)          return { label: "Rainy",         icon: "🌧️" };
            if (c <= 77)          return { label: "Snowy",         icon: "❄️" };
            if (c <= 82)          return { label: "Showers",       icon: "🌦️" };
            if (c <= 99)          return { label: "Thunderstorm",  icon: "⛈️" };
            return { label: "Clear", icon: "🌤️" };
          };

          const { label, icon } = getWeather(code);
          setWeather({ temp, label, icon });
        } catch { }
      },
      () => { } // silently fail if no permission
    );
  }, []);

  if (!weather) return null;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "6px 10px",
      background: "rgba(255,255,255,0.07)",
      borderRadius: "8px",
      marginBottom: "10px",
      fontSize: "0.78rem",
      color: "rgba(255,255,255,0.75)"
    }}>
      <span style={{ fontSize: "1rem" }}>{weather.icon}</span>
      <span style={{ fontWeight: 600 }}>{weather.temp}°C</span>
      <span>{weather.label}</span>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links = user?.role === "Admin" ? adminLinks : parentLinks;

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🚌</div>
          <div>
            <div className="sidebar-logo-text">SchoolPool</div>
            <span className="sidebar-logo-sub">Safe School Commute</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">
          {user?.role === "Admin" ? "Admin Panel" : "Menu"}
        </div>

        {links.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={`sidebar-link ${pathname === link.to ? "active" : ""}`}
          >
            <span style={{ fontSize: "16px", width: "20px", textAlign: "center" }}>
              {link.icon}
            </span>
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {/* Weather */}
        <WeatherWidget />

        {/* User info + logout */}
        <div className="sidebar-user">
          <div className="user-avatar">{getInitials(user?.fullName)}</div>
          <div className="user-info">
            <div className="user-name">{user?.fullName || "User"}</div>
            <div className="user-role">{user?.role}</div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16,17 21,12 16,7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}