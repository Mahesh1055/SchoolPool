// ─────────────────────────────────────────────────────────
//  FILE:  src/components/EmergencyAlert.jsx
//
//  Usage on the parent/driver ride page:
//    <EmergencyAlert rideId={42} token={jwt} role="parent" />
//
//  For admin dashboard:
//    <EmergencyAlertAdmin token={jwt} />
// ─────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";

const API = "https://localhost:7086/api";
const HUB = "https://localhost:7086/hubs/tracking";

// ════════════════════════════════════════════════════════
//  PARENT / DRIVER VIEW
//  — big red SOS button + live alert banner via SignalR
// ════════════════════════════════════════════════════════
export default function EmergencyAlert({ rideId, token, role }) {
  const [location,     setLocation]     = useState("");
  const [activeAlert,  setActiveAlert]  = useState(null);  // incoming alert from SignalR
  const [myAlerts,     setMyAlerts]     = useState([]);    // list from API
  const [sending,      setSending]      = useState(false);
  const [sent,         setSent]         = useState(false);
  const connRef = useRef(null);

  // Fetch existing alerts for this ride
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/emergencyalert/ride/${rideId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setMyAlerts(await res.json());
      } catch (e) { console.error(e); }
    })();
  }, [rideId, token]);

  // SignalR — listen for live alerts from other parents
  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(HUB, { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    conn.on("EmergencyAlert", (data) => {
      setActiveAlert(data);
      // Also push into local list
      setMyAlerts(prev => [
        { alertId: data.alertId, rideId: data.rideId, location: data.location,
          alertTime: data.alertTime, status: "Active" },
        ...prev,
      ]);
    });

    conn.on("AlertResolved", ({ alertId }) => {
      setActiveAlert(prev => (prev?.alertId === alertId ? null : prev));
      setMyAlerts(prev =>
        prev.map(a => a.alertId === alertId ? { ...a, status: "Resolved" } : a)
      );
    });

    conn.start().then(() => {
      conn.invoke("JoinRide", String(rideId)).catch(console.error);
    }).catch(console.error);

    connRef.current = conn;
    return () => conn.stop();
  }, [rideId, token]);

  const triggerAlert = async () => {
    setSending(true);
    try {
      const res = await fetch(`${API}/emergencyalert/trigger`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({ rideId, location: location || null }),
      });
      if (res.ok) {
        setSent(true);
        setTimeout(() => setSent(false), 4000);
        setLocation("");
      }
    } catch (e) { console.error(e); }
    setSending(false);
  };

  const resolveAlert = async (alertId) => {
    try {
      await fetch(`${API}/emergencyalert/${alertId}/resolve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ padding: "1rem" }}>

      {/* ── Live incoming alert banner ── */}
      {activeAlert && (
        <div style={{
          background: "#fef2f2",
          border: "1.5px solid #fca5a5",
          borderRadius: 10, padding: "14px 16px",
          marginBottom: "1rem",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        }}>
          <div>
            <p style={{ margin: "0 0 4px", fontWeight: 500, fontSize: 15, color: "#991b1b" }}>
              Emergency alert — Ride #{activeAlert.rideId}
            </p>
            {activeAlert.location && (
              <p style={{ margin: "0 0 4px", fontSize: 13, color: "#b91c1c" }}>
                Location: {activeAlert.location}
              </p>
            )}
            <p style={{ margin: 0, fontSize: 12, color: "#dc2626" }}>
              {new Date(activeAlert.alertTime).toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={() => resolveAlert(activeAlert.alertId)}
            style={{
              padding: "6px 12px", borderRadius: 7, border: "none",
              background: "#dc2626", color: "#fff",
              fontWeight: 500, fontSize: 13, cursor: "pointer", flexShrink: 0,
            }}
          >
            Resolve
          </button>
        </div>
      )}

      {/* ── Trigger section ── */}
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 12, padding: "1.25rem",
        marginBottom: "1rem",
      }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 500 }}>
          Trigger emergency alert
        </h3>

        <input
          type="text"
          placeholder="Location description (optional)"
          value={location}
          onChange={e => setLocation(e.target.value)}
          style={{
            width: "100%", padding: "9px 12px",
            borderRadius: 8, border: "0.5px solid var(--color-border-secondary)",
            background: "var(--color-background-secondary)",
            color: "var(--color-text-primary)", fontSize: 14,
            marginBottom: 12, boxSizing: "border-box",
          }}
        />

        <button
          onClick={triggerAlert}
          disabled={sending}
          style={{
            width: "100%", padding: "12px 0", borderRadius: 8, border: "none",
            background: sent ? "#16a34a" : "#dc2626",
            color: "#fff", fontWeight: 500, fontSize: 15,
            cursor: sending ? "not-allowed" : "pointer",
            transition: "background 0.3s",
          }}
        >
          {sending ? "Sending…" : sent ? "Alert sent!" : "SOS — Send emergency alert"}
        </button>
      </div>

      {/* ── Alert history ── */}
      {myAlerts.length > 0 && (
        <div>
          <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--color-text-secondary)" }}>
            Alert history for this ride
          </p>
          {myAlerts.map(a => (
            <div key={a.alertId} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 14px",
              background: "var(--color-background-secondary)",
              borderRadius: 8, marginBottom: 6, fontSize: 13,
            }}>
              <div>
                <span style={{ fontWeight: 500 }}>
                  {a.status === "Active" ? "🔴 Active" : "✅ Resolved"}
                </span>
                {a.location && (
                  <span style={{ marginLeft: 8, color: "var(--color-text-secondary)" }}>
                    {a.location}
                  </span>
                )}
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--color-text-tertiary)" }}>
                  {new Date(a.alertTime).toLocaleString()}
                </p>
              </div>
              {a.status === "Active" && (
                <button
                  onClick={() => resolveAlert(a.alertId)}
                  style={{
                    padding: "4px 10px", borderRadius: 6, border: "none",
                    background: "#dc2626", color: "#fff",
                    fontSize: 12, cursor: "pointer",
                  }}
                >
                  Resolve
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
//  ADMIN VIEW — all active alerts across all rides
// ════════════════════════════════════════════════════════
export function EmergencyAlertAdmin({ token }) {
  const [alerts,   setAlerts]   = useState([]);
  const [loading,  setLoading]  = useState(true);

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API}/emergencyalert/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAlerts(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchAlerts(); }, [token]);

  const resolve = async (alertId, rideId) => {
    await fetch(`${API}/emergencyalert/${alertId}/resolve`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    setAlerts(prev => prev.filter(a => a.alertId !== alertId));
  };

  if (loading) return (
    <p style={{ padding: "1rem", color: "var(--color-text-secondary)", fontSize: 14 }}>
      Loading active alerts…
    </p>
  );

  if (alerts.length === 0) return (
    <div style={{ padding: "1.5rem", textAlign: "center" }}>
      <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
        No active emergencies right now.
      </p>
    </div>
  );

  return (
    <div style={{ padding: "1rem" }}>
      <p style={{ margin: "0 0 12px", fontWeight: 500 }}>
        Active emergencies ({alerts.length})
      </p>
      {alerts.map(a => (
        <div key={a.alertId} style={{
          background: "#fef2f2",
          border: "1px solid #fca5a5",
          borderRadius: 10, padding: "14px 16px",
          marginBottom: 10,
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        }}>
          <div>
            <p style={{ margin: "0 0 4px", fontWeight: 500, color: "#991b1b" }}>
              Ride #{a.rideId}
            </p>
            {a.location && (
              <p style={{ margin: "0 0 4px", fontSize: 13, color: "#b91c1c" }}>
                {a.location}
              </p>
            )}
            <p style={{ margin: 0, fontSize: 12, color: "#dc2626" }}>
              {new Date(a.alertTime).toLocaleString()}
            </p>
          </div>
          <button
            onClick={() => resolve(a.alertId, a.rideId)}
            style={{
              padding: "7px 14px", borderRadius: 7, border: "none",
              background: "#dc2626", color: "#fff",
              fontWeight: 500, fontSize: 13, cursor: "pointer",
            }}
          >
            Resolve
          </button>
        </div>
      ))}
      <button
        onClick={fetchAlerts}
        style={{
          marginTop: 4, padding: "8px 16px", borderRadius: 8,
          border: "0.5px solid var(--color-border-secondary)",
          background: "transparent", color: "var(--color-text-secondary)",
          fontSize: 13, cursor: "pointer",
        }}
      >
        Refresh
      </button>
    </div>
  );
}
