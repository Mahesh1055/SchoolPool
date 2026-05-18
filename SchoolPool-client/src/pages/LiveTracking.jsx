// ─────────────────────────────────────────────────────────
//  FILE:  src/pages/LiveTracking.jsx
// ─────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import * as signalR from "@microsoft/signalr";
import L from "leaflet";

// Fix Leaflet default icon paths broken by Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom bus marker icon
const busIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:44px;height:44px;border-radius:50%;
    background:#1d4ed8;border:3px solid #fff;
    box-shadow:0 2px 10px rgba(0,0,0,0.3);
    display:flex;align-items:center;justify-content:center;
    font-size:22px;
  ">🚌</div>`,
  iconSize:   [44, 44],
  iconAnchor: [22, 22],
  popupAnchor:[0, -26],
});

const API  = "https://localhost:7086/api";
const HUB  = "https://localhost:7086/hubs/tracking";
const PUNE = [18.5204, 73.8567];

// ── Auto-pan map when position updates ───────────────────
function MapPanner({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.panTo(position, { animate: true, duration: 0.8 });
  }, [position, map]);
  return null;
}

// ════════════════════════════════════════════════════════
//  DRIVER MODE — broadcasts GPS every 5 seconds
// ════════════════════════════════════════════════════════
function DriverMode({ rideId, token }) {
  const [status,  setStatus]  = useState("idle");
  const [lastPos, setLastPos] = useState(null);
  const watchRef   = useRef(null);
  const timerRef   = useRef(null);
  const currentPos = useRef(null);

  const sendLocation = useCallback(async ({ lat, lng, speed, accuracy }) => {
    try {
      await fetch(`${API}/gpslocation`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({
          rideId,
          latitude:  lat,
          longitude: lng,
          speed:     speed ? parseFloat((speed * 3.6).toFixed(1)) : null,
          accuracy:  accuracy ? parseFloat(accuracy.toFixed(1)) : null,
        }),
      });
    } catch (err) {
      console.error("Send location failed:", err);
    }
  }, [rideId, token]);

  const startTracking = () => {
    if (!navigator.geolocation) { setStatus("error"); return; }
    setStatus("tracking");

    watchRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        currentPos.current = {
          lat: coords.latitude, lng: coords.longitude,
          speed: coords.speed, accuracy: coords.accuracy,
        };
        setLastPos([coords.latitude, coords.longitude]);
      },
      (err) => { console.error(err); setStatus("error"); },
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 10000 }
    );

    timerRef.current = setInterval(() => {
      if (currentPos.current) sendLocation(currentPos.current);
    }, 5000);
  };

  const stopTracking = () => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    if (timerRef.current != null) clearInterval(timerRef.current);
    setStatus("stopped");
  };

  useEffect(() => () => stopTracking(), []);

  const isTracking = status === "tracking";

  return (
    <div style={{ padding: "1.5rem", maxWidth: 480, margin: "0 auto" }}>
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 12, padding: "1.5rem",
      }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 500 }}>
          Driver — Ride #{rideId}
        </h2>
        <p style={{ margin: "0 0 1.25rem", fontSize: 13, color: "var(--color-text-secondary)" }}>
          Sharing your GPS with all parents in this ride every 5 seconds.
        </p>

        <div style={{ marginBottom: "1rem" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500,
            background: isTracking ? "#dcfce7" : status === "error" ? "#fee2e2" : "var(--color-background-secondary)",
            color: isTracking ? "#166534" : status === "error" ? "#991b1b" : "var(--color-text-secondary)",
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: isTracking ? "#16a34a" : status === "error" ? "#dc2626" : "#9ca3af",
            }}/>
            {status === "idle"     && "Not started"}
            {status === "tracking" && "Live — broadcasting location"}
            {status === "stopped"  && "Stopped"}
            {status === "error"    && "GPS unavailable"}
          </span>
        </div>

        {lastPos && (
          <div style={{
            background: "var(--color-background-secondary)",
            borderRadius: 8, padding: "10px 14px",
            marginBottom: "1.25rem", fontSize: 13,
          }}>
            <span style={{ color: "var(--color-text-secondary)" }}>Last sent: </span>
            <span style={{ fontFamily: "monospace" }}>
              {lastPos[0].toFixed(5)}, {lastPos[1].toFixed(5)}
            </span>
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={startTracking} disabled={isTracking}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
              background: isTracking ? "#9ca3af" : "#1d4ed8",
              color: "#fff", fontWeight: 500, fontSize: 14,
              cursor: isTracking ? "not-allowed" : "pointer",
            }}
          >
            Start tracking
          </button>
          <button
            onClick={stopTracking} disabled={!isTracking}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 8,
              border: "0.5px solid var(--color-border-secondary)",
              background: "transparent", color: "var(--color-text-primary)",
              fontWeight: 500, fontSize: 14,
              cursor: !isTracking ? "not-allowed" : "pointer",
              opacity: !isTracking ? 0.45 : 1,
            }}
          >
            Stop
          </button>
        </div>

        {status === "error" && (
          <p style={{ marginTop: "1rem", fontSize: 13, color: "#991b1b" }}>
            Please allow location permission in your browser and try again.
          </p>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
//  PARENT MODE — watches live map via SignalR
// ════════════════════════════════════════════════════════
function ParentMode({ rideId, token }) {
  const [position,  setPosition]  = useState(null);
  const [path,      setPath]      = useState([]);
  const [speed,     setSpeed]     = useState(null);
  const [lastSeen,  setLastSeen]  = useState(null);
  const [connState, setConnState] = useState("connecting");
  const connRef = useRef(null);

  // Fetch last known position on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/gpslocation/ride/${rideId}/latest`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const d   = await res.json();
          const pos = [d.latitude, d.longitude];
          setPosition(pos);
          setPath([pos]);
          setSpeed(d.speed);
          setLastSeen(new Date(d.recordedAt));
        }
      } catch (e) { console.error("Latest fetch failed:", e); }
    })();
  }, [rideId, token]);

  // SignalR connection
  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(HUB, { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    conn.on("LocationUpdate", (data) => {
      const pos = [data.latitude, data.longitude];
      setPosition(pos);
      setPath(prev => [...prev, pos]);
      setSpeed(data.speed);
      setLastSeen(new Date(data.recordedAt));
    });

    conn.start()
      .then(() => {
        setConnState("live");
        conn.invoke("JoinRide", String(rideId)).catch(console.error);
      })
      .catch(() => setConnState("error"));

    conn.onreconnecting(() => setConnState("connecting"));
    conn.onreconnected(() => {
      setConnState("live");
      conn.invoke("JoinRide", String(rideId)).catch(console.error);
    });
    conn.onclose(() => setConnState("error"));

    connRef.current = conn;
    return () => conn.stop();
  }, [rideId, token]);

  const dotColor = { live: "#16a34a", connecting: "#d97706", error: "#dc2626" }[connState];
  const dotLabel = { live: "Live", connecting: "Connecting…", error: "Disconnected" }[connState];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", maxHeight: 720 }}>

      {/* Top status bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 16px",
        background: "var(--color-background-primary)",
        borderBottom: "0.5px solid var(--color-border-tertiary)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 500, fontSize: 15 }}>Ride #{rideId} — live map</span>
          {speed != null && (
            <span style={{
              fontSize: 12, padding: "2px 8px", borderRadius: 6,
              background: "var(--color-background-secondary)",
              color: "var(--color-text-secondary)",
            }}>
              {speed.toFixed(0)} km/h
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, display: "inline-block" }}/>
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{dotLabel}</span>
          {lastSeen && (
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginLeft: 6 }}>
              {lastSeen.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <MapContainer
          center={position ?? PUNE}
          zoom={15}
          style={{ width: "100%", height: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
          />
          {path.length > 1 && (
            <Polyline
              positions={path}
              pathOptions={{ color: "#1d4ed8", weight: 4, opacity: 0.65 }}
            />
          )}
          {position && (
            <Marker position={position} icon={busIcon}>
              <Popup>
                <strong>School bus</strong><br />
                {position[0].toFixed(5)}, {position[1].toFixed(5)}<br />
                {speed != null && `${speed.toFixed(0)} km/h`}
              </Popup>
            </Marker>
          )}
          {position && <MapPanner position={position} />}
        </MapContainer>

        {/* Waiting overlay */}
        {!position && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none", zIndex: 999,
          }}>
            <div style={{
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: 12, padding: "14px 22px", textAlign: "center",
            }}>
              <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-secondary)" }}>
                Waiting for driver to start sharing location…
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
//  MAIN EXPORT — ✅ Clean, no useAuth or localStorage here
// ════════════════════════════════════════════════════════
export default function LiveTracking({ rideId, role, token }) {
  if (!rideId || !token) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
        Missing ride ID or auth token.
      </div>
    );
  }
  return role === "driver"
    ? <DriverMode rideId={rideId} token={token} />
    : <ParentMode rideId={rideId} token={token} />;
}