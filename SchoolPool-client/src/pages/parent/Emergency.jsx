
import { useState, useEffect } from "react";
import api from "../../api/api";

export default function Emergency() {
  const [rideId, setRideId] = useState("");
  const [location, setLocation] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  async function triggerAlert() {
    if (!rideId) return alert("Enter Ride ID");

    setLoading(true);
    try {
      await api.post("/EmergencyAlert/trigger", {
        rideId: Number(rideId),
        location,
      });
      alert("🚨 Emergency Alert Sent!");
      loadAlerts();
    } catch (err) {
      alert("Error sending alert");
    } finally {
      setLoading(false);
    }
  }

  function getLocation() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve(`${pos.coords.latitude}, ${pos.coords.longitude}`);
      },
      () => reject("Location access denied")
    );
  });
}

  async function loadAlerts() {
    if (!rideId) return;
    try {
      const res = await api.get(`/EmergencyAlert/ride/${rideId}`);
      setAlerts(res.data);
    } catch {}
  }

  async function resolveAlert(id) {
    await api.put(`/EmergencyAlert/${id}/resolve`);
    loadAlerts();
  }

  return (
    <div>
      <h2 className="page-title">🚨 Emergency Control</h2>

      <div className="card card-pad" style={{ marginBottom: "20px" }}>
        <input
          className="form-control"
          placeholder="Enter Ride ID"
          value={rideId}
          onChange={(e) => setRideId(e.target.value)}
        />

        <input
          className="form-control"
          placeholder="Location (optional)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          style={{ marginTop: "10px" }}
        />

        <button
          className="btn btn-danger"
          style={{ marginTop: "15px", width: "100%" }}
          onClick={triggerAlert}
          disabled={loading}
        >
          🚨 Trigger Emergency
        </button>
      </div>

      <div className="card">
        <h3 style={{ padding: "15px" }}>Alerts</h3>

        {alerts.length === 0 ? (
          <p style={{ padding: "15px" }}>No alerts</p>
        ) : (
          alerts.map((a) => (
            <div className="item-card" key={a.alertId}>
              <div>
                <div><b>Alert #{a.alertId}</b></div>
                <div>Status: {a.status}</div>
                <div>Location: {a.location || "N/A"}</div>
              </div>

              {a.status === "Active" && (
                <button
                  className="btn btn-success"
                  onClick={() => resolveAlert(a.alertId)}
                >
                  Resolve
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}