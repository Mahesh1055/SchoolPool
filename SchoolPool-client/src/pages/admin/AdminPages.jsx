import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import LiveTracking from "../LiveTracking";
import Payments from "../Payments";
import {
  getUsers, addUser, updateUser, verifyUser, deleteUser,
  getSchools, addSchool, updateSchool, deleteSchool,
  getGroups, verifyGroup, rejectGroup, updateGroup, deleteGroup,
  getRides, updateRideStatus, deleteRide,
  getVerifications, approveVerification, rejectVerification,
  sendNotification, sendToRole
} from "../../services/adminService";

// ── HELPERS ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 36 }) {
  const initials = name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "?";
  const colors = ["#2563EB", "#16A34A", "#D97706", "#DC2626", "#7C3AED", "#0891B2", "#BE185D"];
  const color = colors[name?.charCodeAt(0) % colors.length] || "#2563EB";
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function StatMiniCard({ icon, value, label, color }) {
  const bg = { blue: "#EFF6FF", green: "#F0FDF4", amber: "#FFFBEB", purple: "#F5F3FF", red: "#FEF2F2" };
  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: bg[color] || "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{icon}</div>
      <div>
        <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0F172A", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: "0.75rem", color: "#64748B", marginTop: 3, fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 440, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0F172A" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "#F1F5F9", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const searchInputStyle = { width: "100%", padding: "9px 12px 9px 34px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: "0.875rem", outline: "none", background: "#F8FAFC", color: "#0F172A" };
const selectStyle = { padding: "9px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: "0.875rem", background: "#F8FAFC", color: "#0F172A", outline: "none" };
const inputStyle = { width: "100%", padding: "9px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: "0.875rem", outline: "none", background: "#F8FAFC", color: "#0F172A", boxSizing: "border-box", marginBottom: 12 };
const labelStyle = { fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: 4, display: "block" };
const btnPrimary = { padding: "9px 18px", background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" };
const btnDanger = { padding: "9px 18px", background: "#DC2626", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" };
const btnSuccess = { padding: "9px 18px", background: "#16A34A", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" };
const btnSecondary = { padding: "9px 18px", background: "#F1F5F9", color: "#475569", border: "1px solid #E2E8F0", borderRadius: 8, fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" };
const tableFooterStyle = { padding: "12px 20px", borderTop: "1px solid #E2E8F0", fontSize: "0.8rem", color: "#94A3B8" };

// ── ADMIN DASHBOARD ───────────────────────────────────────────────────────────
export function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, schools: 0, groups: 0, rides: 0, pendingGroups: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getUsers(), getSchools(), getGroups(), getRides()])
      .then(([u, s, g, r]) => setStats({
        users: u.data.length,
        schools: s.data.length,
        groups: g.data.length,
        rides: r.data.length,
        pendingGroups: g.data.filter(gr => gr.status === "Pending").length
      }))
      .finally(() => setLoading(false));
  }, []);

  const quickLinks = [
    { href: "/admin/users", icon: "👤", label: "Manage Users", sub: "Add, edit, delete users" },
    { href: "/admin/schools", icon: "🏫", label: "Manage Schools", sub: "Add and manage schools" },
    { href: "/admin/groups", icon: "👥", label: "Monitor Groups", sub: "Verify and manage groups" },
    { href: "/admin/rides", icon: "🚌", label: "Monitor Rides", sub: "Track and manage rides" },
    { href: "/admin/verifications", icon: "📄", label: "Verifications", sub: "Approve documents" },
    { href: "/admin/notifications", icon: "🔔", label: "Send Notifications", sub: "Notify users" },
  ];

  return (
    <>
      <div className="page-header">
        <div><h2 className="page-title">Admin Dashboard</h2><p className="page-subtitle">System overview and platform management</p></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
        <StatMiniCard icon="👤" value={loading ? "—" : stats.users} label="Total Users" color="blue" />
        <StatMiniCard icon="🏫" value={loading ? "—" : stats.schools} label="Schools" color="green" />
        <StatMiniCard icon="👥" value={loading ? "—" : stats.groups} label="Carpool Groups" color="amber" />
        <StatMiniCard icon="🚌" value={loading ? "—" : stats.rides} label="Total Rides" color="purple" />
        <StatMiniCard icon="⏳" value={loading ? "—" : stats.pendingGroups} label="Pending Groups" color="red" />
      </div>

      {/* Pending Groups Alert */}
      {!loading && stats.pendingGroups > 0 && (
        <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 12, padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, color: "#92400E" }}>{stats.pendingGroups} group(s) waiting for verification</div>
            <div style={{ fontSize: "0.85rem", color: "#78350F" }}>Go to Groups page to verify or reject them</div>
          </div>
          <a href="/admin/groups" style={{ marginLeft: "auto", ...btnPrimary, textDecoration: "none", padding: "8px 16px", fontSize: "0.85rem" }}>Review Now</a>
        </div>
      )}

      <div className="card">
        <div className="card-header"><span className="card-title">Quick Navigation</span></div>
        <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {quickLinks.map(link => (
            <a key={link.href} href={link.href} style={{ textDecoration: "none" }}>
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#EFF6FF"; e.currentTarget.style.borderColor = "#BFDBFE"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#F8FAFC"; e.currentTarget.style.borderColor = "#E2E8F0"; }}>
                <span style={{ fontSize: 22 }}>{link.icon}</span>
                <div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0F172A" }}>{link.label}</div>
                  <div style={{ fontSize: "0.75rem", color: "#64748B" }}>{link.sub}</div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </>
  );
}

// ── USERS ─────────────────────────────────────────────────────────────────────
export function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ fullName: "", email: "", password: "", phoneNumber: "", address: "", role: "Parent" });
  const [adding, setAdding] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ fullName: "", email: "", phoneNumber: "", address: "", role: "", isActive: true });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getUsers().then(r => setUsers(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = users.filter(u => {
    const matchSearch = u.fullName?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "All" || u.role === roleFilter;
    const matchStatus = statusFilter === "All" || (statusFilter === "Active" ? u.isActive : !u.isActive);
    return matchSearch && matchRole && matchStatus;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.isActive).length,
    pending: users.filter(u => !u.isActive).length,
    admins: users.filter(u => u.role === "Admin").length,
  };

  async function handleAdd(e) {
    e.preventDefault();
    setAdding(true);
    try {
      await addUser(addForm);
      setMsg({ type: "success", text: "User added successfully!" });
      setAddModal(false);
      setAddForm({ fullName: "", email: "", password: "", phoneNumber: "", address: "", role: "Parent" });
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Failed to add user." });
    } finally { setAdding(false); }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUser(editModal.userId, editForm);
      setMsg({ type: "success", text: "User updated successfully!" });
      setEditModal(null);
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Failed to update user." });
    } finally { setSaving(false); }
  }

  async function handleVerify(id) {
    try {
      await verifyUser(id);
      setMsg({ type: "success", text: "User verified!" });
      load();
    } catch { setMsg({ type: "error", text: "Failed to verify user." }); }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete user "${name}"?`)) return;
    try {
      await deleteUser(id);
      setMsg({ type: "success", text: "User deleted." });
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Failed to delete user." });
    }
  }

  const roleBadge = {
    Parent: { bg: "#EFF6FF", color: "#2563EB" },
    Admin: { bg: "#FFFBEB", color: "#D97706" },
  };

  return (
    <>
      <div className="page-header">
        <div><h2 className="page-title">Users</h2><p className="page-subtitle">{stats.pending} pending verification</p></div>
        <button style={btnPrimary} onClick={() => setAddModal(true)}>+ Add User</button>
      </div>

      {msg.text && <div className={`alert ${msg.type === "error" ? "alert-error" : "alert-success"}`} style={{ marginBottom: 20 }}>{msg.text}</div>}

      {addModal && (
        <Modal title="Add New User" onClose={() => setAddModal(false)}>
          <form onSubmit={handleAdd}>
            <label style={labelStyle}>Full Name</label>
            <input style={inputStyle} placeholder="Full name" value={addForm.fullName} onChange={e => setAddForm({ ...addForm, fullName: e.target.value })} required />
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" placeholder="Email address" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} required />
            <label style={labelStyle}>Password</label>
            <input style={inputStyle} type="password" placeholder="Password" value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })} required />
            <label style={labelStyle}>Phone Number</label>
            <input style={inputStyle} placeholder="Phone number" value={addForm.phoneNumber} onChange={e => setAddForm({ ...addForm, phoneNumber: e.target.value })} />
            <label style={labelStyle}>Address</label>
            <input style={inputStyle} placeholder="Address" value={addForm.address} onChange={e => setAddForm({ ...addForm, address: e.target.value })} />
            <label style={labelStyle}>Role</label>
            <select style={{ ...inputStyle, marginBottom: 20 }} value={addForm.role} onChange={e => setAddForm({ ...addForm, role: e.target.value })}>
              <option value="Parent">Parent</option>
              <option value="Admin">Admin</option>
            </select>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" style={btnPrimary} disabled={adding}>{adding ? "Adding..." : "Add User"}</button>
              <button type="button" style={btnSecondary} onClick={() => setAddModal(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {editModal && (
        <Modal title={`Edit User — ${editModal.fullName}`} onClose={() => setEditModal(null)}>
          <form onSubmit={handleUpdate}>
            <label style={labelStyle}>Full Name</label>
            <input style={inputStyle} value={editForm.fullName} onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} required />
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} required />
            <label style={labelStyle}>Phone Number</label>
            <input style={inputStyle} value={editForm.phoneNumber} onChange={e => setEditForm({ ...editForm, phoneNumber: e.target.value })} />
            <label style={labelStyle}>Address</label>
            <input style={inputStyle} value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
            <label style={labelStyle}>Role</label>
            <select style={{ ...inputStyle }} value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
              <option value="Parent">Parent</option>
              <option value="Admin">Admin</option>
            </select>
            <label style={labelStyle}>Status</label>
            <select style={{ ...inputStyle, marginBottom: 20 }} value={editForm.isActive ? "Active" : "Inactive"} onChange={e => setEditForm({ ...editForm, isActive: e.target.value === "Active" })}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" style={btnPrimary} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
              <button type="button" style={btnSecondary} onClick={() => setEditModal(null)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <StatMiniCard icon="👤" value={stats.total} label="Total Users" color="blue" />
        <StatMiniCard icon="✅" value={stats.active} label="Active" color="green" />
        <StatMiniCard icon="⏳" value={stats.pending} label="Pending" color="amber" />
        <StatMiniCard icon="🛡️" value={stats.admins} label="Admins" color="purple" />
      </div>

      <div className="card">
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>🔍</span>
            <input style={searchInputStyle} placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select style={selectStyle} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="All">All Roles</option>
            <option value="Parent">Parent</option>
            <option value="Admin">Admin</option>
          </select>
          <select style={selectStyle} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {loading ? <div className="loader"><div className="spinner" /></div>
          : filtered.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">👤</div><div className="empty-title">No users found</div></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filtered.map((u, i) => (
                    <tr key={u.userId}>
                      <td style={{ color: "#94A3B8", fontSize: "0.8rem" }}>{i + 1}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Avatar name={u.fullName} size={34} />
                          <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{u.fullName}</div>
                        </div>
                      </td>
                      <td style={{ color: "#475569", fontSize: "0.85rem" }}>{u.email}</td>
                      <td style={{ color: "#475569", fontSize: "0.85rem" }}>{u.phoneNumber || "—"}</td>
                      <td><span style={{ padding: "3px 10px", borderRadius: 100, fontSize: "0.75rem", fontWeight: 600, background: roleBadge[u.role]?.bg || "#F1F5F9", color: roleBadge[u.role]?.color || "#475569" }}>{u.role}</span></td>
                      <td><span style={{ padding: "3px 10px", borderRadius: 100, fontSize: "0.75rem", fontWeight: 600, background: u.isActive ? "#F0FDF4" : "#FEF2F2", color: u.isActive ? "#16A34A" : "#DC2626" }}>{u.isActive ? "Active" : "Inactive"}</span></td>
                      <td style={{ color: "#475569", fontSize: "0.82rem" }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button title="Edit" onClick={() => { setEditModal(u); setEditForm({ fullName: u.fullName, email: u.email, phoneNumber: u.phoneNumber || "", address: u.address || "", role: u.role, isActive: u.isActive }); }}
                            style={{ width: 30, height: 30, border: "1px solid #BFDBFE", background: "#EFF6FF", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>✏️</button>
                          {!u.isActive && (
                            <button title="Verify" onClick={() => handleVerify(u.userId)}
                              style={{ width: 30, height: 30, border: "1px solid #BBF7D0", background: "#F0FDF4", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>✓</button>
                          )}
                          <button title="Delete" onClick={() => handleDelete(u.userId, u.fullName)}
                            style={{ width: 30, height: 30, border: "1px solid #FECACA", background: "#FEF2F2", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        <div style={tableFooterStyle}>Showing {filtered.length} of {users.length} users</div>
      </div>
    </>
  );
}

// ── SCHOOLS ───────────────────────────────────────────────────────────────────
export function Schools() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [form, setForm] = useState({ schoolName: "", address: "", contactNumber: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getSchools().then(r => setSchools(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = schools.filter(s =>
    s.schoolName?.toLowerCase().includes(search.toLowerCase()) ||
    s.address?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await addSchool(form);
      setMsg({ type: "success", text: "School added!" });
      setAddModal(false);
      setForm({ schoolName: "", address: "", contactNumber: "" });
      load();
    } catch { setMsg({ type: "error", text: "Failed to add school." }); }
    finally { setSaving(false); }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSchool(editModal.schoolId, form);
      setMsg({ type: "success", text: "School updated!" });
      setEditModal(null);
      load();
    } catch { setMsg({ type: "error", text: "Failed to update school." }); }
    finally { setSaving(false); }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete school "${name}"?`)) return;
    try {
      await deleteSchool(id);
      setMsg({ type: "success", text: "School deleted." });
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Failed to delete school." });
    }
  }

  const SchoolForm = ({ onSubmit }) => (
    <form onSubmit={onSubmit}>
      <label style={labelStyle}>School Name</label>
      <input style={inputStyle} placeholder="e.g. DPS Pune" value={form.schoolName} onChange={e => setForm({ ...form, schoolName: e.target.value })} required />
      <label style={labelStyle}>Address</label>
      <input style={inputStyle} placeholder="Full school address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
      <label style={labelStyle}>Contact Number</label>
      <input style={inputStyle} placeholder="020-12345678" value={form.contactNumber} onChange={e => setForm({ ...form, contactNumber: e.target.value })} />
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button type="submit" style={btnPrimary} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
        <button type="button" style={btnSecondary} onClick={() => { setAddModal(false); setEditModal(null); }}>Cancel</button>
      </div>
    </form>
  );

  return (
    <>
      <div className="page-header">
        <div><h2 className="page-title">Schools</h2><p className="page-subtitle">{schools.length} schools registered</p></div>
        <button style={btnPrimary} onClick={() => { setAddModal(true); setForm({ schoolName: "", address: "", contactNumber: "" }); }}>+ Add School</button>
      </div>
      {msg.text && <div className={`alert ${msg.type === "error" ? "alert-error" : "alert-success"}`} style={{ marginBottom: 20 }}>{msg.text}</div>}
      {addModal && <Modal title="Add New School" onClose={() => setAddModal(false)}><SchoolForm onSubmit={handleAdd} /></Modal>}
      {editModal && <Modal title={`Edit — ${editModal.schoolName}`} onClose={() => setEditModal(null)}><SchoolForm onSubmit={handleUpdate} /></Modal>}
      <div className="card">
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>🔍</span>
            <input style={searchInputStyle} placeholder="Search schools..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        {loading ? <div className="loader"><div className="spinner" /></div>
          : filtered.length === 0 ? <div className="empty-state"><div className="empty-icon">🏫</div><div className="empty-title">No schools found</div></div>
          : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>School Name</th><th>Address</th><th>Contact</th><th>ID</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr key={s.schoolId}>
                      <td style={{ color: "#94A3B8", fontSize: "0.8rem" }}>{i + 1}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 8, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏫</div>
                          <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{s.schoolName}</div>
                        </div>
                      </td>
                      <td style={{ color: "#475569", fontSize: "0.85rem" }}>{s.address || "—"}</td>
                      <td style={{ color: "#475569", fontSize: "0.85rem" }}>{s.contactNumber || "—"}</td>
                      <td><span style={{ padding: "3px 10px", borderRadius: 100, fontSize: "0.75rem", fontWeight: 600, background: "#EFF6FF", color: "#2563EB" }}>ID: {s.schoolId}</span></td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => { setEditModal(s); setForm({ schoolName: s.schoolName, address: s.address || "", contactNumber: s.contactNumber || "" }); }}
                            style={{ width: 30, height: 30, border: "1px solid #BFDBFE", background: "#EFF6FF", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>✏️</button>
                          <button onClick={() => handleDelete(s.schoolId, s.schoolName)}
                            style={{ width: 30, height: 30, border: "1px solid #FECACA", background: "#FEF2F2", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        <div style={tableFooterStyle}>{filtered.length} of {schools.length} schools</div>
      </div>
    </>
  );
}

// ── ADMIN GROUPS ──────────────────────────────────────────────────────────────
export function AdminGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ groupName: "", locality: "", maxMembers: 5, status: "Active" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getGroups().then(r => setGroups(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = groups.filter(g => {
    const matchSearch = g.groupName?.toLowerCase().includes(search.toLowerCase()) ||
      g.locality?.toLowerCase().includes(search.toLowerCase()) ||
      g.school?.schoolName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || g.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: groups.length,
    pending: groups.filter(g => g.status === "Pending").length,
    active: groups.filter(g => g.status === "Active").length,
    members: groups.reduce((a, g) => a + (g.memberCount || 0), 0),
  };

  async function handleVerify(id) {
    try {
      await verifyGroup(id);
      setMsg({ type: "success", text: "Group verified and activated!" });
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Failed to verify group." });
    }
  }

  async function handleReject(id, name) {
    if (!window.confirm(`Reject and delete group "${name}"? This cannot be undone.`)) return;
    try {
      await rejectGroup(id);
      setMsg({ type: "success", text: "Group rejected and deleted." });
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Failed to reject group." });
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateGroup(editModal.groupId, editForm);
      setMsg({ type: "success", text: "Group updated!" });
      setEditModal(null);
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Failed to update group." });
    } finally { setSaving(false); }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete group "${name}"?`)) return;
    try {
      await deleteGroup(id);
      setMsg({ type: "success", text: "Group deleted." });
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Failed to delete group." });
    }
  }

  const statusStyle = {
    Pending: { bg: "#FFFBEB", color: "#D97706" },
    Active: { bg: "#F0FDF4", color: "#16A34A" },
    Inactive: { bg: "#F1F5F9", color: "#475569" },
    Closed: { bg: "#FEF2F2", color: "#DC2626" },
  };

  return (
    <>
      <div className="page-header">
        <div><h2 className="page-title">All Groups</h2><p className="page-subtitle">Verify and manage all carpool groups</p></div>
      </div>

      {msg.text && <div className={`alert ${msg.type === "error" ? "alert-error" : "alert-success"}`} style={{ marginBottom: 20 }}>{msg.text}</div>}

      {/* Pending Alert */}
      {stats.pending > 0 && (
        <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 12, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <span style={{ fontWeight: 600, color: "#92400E" }}>{stats.pending} group(s) waiting for your verification</span>
          <button style={{ marginLeft: "auto", ...btnPrimary, padding: "6px 14px", fontSize: "0.82rem" }} onClick={() => setStatusFilter("Pending")}>Show Pending</button>
        </div>
      )}

      {editModal && (
        <Modal title={`Edit Group — ${editModal.groupName || "#" + editModal.groupId}`} onClose={() => setEditModal(null)}>
          <form onSubmit={handleUpdate}>
            <label style={labelStyle}>Group Name</label>
            <input style={inputStyle} value={editForm.groupName} onChange={e => setEditForm({ ...editForm, groupName: e.target.value })} />
            <label style={labelStyle}>Locality</label>
            <input style={inputStyle} value={editForm.locality} onChange={e => setEditForm({ ...editForm, locality: e.target.value })} />
            <label style={labelStyle}>Max Members</label>
            <input style={inputStyle} type="number" min="2" max="20" value={editForm.maxMembers} onChange={e => setEditForm({ ...editForm, maxMembers: parseInt(e.target.value) })} />
            <label style={labelStyle}>Status</label>
            <select style={{ ...inputStyle, marginBottom: 20 }} value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
              <option value="Pending">Pending</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Closed">Closed</option>
            </select>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" style={btnPrimary} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
              <button type="button" style={btnSecondary} onClick={() => setEditModal(null)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <StatMiniCard icon="👥" value={stats.total} label="Total Groups" color="blue" />
        <StatMiniCard icon="⏳" value={stats.pending} label="Pending" color="amber" />
        <StatMiniCard icon="✅" value={stats.active} label="Active" color="green" />
        <StatMiniCard icon="👤" value={stats.members} label="Total Members" color="purple" />
      </div>

      <div className="card">
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>🔍</span>
            <input style={searchInputStyle} placeholder="Search by name, locality or school..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select style={selectStyle} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {loading ? <div className="loader"><div className="spinner" /></div>
          : filtered.length === 0 ? <div className="empty-state"><div className="empty-icon">👥</div><div className="empty-title">No groups found</div></div>
          : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>#</th><th>Group</th><th>School</th><th>Locality</th><th>Created By</th><th>Members</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filtered.map((g, i) => (
                    <tr key={g.groupId} style={{ background: g.status === "Pending" ? "#FFFBEB" : "transparent" }}>
                      <td style={{ color: "#94A3B8", fontSize: "0.8rem" }}>{i + 1}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 8, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👥</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{g.groupName || "Unnamed"}</div>
                            <div style={{ fontSize: "0.72rem", color: "#94A3B8" }}>#{g.groupId}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: "#475569", fontSize: "0.85rem" }}>{g.school?.schoolName || "—"}</td>
                      <td style={{ color: "#475569", fontSize: "0.85rem" }}>📍 {g.locality || "—"}</td>
                      <td style={{ color: "#475569", fontSize: "0.85rem" }}>{g.createdByName || "—"}</td>
                      <td><span style={{ padding: "2px 10px", borderRadius: 100, fontSize: "0.78rem", fontWeight: 600, background: "#EFF6FF", color: "#2563EB" }}>{g.memberCount || 0}/{g.maxMembers}</span></td>
                      <td>
                        <span style={{ padding: "3px 10px", borderRadius: 100, fontSize: "0.75rem", fontWeight: 600, background: statusStyle[g.status]?.bg || "#F1F5F9", color: statusStyle[g.status]?.color || "#475569" }}>
                          {g.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {/* ✅ Verify button for pending groups */}
                          {g.status === "Pending" && (
                            <>
                              <button title="Verify Group" onClick={() => handleVerify(g.groupId)}
                                style={{ padding: "4px 10px", border: "1px solid #BBF7D0", background: "#F0FDF4", borderRadius: 6, cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, color: "#16A34A" }}>
                                ✓ Verify
                              </button>
                              <button title="Reject Group" onClick={() => handleReject(g.groupId, g.groupName || "#" + g.groupId)}
                                style={{ padding: "4px 10px", border: "1px solid #FECACA", background: "#FEF2F2", borderRadius: 6, cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, color: "#DC2626" }}>
                                ✕ Reject
                              </button>
                            </>
                          )}
                          <button title="Edit" onClick={() => { setEditModal(g); setEditForm({ groupName: g.groupName || "", locality: g.locality || "", maxMembers: g.maxMembers, status: g.status }); }}
                            style={{ width: 30, height: 30, border: "1px solid #BFDBFE", background: "#EFF6FF", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>✏️</button>
                          <button title="Delete" onClick={() => handleDelete(g.groupId, g.groupName || "#" + g.groupId)}
                            style={{ width: 30, height: 30, border: "1px solid #FECACA", background: "#FEF2F2", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        <div style={tableFooterStyle}>{filtered.length} of {groups.length} groups</div>
      </div>
    </>
  );
}

// ── ADMIN RIDES ───────────────────────────────────────────────────────────────
export function AdminRides() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [msg, setMsg] = useState({ type: "", text: "" });

  const load = () => {
    setLoading(true);
    getRides().then(r => setRides(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = rides.filter(r => {
    const matchSearch = r.rideId?.toString().includes(search) ||
      r.groupId?.toString().includes(search) ||
      r.groupName?.toLowerCase().includes(search.toLowerCase()) ||
      r.driverName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: rides.length,
    started: rides.filter(r => r.status === "Started").length,
    completed: rides.filter(r => r.status === "Completed").length,
    scheduled: rides.filter(r => r.status === "Scheduled").length,
    cancelled: rides.filter(r => r.status === "Cancelled").length,
  };

  async function handleStatusChange(id, status) {
    try {
      await updateRideStatus(id, status);
      setMsg({ type: "success", text: `Ride #${id} marked as ${status}` });
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Failed to update ride." });
    }
  }

  async function handleDelete(id) {
    if (!window.confirm(`Delete Ride #${id}?`)) return;
    try {
      await deleteRide(id);
      setMsg({ type: "success", text: `Ride #${id} deleted.` });
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Failed to delete ride." });
    }
  }

  const statusStyle = {
    Started: { bg: "#FFFBEB", color: "#D97706" },
    Completed: { bg: "#F0FDF4", color: "#16A34A" },
    Scheduled: { bg: "#EFF6FF", color: "#2563EB" },
    Cancelled: { bg: "#FEF2F2", color: "#DC2626" },
  };

  return (
    <>
      <div className="page-header">
        <div><h2 className="page-title">All Rides</h2><p className="page-subtitle">Monitor and manage all rides</p></div>
      </div>
      {msg.text && <div className={`alert ${msg.type === "error" ? "alert-error" : "alert-success"}`} style={{ marginBottom: 20 }}>{msg.text}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
        <StatMiniCard icon="🚌" value={stats.total} label="Total" color="blue" />
        <StatMiniCard icon="▶" value={stats.started} label="In Progress" color="amber" />
        <StatMiniCard icon="📅" value={stats.scheduled} label="Scheduled" color="purple" />
        <StatMiniCard icon="✅" value={stats.completed} label="Completed" color="green" />
        <StatMiniCard icon="✕" value={stats.cancelled} label="Cancelled" color="red" />
      </div>
      <div className="card">
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", gap: 12 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>🔍</span>
            <input style={searchInputStyle} placeholder="Search by Ride ID, Group, Driver..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select style={selectStyle} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="All">All Status</option>
            <option value="Started">Started</option>
            <option value="Completed">Completed</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        {loading ? <div className="loader"><div className="spinner" /></div>
          : filtered.length === 0 ? <div className="empty-state"><div className="empty-icon">🚌</div><div className="empty-title">No rides found</div></div>
          : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Ride</th><th>Group</th><th>Driver</th><th>Date</th><th>Pickup</th><th>Drop</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.rideId}>
                      <td style={{ color: "#94A3B8", fontSize: "0.8rem" }}>{i + 1}</td>
                      <td style={{ fontWeight: 700, color: "#2563EB" }}>#{r.rideId}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{r.groupName || "—"}</div>
                        <div style={{ fontSize: "0.72rem", color: "#94A3B8" }}>#{r.groupId}</div>
                      </td>
                      <td style={{ color: "#475569", fontSize: "0.85rem" }}>{r.driverName || "—"}</td>
                      <td style={{ color: "#475569", fontSize: "0.85rem" }}>{new Date(r.rideDate).toLocaleDateString()}</td>
                      <td style={{ color: "#475569", fontSize: "0.85rem" }}>{r.pickupTime || "—"}</td>
                      <td style={{ color: "#475569", fontSize: "0.85rem" }}>{r.dropTime || "—"}</td>
                      <td><span style={{ padding: "3px 10px", borderRadius: 100, fontSize: "0.75rem", fontWeight: 600, background: statusStyle[r.status]?.bg || "#F1F5F9", color: statusStyle[r.status]?.color || "#475569" }}>{r.status}</span></td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          {r.status === "Started" && (
                            <button onClick={() => handleStatusChange(r.rideId, "Completed")} style={{ padding: "4px 8px", border: "1px solid #BBF7D0", background: "#F0FDF4", borderRadius: 6, cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, color: "#16A34A" }}>✓ Complete</button>
                          )}
                          {(r.status === "Started" || r.status === "Scheduled") && (
                            <button onClick={() => handleStatusChange(r.rideId, "Cancelled")} style={{ padding: "4px 8px", border: "1px solid #FECACA", background: "#FEF2F2", borderRadius: 6, cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, color: "#DC2626" }}>✕ Cancel</button>
                          )}
                          <button onClick={() => handleDelete(r.rideId)} style={{ width: 30, height: 30, border: "1px solid #FECACA", background: "#FEF2F2", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        <div style={tableFooterStyle}>{filtered.length} of {rides.length} rides</div>
      </div>
    </>
  );
}

// ── VERIFICATIONS ─────────────────────────────────────────────────────────────
export function Verifications() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Pending");
  const [msg, setMsg] = useState({ type: "", text: "" });

  const load = () => {
    setLoading(true);
    getVerifications().then(r => setDocs(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  async function handleApprove(id) {
    try { await approveVerification(id); setMsg({ type: "success", text: "Document approved!" }); load(); }
    catch { setMsg({ type: "error", text: "Failed to approve." }); }
  }

  async function handleReject(id) {
    if (!window.confirm("Reject this document?")) return;
    try { await rejectVerification(id); setMsg({ type: "success", text: "Document rejected." }); load(); }
    catch { setMsg({ type: "error", text: "Failed to reject." }); }
  }

  const filtered = docs.filter(d => tab === "All" || d.status === tab);
  const pending = docs.filter(d => d.status === "Pending").length;
  const approved = docs.filter(d => d.status === "Approved").length;
  const rejected = docs.filter(d => d.status === "Rejected").length;

  return (
    <>
      <div className="page-header">
        <div><h2 className="page-title">Verifications</h2><p className="page-subtitle">{pending} documents pending approval</p></div>
      </div>
      {msg.text && <div className={`alert ${msg.type === "error" ? "alert-error" : "alert-success"}`} style={{ marginBottom: 20 }}>{msg.text}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <StatMiniCard icon="📄" value={docs.length} label="Total" color="blue" />
        <StatMiniCard icon="⏳" value={pending} label="Pending" color="amber" />
        <StatMiniCard icon="✅" value={approved} label="Approved" color="green" />
        <StatMiniCard icon="✕" value={rejected} label="Rejected" color="red" />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["Pending", "Approved", "Rejected", "All"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", borderColor: tab === t ? "#2563EB" : "#E2E8F0", background: tab === t ? "#EFF6FF" : "#fff", color: tab === t ? "#2563EB" : "#475569" }}>
            {t} ({t === "Pending" ? pending : t === "Approved" ? approved : t === "Rejected" ? rejected : docs.length})
          </button>
        ))}
      </div>
      {loading ? <div className="loader"><div className="spinner" /></div>
        : filtered.length === 0 ? <div className="card"><div className="empty-state"><div className="empty-icon">✅</div><div className="empty-title">{tab === "Pending" ? "No pending documents!" : "No documents found"}</div></div></div>
        : (
          <div className="item-list">
            {filtered.map(d => (
              <div className="item-card" key={d.verificationId}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: "#FFFBEB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>📄</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{d.documentType}</div>
                  <div style={{ fontSize: "0.78rem", color: "#64748B", marginTop: 2 }}>👤 {d.user?.fullName || "—"} &bull; {d.user?.email || "—"} &bull; {new Date(d.uploadedAt).toLocaleDateString()}</div>
                  {d.verifiedAt && <div style={{ fontSize: "0.75rem", color: "#94A3B8" }}>{d.status === "Approved" ? "✅ Approved" : "❌ Rejected"} on {new Date(d.verifiedAt).toLocaleDateString()}</div>}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ padding: "3px 10px", borderRadius: 100, fontSize: "0.72rem", fontWeight: 600, background: d.status === "Approved" ? "#F0FDF4" : d.status === "Rejected" ? "#FEF2F2" : "#FFFBEB", color: d.status === "Approved" ? "#16A34A" : d.status === "Rejected" ? "#DC2626" : "#D97706" }}>{d.status}</span>
                  {d.status === "Pending" && (
                    <>
                      <button style={{ ...btnPrimary, padding: "6px 14px", fontSize: "0.8rem" }} onClick={() => handleApprove(d.verificationId)}>✓ Approve</button>
                      <button style={{ ...btnDanger, padding: "6px 14px", fontSize: "0.8rem" }} onClick={() => handleReject(d.verificationId)}>✕ Reject</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
    </>
  );
}

// ── ADMIN NOTIFICATIONS ───────────────────────────────────────────────────────
export function AdminNotifications() {
  const [users, setUsers] = useState([]);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    sendToAll: false,
    sendToRole: false,
    userId: "",
    role: "Parent",
    message: "",
    type: "Admin"
  });

  useEffect(() => {
    getUsers().then(r => setUsers(r.data)).catch(() => {});
  }, []);

  async function handleSend(e) {
    e.preventDefault();
    if (!form.message.trim()) return setMsg({ type: "error", text: "Please enter a message." });
    setSending(true);
    setMsg({ type: "", text: "" });
    try {
      if (form.sendToAll) {
        await sendNotification({ sendToAll: true, message: form.message, type: form.type });
        setMsg({ type: "success", text: "✅ Notification sent to all users!" });
      } else if (form.sendToRole) {
        await sendToRole({ role: form.role, message: form.message, type: form.type });
        setMsg({ type: "success", text: `✅ Notification sent to all ${form.role}s!` });
      } else if (form.userId) {
        await sendNotification({ userId: parseInt(form.userId), message: form.message, type: form.type });
        setMsg({ type: "success", text: "✅ Notification sent to user!" });
      } else {
        setMsg({ type: "error", text: "Please select who to send to." });
        return;
      }
      setForm({ ...form, message: "", userId: "" });
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Failed to send notification." });
    } finally { setSending(false); }
  }

  const notificationTypes = [
    { value: "Admin", label: "📢 General Announcement" },
    { value: "Alert", label: "🚨 Alert" },
    { value: "Reminder", label: "⏰ Reminder" },
    { value: "Info", label: "ℹ️ Information" },
    { value: "Warning", label: "⚠️ Warning" },
  ];

  return (
    <>
      <div className="page-header">
        <div><h2 className="page-title">Send Notifications</h2><p className="page-subtitle">Send messages to users, groups, or everyone</p></div>
      </div>

      {msg.text && <div className={`alert ${msg.type === "error" ? "alert-error" : "alert-success"}`} style={{ marginBottom: 20 }}>{msg.text}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}>

        {/* Send Form */}
        <div className="card card-pad">
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 20 }}>Compose Notification</h3>
          <form onSubmit={handleSend}>

            {/* Who to send to */}
            <label style={labelStyle}>Send To</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.875rem" }}>
                <input type="radio" name="target" checked={!form.sendToAll && !form.sendToRole && !form.userId}
                  onChange={() => setForm({ ...form, sendToAll: false, sendToRole: false, userId: "" })} />
                Specific User
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.875rem" }}>
                <input type="radio" name="target" checked={form.sendToRole && !form.sendToAll}
                  onChange={() => setForm({ ...form, sendToRole: true, sendToAll: false, userId: "" })} />
                All Users of a Role
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.875rem" }}>
                <input type="radio" name="target" checked={form.sendToAll}
                  onChange={() => setForm({ ...form, sendToAll: true, sendToRole: false, userId: "" })} />
                Everyone (All Users)
              </label>
            </div>

            {/* Specific user dropdown */}
            {!form.sendToAll && !form.sendToRole && (
              <>
                <label style={labelStyle}>Select User</label>
                <select style={{ ...inputStyle }} value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })} required={!form.sendToAll && !form.sendToRole}>
                  <option value="">-- Select a user --</option>
                  {users.map(u => (
                    <option key={u.userId} value={u.userId}>{u.fullName} ({u.role})</option>
                  ))}
                </select>
              </>
            )}

            {/* Role selector */}
            {form.sendToRole && !form.sendToAll && (
              <>
                <label style={labelStyle}>Select Role</label>
                <select style={{ ...inputStyle }} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="Parent">All Parents</option>
                  <option value="Admin">All Admins</option>
                </select>
              </>
            )}

            {/* Notification Type */}
            <label style={labelStyle}>Notification Type</label>
            <select style={{ ...inputStyle }} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              {notificationTypes.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            {/* Message */}
            <label style={labelStyle}>Message</label>
            <textarea
              style={{ ...inputStyle, height: 100, resize: "vertical", fontFamily: "inherit" }}
              placeholder="Type your notification message here..."
              value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })}
              required
            />

            <button type="submit" style={{ ...btnPrimary, width: "100%", marginTop: 4 }} disabled={sending}>
              {sending ? "Sending..." : "📤 Send Notification"}
            </button>
          </form>
        </div>

        {/* Quick Send Templates */}
        <div>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16 }}>Quick Templates</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "🚌 Remind all parents about tomorrow's ride", msg: "Reminder: Your scheduled ride is tomorrow. Please ensure your children are ready on time.", type: "Reminder", role: "Parent" },
              { label: "⚠️ Safety alert to all users", msg: "Important safety notice: Please ensure all children are wearing seatbelts during rides.", type: "Alert", role: null },
              { label: "📢 App update announcement", msg: "SchoolPool has been updated with new features! Please refresh the app to get the latest version.", type: "Admin", role: null },
              { label: "✅ Welcome message to all parents", msg: "Welcome to SchoolPool! Your safe school commute solution. Start by joining a carpool group near you.", type: "Info", role: "Parent" },
            ].map((t, i) => (
              <button key={i} onClick={() => setForm({ ...form, message: t.msg, type: t.type, sendToAll: !t.role, sendToRole: !!t.role, role: t.role || "Parent" })}
                style={{ textAlign: "left", padding: "12px 16px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, cursor: "pointer", fontSize: "0.85rem", color: "#0F172A" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#EFF6FF"; e.currentTarget.style.borderColor = "#BFDBFE"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#F8FAFC"; e.currentTarget.style.borderColor = "#E2E8F0"; }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Info box */}
          <div style={{ marginTop: 20, background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontWeight: 600, color: "#1E40AF", marginBottom: 6, fontSize: "0.875rem" }}>ℹ️ Auto Notifications</div>
            <div style={{ fontSize: "0.8rem", color: "#1E40AF", lineHeight: 1.6 }}>
              The system automatically sends notifications when:<br />
              • Child is <strong>boarded</strong> or <strong>dropped</strong><br />
              • Ride <strong>starts</strong> or <strong>completes</strong><br />
              • Group is <strong>created</strong> or <strong>verified</strong><br />
              • Document is <strong>approved</strong> or <strong>rejected</strong><br />
              • User account is <strong>verified</strong>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── ADMIN LIVE TRACKING ───────────────────────────────────────────────────────
export function AdminLiveTracking() {
  const { token } = useAuth();
  const [rideId, setRideId] = useState("");
  const [activeRideId, setActiveRideId] = useState(null);

  return (
    <>
      <div className="page-header">
        <div><h2 className="page-title">Live Tracking</h2><p className="page-subtitle">Monitor active rides in real time</p></div>
      </div>
      <div className="card card-pad" style={{ maxWidth: 480, marginBottom: 24 }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16 }}>Enter Ride ID to track</h3>
        <div style={{ display: "flex", gap: 10 }}>
          <input className="form-control" type="number" placeholder="e.g. 42" value={rideId} onChange={e => setRideId(e.target.value)} />
          <button className="btn btn-primary" onClick={() => setActiveRideId(parseInt(rideId))} disabled={!rideId}>Track</button>
        </div>
      </div>
      {activeRideId && token && (
        <LiveTracking rideId={activeRideId} role="parent" token={token} />
      )}
    </>
  );
}

// ── ADMIN PAYMENTS ────────────────────────────────────────────────────────────
export function AdminPayments() {
  const { token } = useAuth();
  return <Payments token={token} role="admin" />;
}

// ── ADMIN CHILDREN ────────────────────────────────────────────────────────────
export function AdminChildren() {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Pending");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = () => {
    setLoading(true);
    // Import getAllChildren from childService
    fetch("https://localhost:7086/api/Child/admin/all", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    }).then(r => r.json()).then(data => setChildren(data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = children.filter(c => tab === "All" || c.verificationStatus === tab);
  const pending = children.filter(c => c.verificationStatus === "Pending").length;
  const approved = children.filter(c => c.verificationStatus === "Approved").length;
  const rejected = children.filter(c => c.verificationStatus === "Rejected").length;

  async function handleVerify(id) {
    try {
      await fetch(`https://localhost:7086/api/Child/admin/${id}/verify`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setMsg({ type: "success", text: "Child verified!" });
      load();
    } catch { setMsg({ type: "error", text: "Failed to verify." }); }
  }

  async function handleReject(id) {
    try {
      await fetch(`https://localhost:7086/api/Child/admin/${id}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ reason: rejectReason })
      });
      setMsg({ type: "success", text: "Child rejected." });
      setRejectModal(null);
      setRejectReason("");
      load();
    } catch { setMsg({ type: "error", text: "Failed to reject." }); }
  }

  const statusStyle = {
    Pending: { bg: "#FFFBEB", color: "#D97706" },
    Approved: { bg: "#F0FDF4", color: "#16A34A" },
    Rejected: { bg: "#FEF2F2", color: "#DC2626" },
  };

  return (
    <>
      <div className="page-header">
        <div><h2 className="page-title">Children Verification</h2><p className="page-subtitle">Verify children added by parents</p></div>
      </div>

      {msg.text && <div className={`alert ${msg.type === "error" ? "alert-error" : "alert-success"}`} style={{ marginBottom: 20 }}>{msg.text}</div>}

      {rejectModal && (
        <Modal title="Reject Child" onClose={() => setRejectModal(null)}>
          <label style={labelStyle}>Reason for rejection</label>
          <textarea style={{ ...inputStyle, height: 80 }} placeholder="Enter reason..."
            value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button style={btnDanger} onClick={() => handleReject(rejectModal)}>Reject</button>
            <button style={btnSecondary} onClick={() => setRejectModal(null)}>Cancel</button>
          </div>
        </Modal>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <StatMiniCard icon="👦" value={children.length} label="Total" color="blue" />
        <StatMiniCard icon="⏳" value={pending} label="Pending" color="amber" />
        <StatMiniCard icon="✅" value={approved} label="Approved" color="green" />
        <StatMiniCard icon="❌" value={rejected} label="Rejected" color="red" />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["Pending", "Approved", "Rejected", "All"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", borderColor: tab === t ? "#2563EB" : "#E2E8F0", background: tab === t ? "#EFF6FF" : "#fff", color: tab === t ? "#2563EB" : "#475569" }}>
            {t} ({t === "Pending" ? pending : t === "Approved" ? approved : t === "Rejected" ? rejected : children.length})
          </button>
        ))}
      </div>

      {loading ? <div className="loader"><div className="spinner" /></div>
        : filtered.length === 0 ? (
          <div className="card"><div className="empty-state"><div className="empty-icon">👦</div><div className="empty-title">No children found</div></div></div>
        ) : (
          <div className="item-list">
            {filtered.map(c => (
              <div className="item-card" key={c.childId}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>👦</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{c.name}</div>
                  <div style={{ fontSize: "0.78rem", color: "#64748B", marginTop: 2 }}>
                    Age {c.age} &bull; Class {c.class || "—"} &bull; {c.school?.schoolName || "No school"} &bull;
                    Parent: {c.parentName}
                  </div>
                  {c.documentUrl && (
                    <a href={c.documentUrl} target="_blank" rel="noreferrer"
                      style={{ fontSize: "0.75rem", color: "#2563EB", marginTop: 4, display: "block" }}>
                      📎 View Document
                    </a>
                  )}
                  {c.verificationStatus === "Rejected" && c.rejectionReason && (
                    <div style={{ fontSize: "0.75rem", color: "#DC2626", marginTop: 2 }}>
                      Rejection reason: {c.rejectionReason}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ padding: "3px 10px", borderRadius: 100, fontSize: "0.72rem", fontWeight: 600, background: statusStyle[c.verificationStatus]?.bg || "#F1F5F9", color: statusStyle[c.verificationStatus]?.color || "#475569" }}>
                    {c.verificationStatus}
                  </span>
                  {c.verificationStatus === "Pending" && (
                    <>
                      <button style={{ ...btnPrimary, padding: "6px 14px", fontSize: "0.8rem" }} onClick={() => handleVerify(c.childId)}>✓ Approve</button>
                      <button style={{ ...btnDanger, padding: "6px 14px", fontSize: "0.8rem" }} onClick={() => setRejectModal(c.childId)}>✕ Reject</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
    </>
  );
}

// ── ADMIN VEHICLES ────────────────────────────────────────────────────────────
export function AdminVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Pending");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = () => {
    setLoading(true);
    fetch("https://localhost:7086/api/Vehicle/admin/all", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    }).then(r => r.json()).then(data => setVehicles(data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = vehicles.filter(v => tab === "All" || v.verificationStatus === tab);
  const pending = vehicles.filter(v => v.verificationStatus === "Pending").length;
  const approved = vehicles.filter(v => v.verificationStatus === "Approved").length;
  const rejected = vehicles.filter(v => v.verificationStatus === "Rejected").length;

  async function handleVerify(id) {
    try {
      await fetch(`https://localhost:7086/api/Vehicle/admin/${id}/verify`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setMsg({ type: "success", text: "Vehicle verified!" });
      load();
    } catch { setMsg({ type: "error", text: "Failed to verify." }); }
  }

  async function handleReject(id) {
    try {
      await fetch(`https://localhost:7086/api/Vehicle/admin/${id}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ reason: rejectReason })
      });
      setMsg({ type: "success", text: "Vehicle rejected." });
      setRejectModal(null);
      setRejectReason("");
      load();
    } catch { setMsg({ type: "error", text: "Failed to reject." }); }
  }

  const statusStyle = {
    Pending: { bg: "#FFFBEB", color: "#D97706" },
    Approved: { bg: "#F0FDF4", color: "#16A34A" },
    Rejected: { bg: "#FEF2F2", color: "#DC2626" },
  };

  return (
    <>
      <div className="page-header">
        <div><h2 className="page-title">Vehicle Verification</h2><p className="page-subtitle">Verify vehicles added by parents</p></div>
      </div>

      {msg.text && <div className={`alert ${msg.type === "error" ? "alert-error" : "alert-success"}`} style={{ marginBottom: 20 }}>{msg.text}</div>}

      {rejectModal && (
        <Modal title="Reject Vehicle" onClose={() => setRejectModal(null)}>
          <label style={labelStyle}>Reason for rejection</label>
          <textarea style={{ ...inputStyle, height: 80 }} placeholder="Enter reason..."
            value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button style={btnDanger} onClick={() => handleReject(rejectModal)}>Reject</button>
            <button style={btnSecondary} onClick={() => setRejectModal(null)}>Cancel</button>
          </div>
        </Modal>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <StatMiniCard icon="🚗" value={vehicles.length} label="Total" color="blue" />
        <StatMiniCard icon="⏳" value={pending} label="Pending" color="amber" />
        <StatMiniCard icon="✅" value={approved} label="Approved" color="green" />
        <StatMiniCard icon="❌" value={rejected} label="Rejected" color="red" />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["Pending", "Approved", "Rejected", "All"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", borderColor: tab === t ? "#2563EB" : "#E2E8F0", background: tab === t ? "#EFF6FF" : "#fff", color: tab === t ? "#2563EB" : "#475569" }}>
            {t} ({t === "Pending" ? pending : t === "Approved" ? approved : t === "Rejected" ? rejected : vehicles.length})
          </button>
        ))}
      </div>

      {loading ? <div className="loader"><div className="spinner" /></div>
        : filtered.length === 0 ? (
          <div className="card"><div className="empty-state"><div className="empty-icon">🚗</div><div className="empty-title">No vehicles found</div></div></div>
        ) : (
          <div className="item-list">
            {filtered.map(v => (
              <div className="item-card" key={v.vehicleId}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: "#FFFBEB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🚗</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{v.vehicleNumber}</div>
                  <div style={{ fontSize: "0.78rem", color: "#64748B", marginTop: 2 }}>
                    {v.vehicleType || "—"} &bull; License: {v.licenseNumber || "—"} &bull;
                    Insurance: {v.insuranceDetails || "—"} &bull; Owner: {v.parentName}
                  </div>
                  {v.documentUrl && (
                    <a href={v.documentUrl} target="_blank" rel="noreferrer"
                      style={{ fontSize: "0.75rem", color: "#2563EB", marginTop: 4, display: "block" }}>
                      📎 View Document
                    </a>
                  )}
                  {v.verificationStatus === "Rejected" && v.rejectionReason && (
                    <div style={{ fontSize: "0.75rem", color: "#DC2626", marginTop: 2 }}>
                      Rejection reason: {v.rejectionReason}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ padding: "3px 10px", borderRadius: 100, fontSize: "0.72rem", fontWeight: 600, background: statusStyle[v.verificationStatus]?.bg || "#F1F5F9", color: statusStyle[v.verificationStatus]?.color || "#475569" }}>
                    {v.verificationStatus}
                  </span>
                  {v.verificationStatus === "Pending" && (
                    <>
                      <button style={{ ...btnPrimary, padding: "6px 14px", fontSize: "0.8rem" }} onClick={() => handleVerify(v.vehicleId)}>✓ Approve</button>
                      <button style={{ ...btnDanger, padding: "6px 14px", fontSize: "0.8rem" }} onClick={() => setRejectModal(v.vehicleId)}>✕ Reject</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
    </>
  );
}

// ── ADMIN RIDE APPROVALS ──────────────────────────────────────────────────────
export function AdminRideApprovals() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = () => {
    setLoading(true);
    getRides().then(r => {
      // Show only PendingApproval rides
      setRides(r.data.filter(ride => ride.status === "PendingApproval"));
    }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  async function handleApprove(id) {
    try {
      await fetch(`https://localhost:7086/api/Ride/admin/${id}/approve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setMsg({ type: "success", text: `Ride #${id} approved!` });
      load();
    } catch { setMsg({ type: "error", text: "Failed to approve ride." }); }
  }

  async function handleReject(id) {
    try {
      await fetch(`https://localhost:7086/api/Ride/admin/${id}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ reason: rejectReason })
      });
      setMsg({ type: "success", text: `Ride #${id} rejected.` });
      setRejectModal(null);
      setRejectReason("");
      load();
    } catch { setMsg({ type: "error", text: "Failed to reject ride." }); }
  }

  return (
    <>
      <div className="page-header">
        <div><h2 className="page-title">Ride Approvals</h2><p className="page-subtitle">Approve or reject scheduled rides</p></div>
      </div>

      {msg.text && <div className={`alert ${msg.type === "error" ? "alert-error" : "alert-success"}`} style={{ marginBottom: 20 }}>{msg.text}</div>}

      {rejectModal && (
        <Modal title="Reject Ride" onClose={() => setRejectModal(null)}>
          <label style={labelStyle}>Reason for rejection</label>
          <textarea style={{ ...inputStyle, height: 80 }} placeholder="Enter reason..."
            value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button style={btnDanger} onClick={() => handleReject(rejectModal)}>Reject</button>
            <button style={btnSecondary} onClick={() => setRejectModal(null)}>Cancel</button>
          </div>
        </Modal>
      )}

      <StatMiniCard icon="⏳" value={rides.length} label="Pending Ride Approvals" color="amber" />

      <div style={{ marginTop: 20 }}>
        {loading ? <div className="loader"><div className="spinner" /></div>
          : rides.length === 0 ? (
            <div className="card"><div className="empty-state">
              <div className="empty-icon">🚌</div>
              <div className="empty-title">No pending ride approvals</div>
              <div className="empty-sub">All rides are up to date</div>
            </div></div>
          ) : (
            <div className="item-list">
              {rides.map(r => (
                <div className="item-card" key={r.rideId}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: "#FFFBEB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🚌</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Ride #{r.rideId} — {r.groupName || "Group #" + r.groupId}</div>
                    <div style={{ fontSize: "0.78rem", color: "#64748B", marginTop: 2 }}>
                      Driver: {r.driverName || "—"} &bull;
                      Date: {new Date(r.rideDate).toLocaleDateString()} &bull;
                      Pickup: {r.pickupTime || "—"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={{ ...btnPrimary, padding: "6px 14px", fontSize: "0.8rem" }} onClick={() => handleApprove(r.rideId)}>✓ Approve</button>
                    <button style={{ ...btnDanger, padding: "6px 14px", fontSize: "0.8rem" }} onClick={() => setRejectModal(r.rideId)}>✕ Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </>
  );
}