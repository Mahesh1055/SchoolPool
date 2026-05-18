// src/pages/admin/AdminEmergency.jsx
import { useEffect, useState } from "react";
import api from "../../api/api";

export default function AdminEmergency() {
  const [alerts, setAlerts] = useState([]);

  async function load() {
    const res = await api.get("/EmergencyAlert/active");
    setAlerts(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function resolve(id) {
    await api.put(`/EmergencyAlert/${id}/resolve`);
    load();
  }

  return (
    <div>
      <h2 className="page-title">🚨 Active Emergencies</h2>

      <div className="card">
        {alerts.length === 0 ? (
          <p style={{ padding: "15px" }}>No active alerts</p>
        ) : (
          alerts.map((a) => (
            <div className="item-card" key={a.alertId}>
              <div>
                <div><b>Ride #{a.rideId}</b></div>
                <div>Location: {a.location}</div>
              </div>

              <button
                className="btn btn-danger"
                onClick={() => resolve(a.alertId)}
              >
                Resolve
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}