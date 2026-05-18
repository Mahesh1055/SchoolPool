import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./routes/PrivateRoute";
import Layout from "./layouts/DashboardLayout";
import { AdminChildren, AdminVehicles, AdminRideApprovals } from "./pages/admin/AdminPages";

// Auth
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

// Parent
import Dashboard from "./pages/parent/Dashboard";
import Children from "./pages/parent/Children";
import {
  Vehicles, Groups, MyGroups, Notifications,
  StartRide, RideHistory, Attendance,
  ParentLiveTracking, ParentPayments
} from "./pages/parent/ParentPages";
import Emergency from "./pages/parent/Emergency";

// Admin
import {
  AdminDashboard, Users, Schools, AdminGroups,
  AdminRides, Verifications, AdminNotifications,
  AdminLiveTracking, AdminPayments
} from "./pages/admin/AdminPages";
import AdminEmergency from "./pages/admin/AdminEmergency";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Parent Routes */}
          <Route path="/dashboard" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
          <Route path="/children" element={<PrivateRoute><Layout><Children /></Layout></PrivateRoute>} />
          <Route path="/vehicles" element={<PrivateRoute><Layout><Vehicles /></Layout></PrivateRoute>} />
          <Route path="/groups" element={<PrivateRoute><Layout><Groups /></Layout></PrivateRoute>} />
          <Route path="/my-groups" element={<PrivateRoute><Layout><MyGroups /></Layout></PrivateRoute>} />
          <Route path="/notifications" element={<PrivateRoute><Layout><Notifications /></Layout></PrivateRoute>} />
          <Route path="/start-ride" element={<PrivateRoute><Layout><StartRide /></Layout></PrivateRoute>} />
          <Route path="/ride-history" element={<PrivateRoute><Layout><RideHistory /></Layout></PrivateRoute>} />
          <Route path="/attendance" element={<PrivateRoute><Layout><Attendance /></Layout></PrivateRoute>} />
          <Route path="/live-tracking" element={<PrivateRoute><Layout><ParentLiveTracking /></Layout></PrivateRoute>} />
          <Route path="/payments" element={<PrivateRoute><Layout><ParentPayments /></Layout></PrivateRoute>} />
          <Route path="/emergency" element={<PrivateRoute><Layout><Emergency /></Layout></PrivateRoute>} />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<PrivateRoute role="Admin"><Layout><AdminDashboard /></Layout></PrivateRoute>} />
          <Route path="/admin/users" element={<PrivateRoute role="Admin"><Layout><Users /></Layout></PrivateRoute>} />
          <Route path="/admin/schools" element={<PrivateRoute role="Admin"><Layout><Schools /></Layout></PrivateRoute>} />
          <Route path="/admin/groups" element={<PrivateRoute role="Admin"><Layout><AdminGroups /></Layout></PrivateRoute>} />
          <Route path="/admin/rides" element={<PrivateRoute role="Admin"><Layout><AdminRides /></Layout></PrivateRoute>} />
          <Route path="/admin/verifications" element={<PrivateRoute role="Admin"><Layout><Verifications /></Layout></PrivateRoute>} />
          <Route path="/admin/notifications" element={<PrivateRoute role="Admin"><Layout><AdminNotifications /></Layout></PrivateRoute>} />
          <Route path="/admin/live-tracking" element={<PrivateRoute role="Admin"><Layout><AdminLiveTracking /></Layout></PrivateRoute>} />
          <Route path="/admin/payments" element={<PrivateRoute role="Admin"><Layout><AdminPayments /></Layout></PrivateRoute>} />
          <Route path="/admin/emergency" element={<PrivateRoute role="Admin"><Layout><AdminEmergency /></Layout></PrivateRoute>} />
          <Route path="/admin/children" element={<PrivateRoute role="Admin"><Layout><AdminChildren /></Layout></PrivateRoute>} />
          <Route path="/admin/vehicles" element={<PrivateRoute role="Admin"><Layout><AdminVehicles /></Layout></PrivateRoute>} />
          <Route path="/admin/ride-approvals" element={<PrivateRoute role="Admin"><Layout><AdminRideApprovals /></Layout></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}