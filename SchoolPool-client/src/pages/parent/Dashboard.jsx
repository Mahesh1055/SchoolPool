import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getChildren } from "../../services/childService";
import { getVehicles } from "../../services/vehicleService";
import { getMyGroups } from "../../services/groupService";


export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ children: 0, vehicles: 0, groups: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getChildren(), getVehicles(), getMyGroups()])
      .then(([c, v, g]) => {
        setStats({ children: c.data.length, vehicles: v.data.length, groups: g.data.length });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const quickLinks = [
    { to: "/children", icon: "👦", label: "Add Child", sub: "Register your child", color: "blue" },
    { to: "/vehicles", icon: "🚗", label: "Add Vehicle", sub: "Register your vehicle", color: "amber" },
    { to: "/groups", icon: "🔍", label: "Find Group", sub: "Search nearby carpool groups", color: "green" },
    { to: "/start-ride", icon: "▶", label: "Start Ride", sub: "Begin today's ride", color: "red" },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="page-title">Good morning, {user?.fullName?.split(" ")[0]} 👋</h2>
          <p className="page-subtitle">Here's what's happening with your carpool today.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">👦</div>
          <div>
            <div className="stat-value">{loading ? "—" : stats.children}</div>
            <div className="stat-label">Children Registered</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">🚗</div>
          <div>
            <div className="stat-value">{loading ? "—" : stats.vehicles}</div>
            <div className="stat-label">Vehicles Added</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">👥</div>
          <div>
            <div className="stat-value">{loading ? "—" : stats.groups}</div>
            <div className="stat-label">Carpool Groups</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">🚌</div>
          <div>
            <div className="stat-value">0</div>
            <div className="stat-label">Active Rides Today</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "24px" }}>
        <div className="card-header">
          <span className="card-title">Quick Actions</span>
        </div>
        <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          {quickLinks.map(q => (
            <Link key={q.to} to={q.to} style={{ textDecoration: "none" }}>
              <div className="item-card" style={{ cursor: "pointer" }}>
                <div className={`stat-icon ${q.color}`} style={{ width: "40px", height: "40px" }}>{q.icon}</div>
                <div>
                  <div className="item-title">{q.label}</div>
                  <div className="item-sub">{q.sub}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Getting Started</span>
        </div>
        <div style={{ padding: "20px" }}>
          {[
            { done: stats.children > 0, label: "Register your child", to: "/children" },
            { done: stats.vehicles > 0, label: "Add your vehicle", to: "/vehicles" },
            { done: stats.groups > 0, label: "Join a carpool group", to: "/groups" },
          ].map((step, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: i < 2 ? "1px solid var(--border)" : "none" }}>
              <div style={{
                width: "24px", height: "24px", borderRadius: "50%",
                background: step.done ? "var(--success-light)" : "var(--bg-2)",
                color: step.done ? "var(--success)" : "var(--text-3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "13px", fontWeight: "700", flexShrink: 0
              }}>
                {step.done ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: "0.875rem", color: step.done ? "var(--text-3)" : "var(--text)", textDecoration: step.done ? "line-through" : "none" }}>
                {step.label}
              </span>
              {!step.done && (
                <Link to={step.to} className="btn btn-sm btn-secondary" style={{ marginLeft: "auto" }}>
                  Go →
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
