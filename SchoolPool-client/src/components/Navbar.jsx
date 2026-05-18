import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getNotifications } from "../services/notificationService";

const pageTitles = {
  "/dashboard": { title: "Dashboard", sub: "Overview of your carpool activity" },
  "/children": { title: "Children", sub: "Manage your registered children" },
  "/vehicles": { title: "Vehicles", sub: "Your registered vehicles" },
  "/groups": { title: "Find Groups", sub: "Search and join carpool groups" },
  "/my-groups": { title: "My Groups", sub: "Groups you have joined" },
  "/start-ride": { title: "Start Ride", sub: "Begin a new ride" },
  "/ride-history": { title: "Ride History", sub: "Past and active rides" },
  "/attendance": { title: "Attendance", sub: "Mark child boarding and drop" },
  "/notifications": { title: "Notifications", sub: "Your alerts and updates" },
  "/admin/dashboard": { title: "Admin Dashboard", sub: "System overview" },
  "/admin/users": { title: "Users", sub: "Manage and verify users" },
  "/admin/schools": { title: "Schools", sub: "Manage registered schools" },
  "/admin/groups": { title: "Groups", sub: "Monitor all carpool groups" },
  "/admin/rides": { title: "Rides", sub: "Monitor all rides" },
  "/admin/verifications": { title: "Verifications", sub: "Pending document approvals" },
   // ... existing entries ...
  "/live-tracking":       { title: "Live Tracking", sub: "Track your ride in real time" },  // ADD
  "/payments":            { title: "Payments", sub: "View and make payments" },              // ADD
  "/admin/live-tracking": { title: "Live Tracking", sub: "Monitor all active rides" },      // ADD
  "/admin/payments":      { title: "Payments", sub: "Manage all payments" },
};

export default function Navbar() {
  const [unread, setUnread] = useState(0);
  const { pathname } = useLocation();
  const page = pageTitles[pathname] || { title: "SchoolPool", sub: "" };

  useEffect(() => {
    getNotifications()
      .then(res => setUnread(res.data.filter(n => !n.isRead).length))
      .catch(() => {});
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1>{page.title}</h1>
        {page.sub && <p>{page.sub}</p>}
      </div>

      <div className="topbar-right">
        <button className="icon-btn" title="Notifications">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {unread > 0 && <span className="notif-dot" />}
        </button>
      </div>
    </header>
  );
}
