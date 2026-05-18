import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import LiveTracking from "../LiveTracking";
import api from "../../api/api";

export default function AdminLiveTracking() {
  const { token } = useAuth();
  const [activeRides, setActiveRides] = useState([]);
  const [selectedRideId, setSelectedRideId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveRides();
  }, []);

  async function loadActiveRides() {
    setLoading(true);
    try {
      const res = await api.get("/Admin/rides");
      const started = res.data.filter(r => r.status === "Started");
      setActiveRides(started);
      if (started.length > 0) setSelectedRideId(started[0].rideId);
    } catch {
      setActiveRides([]);
    } finally { setLoading(false); }
  }

  // ✅ Get token directly from localStorage as fallback
  const authToken = token || localStorage.getItem("token");

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="page-title">Live Tracking</h2>
          <p className="page-subtitle">Monitor all active rides in real time</p>
        </div>
        <button className="btn btn-primary" onClick={loadActiveRides}>🔄 Refresh</button>
      </div>

      {loading ? (
        <div className="loader"><div className="spinner" /></div>
      ) : activeRides.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📍</div>
            <div className="empty-title">No active rides</div>
            <div className="empty-sub">Live tracking will appear here when a ride is in progress</div>
          </div>
        </div>
      ) : (
        <>
          {/* Ride selector */}
          <div className="card card-pad" style={{ marginBottom: "20px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "12px" }}>
              🟡 Active Rides ({activeRides.length})
            </h3>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {activeRides.map(r => (
                <button
                  key={r.rideId}
                  onClick={() => setSelectedRideId(r.rideId)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "2px solid",
                    borderColor: selectedRideId === r.rideId ? "var(--primary)" : "var(--border)",
                    background: selectedRideId === r.rideId ? "var(--primary-light)" : "var(--bg-2)",
                    color: selectedRideId === r.rideId ? "var(--primary)" : "var(--text-2)",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  🚌 Ride #{r.rideId}
                  <span style={{ fontSize: "0.75rem", fontWeight: 400, marginLeft: "6px" }}>
                    {r.groupName || "Group #" + r.groupId}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ✅ Only render LiveTracking when both rideId and token are ready */}
          {selectedRideId && authToken ? (
            <div className="card" style={{ overflow: "hidden", borderRadius: "12px" }}>
              <LiveTracking
                key={selectedRideId}
                rideId={selectedRideId}
                role="parent"
                token={authToken}
              />
            </div>
          ) : (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon">🔐</div>
                <div className="empty-title">Authentication required</div>
                <div className="empty-sub">Please log out and log in again</div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}