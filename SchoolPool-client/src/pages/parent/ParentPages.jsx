import { useEffect, useState } from "react";
import { getVehicles, addVehicle, deleteVehicle } from "../../services/vehicleService";
import { getGroups, joinGroup, createGroup, getMyGroups, leaveGroup, deleteGroup, updateGroup } from "../../services/groupService";
import { getNotifications, markAsRead } from "../../services/notificationService";

import { useAuth } from "../../context/AuthContext";
import LiveTracking from "../LiveTracking";
import Payments from "../Payments";

import { startRide, scheduleRide, getGroupRides, completeRide, markAttendance, getActiveRides, getRideAttendance, getMyRides, bookSeat, cancelSeat, getMySeatBookings, getGroupSeatBookings } from "../../services/rideService";



// ── VEHICLES ────────────────────────────────────────────────────────────────────
export function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ vehicleNumber: "", vehicleType: "", licenseNumber: "", insuranceDetails: "", documentUrl: "" });
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [docUrl, setDocUrl] = useState("");

  const load = () => {
    setLoading(true);
    getVehicles().then(r => setVehicles(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  const f = (field, val) => setForm({ ...form, [field]: val });

  async function handleAdd(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addVehicle(form);
      setMsg({ type: "success", text: "Vehicle added! Waiting for admin verification." });
      setForm({ vehicleNumber: "", vehicleType: "", licenseNumber: "", insuranceDetails: "", documentUrl: "" });
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Failed to add vehicle." });
    } finally { setSubmitting(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm("Remove this vehicle?")) return;
    await deleteVehicle(id);
    load();
  }

  async function handleUploadDoc(vehicleId) {
    if (!docUrl.trim()) return;
    try {
      // Call upload document endpoint
      await fetch(`https://localhost:7086/api/Vehicle/${vehicleId}/upload-document`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ documentUrl: docUrl })
      });
      setMsg({ type: "success", text: "Document uploaded! Waiting for admin review." });
      setUploadingId(null);
      setDocUrl("");
      load();
    } catch {
      setMsg({ type: "error", text: "Failed to upload document." });
    }
  }

  const statusColor = {
    Pending: { bg: "#FFFBEB", color: "#D97706", icon: "⏳" },
    Approved: { bg: "#F0FDF4", color: "#16A34A", icon: "✅" },
    Rejected: { bg: "#FEF2F2", color: "#DC2626", icon: "❌" },
  };

  return (
    <>
      <div className="page-header">
        <div><h2 className="page-title">Vehicles</h2><p className="page-subtitle">Register your vehicles for carpooling</p></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "24px", alignItems: "start" }}>
        <div className="card card-pad">
          <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "20px" }}>Add Vehicle</h3>
          {msg.text && <div className={`alert ${msg.type === "error" ? "alert-error" : "alert-success"}`}>{msg.text}</div>}

          {/* Info box */}
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: "0.82rem", color: "#1E40AF" }}>
            ℹ️ After adding a vehicle, admin will verify it. Upload RC book and insurance documents for faster approval.
          </div>

          <form onSubmit={handleAdd}>
            <div className="form-group">
              <label className="form-label">Vehicle Number</label>
              <input className="form-control" placeholder="MH12AB1234" value={form.vehicleNumber} onChange={e => f("vehicleNumber", e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Vehicle Type</label>
              <select className="form-control" value={form.vehicleType} onChange={e => f("vehicleType", e.target.value)}>
                <option value="">Select type</option>
                <option value="Car">Car</option>
                <option value="SUV">SUV</option>
                <option value="Van">Van</option>
                <option value="Auto">Auto</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">License Number</label>
              <input className="form-control" placeholder="License number" value={form.licenseNumber} onChange={e => f("licenseNumber", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Insurance Details</label>
              <input className="form-control" placeholder="Insurance policy number" value={form.insuranceDetails} onChange={e => f("insuranceDetails", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">
                Document URL <span style={{ color: "var(--text-3)", fontWeight: 400 }}>(RC book / Insurance link)</span>
              </label>
              <input className="form-control" placeholder="https://drive.google.com/..." value={form.documentUrl} onChange={e => f("documentUrl", e.target.value)} />
            </div>
            <button className="btn btn-primary btn-full" disabled={submitting}>{submitting ? "Adding..." : "+ Add Vehicle"}</button>
          </form>
        </div>

        <div>
          <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "16px", color: "var(--text-2)" }}>My Vehicles ({vehicles.length})</h3>
          {loading ? <div className="loader"><div className="spinner" /></div>
            : vehicles.length === 0 ? (
              <div className="card"><div className="empty-state">
                <div className="empty-icon">🚗</div>
                <div className="empty-title">No vehicles added</div>
                <div className="empty-sub">Add your vehicle to start carpooling</div>
              </div></div>
            ) : (
              <div className="item-list">
                {vehicles.map(v => {
                  const s = statusColor[v.verificationStatus] || statusColor.Pending;
                  return (
                    <div key={v.vehicleId} style={{ marginBottom: "12px" }}>
                      <div className="item-card">
                        <div className="item-icon" style={{ background: "var(--warning-light)" }}>🚗</div>
                        <div className="item-info" style={{ flex: 1 }}>
                          <div className="item-title">{v.vehicleNumber}</div>
                          <div className="item-sub">{v.vehicleType || "Vehicle"} &bull; License: {v.licenseNumber || "N/A"}</div>
                          <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                            <span style={{ padding: "2px 10px", borderRadius: 100, fontSize: "0.75rem", fontWeight: 600, background: s.bg, color: s.color }}>
                              {s.icon} {v.verificationStatus}
                            </span>
                            {v.verificationStatus === "Rejected" && v.rejectionReason && (
                              <span style={{ fontSize: "0.75rem", color: "#DC2626" }}>Reason: {v.rejectionReason}</span>
                            )}
                            {!v.documentUrl && (
                              <span style={{ fontSize: "0.75rem", color: "#D97706" }}>⚠️ No document uploaded</span>
                            )}
                          </div>
                        </div>
                        <div className="item-actions" style={{ display: "flex", gap: 6 }}>
                          {(v.verificationStatus === "Pending" || v.verificationStatus === "Rejected") && (
                            <button className="btn btn-sm btn-primary"
                              onClick={() => { setUploadingId(v.vehicleId); setDocUrl(v.documentUrl || ""); }}>
                              📎 Doc
                            </button>
                          )}
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(v.vehicleId)}>Remove</button>
                        </div>
                      </div>

                      {/* Upload doc inline */}
                      {uploadingId === v.vehicleId && (
                        <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "12px 16px", marginTop: 4 }}>
                          <label style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: 6, display: "block" }}>
                            Upload Document URL (RC book / Insurance)
                          </label>
                          <div style={{ display: "flex", gap: 8 }}>
                            <input className="form-control" placeholder="https://..." value={docUrl} onChange={e => setDocUrl(e.target.value)} />
                            <button className="btn btn-primary" onClick={() => handleUploadDoc(v.vehicleId)}>Upload</button>
                            <button className="btn" style={{ background: "var(--bg-2)" }} onClick={() => setUploadingId(null)}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      </div>
    </>
  );
}

// ── GROUPS ────────────────────────────────────────────────────────────────────
export function Groups() {
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [createForm, setCreateForm] = useState({ groupName: "", locality: "", maxMembers: 5 });
  const [creating, setCreating] = useState(false);
  const [joinModal, setJoinModal] = useState(null);
  const [joinForm, setJoinForm] = useState({ role: "Passenger", childCount: 0 });
  const [joining, setJoining] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await getGroups(search);
      setGroups(res.data);
    } catch { setMsg({ type: "error", text: "Failed to load groups." }); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setMsg({ type: "", text: "" });
    try {
      await createGroup({ groupName: createForm.groupName, locality: createForm.locality, maxMembers: parseInt(createForm.maxMembers) });
      setMsg({ type: "success", text: "Group created successfully!" });
      setCreateForm({ groupName: "", locality: "", maxMembers: 5 });
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Failed to create group." });
    } finally { setCreating(false); }
  }

  async function handleJoinConfirm() {
    if (!joinModal) return;
    setJoining(true);
    try {
      await joinGroup(joinModal.groupId, { role: joinForm.role, childCount: joinForm.role === "Passenger" ? joinForm.childCount : 0 });
      setMsg({ type: "success", text: `Joined as ${joinForm.role} successfully!` });
      setJoinModal(null);
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Could not join group." });
      setJoinModal(null);
    } finally { setJoining(false); }
  }

  return (
    <>
      <div className="page-header">
        <div><h2 className="page-title">Find Groups</h2><p className="page-subtitle">Search and join carpool groups</p></div>
      </div>

      {msg.text && (
        <div className={`alert ${msg.type === "error" ? "alert-error" : "alert-success"}`} style={{ marginBottom: "20px" }}>
          {msg.text}
        </div>
      )}

      {/* Join Modal */}
      {joinModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card card-pad" style={{ width: "380px" }}>
            <h3 style={{ marginBottom: "16px" }}>Join "{joinModal.groupName || "Group #" + joinModal.groupId}"</h3>
            <div className="form-group">
              <label className="form-label">Your Role</label>
              <select className="form-control" value={joinForm.role} onChange={e => setJoinForm({ ...joinForm, role: e.target.value })}>
                <option value="Passenger">Passenger</option>
                <option value="Driver">Driver</option>
              </select>
            </div>
            {joinForm.role === "Passenger" && (
              <div className="form-group">
                <label className="form-label">Number of Children</label>
                <input className="form-control" type="number" min="0" max="5"
                  value={joinForm.childCount}
                  onChange={e => setJoinForm({ ...joinForm, childCount: parseInt(e.target.value) })} />
              </div>
            )}
            <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
              <button className="btn btn-primary btn-full" onClick={handleJoinConfirm} disabled={joining}>
                {joining ? "Joining..." : "Confirm Join"}
              </button>
              <button className="btn btn-full" style={{ background: "var(--bg-2)" }} onClick={() => setJoinModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Group */}
      <div className="card card-pad" style={{ marginBottom: "24px" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "16px" }}>Create New Group</h3>
        <form onSubmit={handleCreate}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Group Name</label>
              <input className="form-control" placeholder="e.g. Baner Morning Carpool"
                value={createForm.groupName} onChange={e => setCreateForm({ ...createForm, groupName: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Locality</label>
              <input className="form-control" placeholder="e.g. Baner, Pune"
                value={createForm.locality} onChange={e => setCreateForm({ ...createForm, locality: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Max Members</label>
              <input className="form-control" type="number" min="2" max="10"
                value={createForm.maxMembers} onChange={e => setCreateForm({ ...createForm, maxMembers: e.target.value })} />
            </div>
          </div>
          <button className="btn btn-primary" disabled={creating}>{creating ? "Creating..." : "+ Create Group"}</button>
        </form>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div style={{ padding: "20px", display: "flex", gap: "12px" }}>
          <input className="form-control" style={{ flex: 1 }} placeholder="Search by locality..."
            value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && load()} />
          <button className="btn btn-primary" onClick={load}>Search</button>
        </div>
      </div>

      {/* Results */}
      {loading ? <div className="loader"><div className="spinner" /></div>
        : groups.length === 0 ? (
          <div className="card"><div className="empty-state">
            <div className="empty-icon">🔍</div>
            <div className="empty-title">No groups found</div>
            <div className="empty-sub">Create a new group or try a different locality</div>
          </div></div>
        ) : (
          <div className="item-list">
            {groups.map(g => (
              <div className="item-card" key={g.groupId}>
                <div className="item-icon" style={{ background: "var(--success-light)" }}>👥</div>
                <div className="item-info">
                  <div className="item-title">
                    {g.groupName || "Unnamed Group"}
                    <span style={{ fontSize: "0.75rem", color: "var(--text-3)", fontWeight: 400, marginLeft: "8px" }}>#{g.groupId}</span>
                  </div>
                  <div className="item-sub" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <span>📍 {g.locality || "N/A"}</span>
                    <span>👤 {g.memberCount ?? 0}/{g.maxMembers} members</span>
                    <span>👨 Created by {g.createdByName || "Unknown"}</span>
                    <span className={`badge ${g.status === "Active" ? "badge-green" : "badge-gray"}`}>{g.status}</span>
                  </div>
                </div>
                <button className="btn btn-sm btn-success" onClick={() => { setJoinModal(g); setJoinForm({ role: "Passenger", childCount: 0 }); }}>
                  Join
                </button>
              </div>
            ))}
          </div>
        )}
    </>
  );
}

// ── MY GROUPS ─────────────────────────────────────────────────────────────────
export function MyGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ groupName: "", locality: "", maxMembers: 5 });
  const [saving, setSaving] = useState(false);
  const [seatModal, setSeatModal] = useState(null); // group for seat booking
  const [myChildren, setMyChildren] = useState([]);
  const [mySeatBookings, setMySeatBookings] = useState([]);
  const [groupSeatBookings, setGroupSeatBookings] = useState({});

  const load = () => {
    setLoading(true);
    getMyGroups().then(r => setGroups(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // Load children and seat bookings
    fetch("https://localhost:7086/api/Child", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    }).then(r => r.json()).then(data => setMyChildren(data)).catch(() => { });

    getMySeatBookings().then(r => setMySeatBookings(r.data)).catch(() => { });
  }, []);

  async function loadGroupSeatBookings(groupId) {
    try {
      const res = await getGroupSeatBookings(groupId);
      setGroupSeatBookings(prev => ({ ...prev, [groupId]: res.data }));
    } catch { }
  }

  async function handleLeave(groupId) {
    if (!window.confirm("Are you sure you want to leave this group?")) return;
    try {
      await leaveGroup(groupId);
      setMsg({ type: "success", text: "Left group successfully." });
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Could not leave group." });
    }
  }

  async function handleDelete(groupId) {
    if (!window.confirm("Delete this group permanently?")) return;
    try {
      await deleteGroup(groupId);
      setMsg({ type: "success", text: "Group deleted successfully." });
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Could not delete group." });
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateGroup(editModal.groupId, editForm);
      setMsg({ type: "success", text: "Group updated successfully." });
      setEditModal(null);
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Could not update group." });
    } finally { setSaving(false); }
  }

  async function handleBookSeat(groupId, childId, childName) {
    try {
      await bookSeat({ groupId, childId });
      setMsg({ type: "success", text: `✅ Seat booked for ${childName}!` });
      getMySeatBookings().then(r => setMySeatBookings(r.data)).catch(() => { });
      loadGroupSeatBookings(groupId);
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Failed to book seat." });
    }
  }

  async function handleCancelSeat(bookingId, childName) {
    if (!window.confirm(`Cancel seat booking for ${childName}?`)) return;
    try {
      await cancelSeat(bookingId);
      setMsg({ type: "success", text: "Seat booking cancelled." });
      getMySeatBookings().then(r => setMySeatBookings(r.data)).catch(() => { });
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Failed to cancel booking." });
    }
  }

  const statusBadge = {
    Active: { bg: "#F0FDF4", color: "#16A34A" },
    Pending: { bg: "#FFFBEB", color: "#D97706" },
    Inactive: { bg: "#F1F5F9", color: "#475569" },
  };

  return (
    <>
      <div className="page-header">
        <div><h2 className="page-title">My Groups</h2><p className="page-subtitle">Carpool groups you are a member of</p></div>
      </div>

      {msg.text && (
        <div className={`alert ${msg.type === "error" ? "alert-error" : "alert-success"}`} style={{ marginBottom: "20px" }}>
          {msg.text}
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card card-pad" style={{ width: "400px" }}>
            <h3 style={{ marginBottom: "16px" }}>Update Group</h3>
            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label className="form-label">Group Name</label>
                <input className="form-control" value={editForm.groupName} onChange={e => setEditForm({ ...editForm, groupName: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Locality</label>
                <input className="form-control" value={editForm.locality} onChange={e => setEditForm({ ...editForm, locality: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Max Members</label>
                <input className="form-control" type="number" min="2" max="10" value={editForm.maxMembers} onChange={e => setEditForm({ ...editForm, maxMembers: parseInt(e.target.value) })} />
              </div>
              <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                <button className="btn btn-primary btn-full" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
                <button type="button" className="btn btn-full" style={{ background: "var(--bg-2)" }} onClick={() => setEditModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Seat Booking Modal */}
      {seatModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card card-pad" style={{ width: "480px", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3>🧒 Book Seats — {seatModal.groupName}</h3>
              <button onClick={() => setSeatModal(null)} style={{ background: "#F1F5F9", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>

            {/* My Children */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, marginBottom: 10, fontSize: "0.9rem" }}>Your Children</div>
              {myChildren.filter(c => c.verificationStatus === "Approved").length === 0 ? (
                <div style={{ color: "var(--text-3)", fontSize: "0.85rem", padding: "12px", background: "#FFF7ED", borderRadius: 8 }}>
                  ⚠️ No verified children found. Admin must approve your children before booking seats.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {myChildren.filter(c => c.verificationStatus === "Approved").map(child => {
                    const existingBooking = mySeatBookings.find(
                      b => b.childId === child.childId && b.groupId === seatModal.groupId
                    );
                    return (
                      <div key={child.childId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#F8FAFC", borderRadius: 8, border: "1px solid #E2E8F0" }}>
                        <div style={{ fontSize: 24 }}>👦</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{child.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>Age {child.age} &bull; {child.class || "—"}</div>
                        </div>
                        {existingBooking ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ padding: "3px 10px", borderRadius: 100, fontSize: "0.75rem", fontWeight: 600, background: "#F0FDF4", color: "#16A34A" }}>✅ Booked</span>
                            <button className="btn btn-sm btn-danger" onClick={() => handleCancelSeat(existingBooking.seatBookingId, child.name)}>Cancel</button>
                          </div>
                        ) : (
                          <button className="btn btn-sm btn-primary" onClick={() => handleBookSeat(seatModal.groupId, child.childId, child.name)}>
                            Book Seat
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* All booked children in this group */}
            {groupSeatBookings[seatModal.groupId] && (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 10, fontSize: "0.9rem" }}>All Booked Children in this Group</div>
                {groupSeatBookings[seatModal.groupId].length === 0 ? (
                  <div style={{ color: "var(--text-3)", fontSize: "0.85rem" }}>No seats booked yet</div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>Child</th><th>Parent</th><th>Class</th><th>Booked At</th></tr>
                      </thead>
                      <tbody>
                        {groupSeatBookings[seatModal.groupId].map(b => (
                          <tr key={b.seatBookingId}>
                            <td style={{ fontWeight: 600 }}>{b.childName}</td>
                            <td style={{ color: "var(--text-2)", fontSize: "0.85rem" }}>{b.parentName}</td>
                            <td style={{ color: "var(--text-2)", fontSize: "0.85rem" }}>{b.childClass || "—"}</td>
                            <td style={{ color: "var(--text-3)", fontSize: "0.82rem" }}>{new Date(b.bookedAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? <div className="loader"><div className="spinner" /></div>
        : groups.length === 0 ? (
          <div className="card"><div className="empty-state">
            <div className="empty-icon">👥</div>
            <div className="empty-title">Not in any groups yet</div>
            <div className="empty-sub">Search and join a carpool group near you</div>
          </div></div>
        ) : (
          <div className="item-list">
            {groups.map(g => (
              <div key={g.groupId} style={{ marginBottom: "12px" }}>
                <div className="item-card" style={{ flexWrap: "wrap", gap: "12px" }}>
                  <div className="item-icon" style={{ background: "var(--primary-light)" }}>👥</div>
                  <div className="item-info" style={{ flex: 1 }}>
                    <div className="item-title">
                      {g.groupName || "Unnamed Group"}
                      <span style={{ fontSize: "0.75rem", color: "var(--text-3)", fontWeight: 400, marginLeft: "8px" }}>#{g.groupId}</span>
                      {g.isCreator && <span className="badge badge-amber" style={{ marginLeft: "8px" }}>Creator</span>}
                    </div>
                    <div className="item-sub" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                      <span>📍 {g.locality || "N/A"}</span>
                      <span>👤 {g.memberCount}/{g.maxMembers} members</span>
                      <span>👨 Created by {g.createdByName || "Unknown"}</span>
                      <span>🧒 {g.childCount} seats booked</span>
                      <span>Joined {new Date(g.joinedAt).toLocaleDateString()}</span>
                    </div>
                    {/* ✅ Show group status */}
                    <div style={{ marginTop: 6 }}>
                      <span style={{ padding: "2px 10px", borderRadius: 100, fontSize: "0.72rem", fontWeight: 600, background: statusBadge[g.status]?.bg || "#F1F5F9", color: statusBadge[g.status]?.color || "#475569" }}>
                        {g.status === "Pending" ? "⏳ Pending Admin Approval" : g.status === "Active" ? "✅ Active" : g.status}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    <span className={`badge ${g.role === "Driver" ? "badge-amber" : "badge-blue"}`}>{g.role}</span>

                    {/* ✅ Book Seat button for Passengers only */}
                    {g.role === "Passenger" && g.status === "Active" && (
                      <button className="btn btn-sm btn-success"
                        onClick={() => {
                          setSeatModal(g);
                          loadGroupSeatBookings(g.groupId);
                        }}>
                        🧒 Seats
                      </button>
                    )}

                    {g.isCreator ? (
                      <>
                        <button className="btn btn-sm btn-primary" onClick={() => {
                          setEditModal(g);
                          setEditForm({ groupName: g.groupName || "", locality: g.locality || "", maxMembers: g.maxMembers });
                        }}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(g.groupId)}>Delete</button>
                      </>
                    ) : (
                      <button className="btn btn-sm btn-danger" onClick={() => handleLeave(g.groupId)}>Leave</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </>
  );
}
// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
export function Notifications() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getNotifications().then(r => setData(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  async function handleRead(id) {
    await markAsRead(id);
    setData(data.map(n => n.notificationId === id ? { ...n, isRead: true } : n));
  }

  return (
    <>
      <div className="page-header">
        <div><h2 className="page-title">Notifications</h2><p className="page-subtitle">{data.filter(n => !n.isRead).length} unread notifications</p></div>
      </div>
      <div className="card">
        {loading ? <div className="loader"><div className="spinner" /></div>
          : data.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔔</div>
              <div className="empty-title">No notifications</div>
              <div className="empty-sub">You're all caught up!</div>
            </div>
          ) : data.map(n => (
            <div key={n.notificationId} className={`notif-item ${!n.isRead ? "unread" : ""}`}
              onClick={() => !n.isRead && handleRead(n.notificationId)}>
              {!n.isRead && <div className="notif-dot-indicator" />}
              <div style={{ flex: 1 }}>
                <div className="notif-msg">{n.message}</div>
                <div className="notif-time">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
              {!n.isRead && <span className="badge badge-blue" style={{ fontSize: "0.65rem" }}>New</span>}
            </div>
          ))}
      </div>
    </>
  );
}

// ── START RIDE ────────────────────────────────────────────────────────────────
export function StartRide() {
  const { user } = useAuth();
  const [form, setForm] = useState({ groupId: "", vehicleId: "" });
  const [groups, setGroups] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);

  // ✅ Track active ride state
  const [activeRideId, setActiveRideId] = useState(localStorage.getItem("rideId") || null);
  const [activeRideInfo, setActiveRideInfo] = useState(null);

  useEffect(() => {
    getMyGroups().then(r => setGroups(r.data)).catch(() => {});
    getVehicles().then(r => setVehicles(r.data)).catch(() => {});
    // ✅ Load active ride info if exists
    if (localStorage.getItem("rideId")) {
      loadActiveRideInfo();
    }
  }, []);

  async function loadActiveRideInfo() {
    try {
      const res = await getActiveRides();
      const storedRideId = parseInt(localStorage.getItem("rideId"));
      const activeRide = res.data.find(r => r.rideId === storedRideId);
      if (activeRide) {
        setActiveRideInfo(activeRide);
        setActiveRideId(storedRideId);
      } else {
        // Ride no longer active, clear localStorage
        localStorage.removeItem("rideId");
        setActiveRideId(null);
        setActiveRideInfo(null);
      }
    } catch { }
  }

  async function handle() {
    if (!form.groupId) return setMsg({ type: "error", text: "Please select a group." });
    setLoading(true);
    try {
      const res = await startRide({
        groupId: parseInt(form.groupId),
        vehicleId: form.vehicleId ? parseInt(form.vehicleId) : null
      });
      const rideId = res.data.rideId;
      localStorage.setItem("rideId", rideId);
      setActiveRideId(rideId);
      setMsg({ type: "success", text: `Ride #${rideId} started successfully!` });
      loadActiveRideInfo();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Failed to start ride." });
    } finally { setLoading(false); }
  }

  // ✅ Mark ride as completed by driver
  async function handleComplete() {
    if (!activeRideId) return;
    if (!window.confirm("Mark this ride as completed?")) return;
    setCompleting(true);
    try {
      await completeRide(activeRideId);
      localStorage.removeItem("rideId");
      setActiveRideId(null);
      setActiveRideInfo(null);
      setMsg({ type: "success", text: `Ride #${activeRideId} marked as completed! ✅` });
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Failed to complete ride." });
    } finally { setCompleting(false); }
  }

  return (
    <>
      <div className="page-header">
        <div><h2 className="page-title">Start Ride</h2><p className="page-subtitle">Begin today's school pickup ride</p></div>
      </div>

      <div style={{ maxWidth: "520px" }}>

        {/* ✅ Active Ride Banner — shown when ride is in progress */}
        {activeRideId && (
          <div style={{
            background: "linear-gradient(135deg, #FFF7ED, #FFFBEB)",
            border: "2px solid var(--warning)",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "20px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#92400E" }}>
                  🟡 Ride #{activeRideId} In Progress
                </div>
                {activeRideInfo && (
                  <div style={{ fontSize: "0.85rem", color: "#78350F", marginTop: "4px" }}>
                    Group: {activeRideInfo.groupName || "Group #" + activeRideInfo.groupId} &bull;
                    Started: {activeRideInfo.pickupTime || "—"}
                  </div>
                )}
                <div style={{ fontSize: "0.8rem", color: "#92400E", marginTop: "6px" }}>
                  ✅ Mark as completed when all children are dropped off
                </div>
              </div>
              <button
                onClick={handleComplete}
                disabled={completing}
                style={{
                  background: completing ? "#ccc" : "#16A34A",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 20px",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: completing ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                {completing ? "Completing..." : "✅ Mark as Completed"}
              </button>
            </div>
          </div>
        )}

        {msg.text && (
          <div className={`alert ${msg.type === "error" ? "alert-error" : "alert-success"}`} style={{ marginBottom: "16px" }}>
            {msg.text}
          </div>
        )}

        {/* ✅ Only show start form if no active ride */}
        {!activeRideId ? (
          <div className="card card-pad">
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "16px" }}>Start New Ride</h3>
            <div className="form-group">
              <label className="form-label">Select Group</label>
              <select className="form-control" value={form.groupId} onChange={e => setForm({ ...form, groupId: e.target.value })}>
                <option key="default-group" value="">Choose your carpool group</option>
                {groups.map(g => (
                  <option key={g.groupId} value={g.groupId}>
                    {g.groupName || "Unnamed"} #{g.groupId} — {g.locality}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Select Vehicle <span style={{ color: "var(--text-3)", fontWeight: 400 }}>(optional)</span></label>
              <select className="form-control" value={form.vehicleId} onChange={e => setForm({ ...form, vehicleId: e.target.value })}>
                <option key="default-vehicle" value="">Choose vehicle</option>
                {vehicles.map(v => (
                  <option key={v.vehicleId} value={v.vehicleId}>{v.vehicleNumber} ({v.vehicleType})</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary btn-full btn-lg" style={{ marginTop: "8px" }} onClick={handle} disabled={loading}>
              {loading ? "Starting..." : "▶  Start Ride"}
            </button>
          </div>
        ) : (
          <div className="card card-pad" style={{ textAlign: "center", color: "var(--text-3)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🚌</div>
            <div style={{ fontWeight: 600 }}>Ride is in progress</div>
            <div style={{ fontSize: "0.85rem", marginTop: "4px" }}>Complete the current ride before starting a new one</div>
          </div>
        )}
      </div>
    </>
  );
}

// ── RIDE HISTORY ──────────────────────────────────────────────────────────────
export function RideHistory() {
  const [allRides, setAllRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [scheduleForm, setScheduleForm] = useState({ groupId: "", vehicleId: "", rideDate: "", pickupTime: "" });
  const [scheduling, setScheduling] = useState(false);
  const [groups, setGroups] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [expandedRide, setExpandedRide] = useState(null);
  const [attendanceMap, setAttendanceMap] = useState({});

  useEffect(() => {
    getMyGroups().then(r => setGroups(r.data)).catch(() => {});
    getVehicles().then(r => setVehicles(r.data)).catch(() => {});
    loadRides();
  }, []);

  async function loadRides() {
    setLoading(true);
    try {
      // ✅ Fixed: getMyRides is now properly imported
      const res = await getMyRides();
      setAllRides(res.data);
    } catch {
      setMsg({ type: "error", text: "Failed to load rides." });
    } finally { setLoading(false); }
  }

  async function handleComplete(id) {
    try {
      await completeRide(id);
      // ✅ Also clear localStorage if this was the active ride
      if (localStorage.getItem("rideId") == id) {
        localStorage.removeItem("rideId");
      }
      setMsg({ type: "success", text: `Ride #${id} marked as completed!` });
      loadRides();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Failed to complete ride." });
    }
  }

  async function handleSchedule(e) {
    e.preventDefault();
    if (!scheduleForm.groupId) return setMsg({ type: "error", text: "Please select a group." });
    setScheduling(true);
    try {
      await scheduleRide({
        groupId: parseInt(scheduleForm.groupId),
        vehicleId: scheduleForm.vehicleId ? parseInt(scheduleForm.vehicleId) : null,
        rideDateString: scheduleForm.rideDate,
        pickupTimeString: scheduleForm.pickupTime
      });
      setMsg({ type: "success", text: "Ride scheduled successfully!" });
      setScheduleForm({ groupId: "", vehicleId: "", rideDate: "", pickupTime: "" });
      loadRides();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Failed to schedule ride." });
    } finally { setScheduling(false); }
  }

  async function toggleAttendance(rideId) {
    if (expandedRide === rideId) { setExpandedRide(null); return; }
    setExpandedRide(rideId);
    if (!attendanceMap[rideId]) {
      try {
        const res = await getRideAttendance(rideId);
        setAttendanceMap(prev => ({ ...prev, [rideId]: res.data }));
      } catch {
        setAttendanceMap(prev => ({ ...prev, [rideId]: [] }));
      }
    }
  }

  const now = new Date();
  const activeRides = allRides.filter(r => r.status === "Started");
  const upcomingRides = allRides.filter(r => r.status === "Scheduled" && new Date(r.rideDate) >= now);
  const pastRides = allRides.filter(r => r.status === "Completed" || r.status === "Cancelled" || (r.status === "Scheduled" && new Date(r.rideDate) < now));

  const statusColor = { Started: "badge-amber", Completed: "badge-green", Scheduled: "badge-blue", Cancelled: "badge-red" };
  const statusIcon = { Started: "🟡", Completed: "✅", Scheduled: "📅", Cancelled: "❌" };
  const attendanceColor = { Boarded: "badge-green", Dropped: "badge-blue", Absent: "badge-gray" };
  const attendanceIcon = { Boarded: "✅", Dropped: "🏠", Absent: "❌" };

  function RideCard({ r, showComplete = false }) {
    const att = attendanceMap[r.rideId] || [];
    const isExpanded = expandedRide === r.rideId;
    const driver = r.members?.find(m => m.role === "Driver");
    const passengers = r.members?.filter(m => m.role === "Passenger") || [];

    return (
      <div className="card card-pad" style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1rem" }}>
              {statusIcon[r.status]} Ride #{r.rideId}
              <span style={{ fontSize: "0.75rem", color: "var(--text-3)", fontWeight: 400, marginLeft: "8px" }}>
                {r.groupName || "Group #" + r.groupId}
              </span>
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-2)", marginTop: "4px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <span>📅 {new Date(r.rideDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
              <span>🕐 {r.pickupTime || "—"}</span>
              {r.dropTime && <span>🏁 {r.dropTime}</span>}
              <span className={`badge ${statusColor[r.status] || "badge-gray"}`}>{r.status}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {/* ✅ Complete button shown in ride history too */}
            {showComplete && r.status === "Started" && (
              <button
                className="btn btn-sm btn-success"
                onClick={() => handleComplete(r.rideId)}
              >
                ✅ Complete
              </button>
            )}
            <button
              className="btn btn-sm"
              style={{ background: isExpanded ? "var(--primary)" : "var(--bg-2)", color: isExpanded ? "white" : "inherit" }}
              onClick={() => toggleAttendance(r.rideId)}
            >
              {isExpanded ? "Hide Details" : "View Details"}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div style={{ marginTop: "16px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div style={{ background: "var(--warning-light)", borderRadius: "8px", padding: "12px" }}>
                <div style={{ fontWeight: 600, marginBottom: "8px" }}>🚗 Driver</div>
                {driver ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--warning)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "0.85rem" }}>
                      {driver.parentName?.charAt(0) || "?"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{driver.parentName || "Unknown"}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>Confirmed Driver</div>
                    </div>
                  </div>
                ) : <div style={{ color: "var(--text-3)" }}>No driver assigned</div>}
              </div>

              <div style={{ background: "var(--primary-light)", borderRadius: "8px", padding: "12px" }}>
                <div style={{ fontWeight: 600, marginBottom: "8px" }}>👥 Passengers ({passengers.length})</div>
                {passengers.length === 0 ? (
                  <div style={{ color: "var(--text-3)" }}>No passengers</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {passengers.map((p, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>
                          {p.parentName?.charAt(0) || "?"}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: "0.85rem" }}>{p.parentName}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>🧒 {p.childCount} children</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 600, marginBottom: "10px" }}>📋 Attendance</div>
              {att.length === 0 ? (
                <div style={{ color: "var(--text-3)", fontSize: "0.85rem" }}>No attendance records for this ride.</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Child Name</th><th>Status</th><th>Boarded At</th><th>Dropped At</th></tr>
                    </thead>
                    <tbody>
                      {att.map(a => (
                        <tr key={a.attendanceId}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{a.childName}</div>
                            <div style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>ID: {a.childId}</div>
                          </td>
                          <td>
                            <span className={`badge ${attendanceColor[a.status] || "badge-gray"}`}>
                              {attendanceIcon[a.status]} {a.status}
                            </span>
                          </td>
                          <td>
                            {a.boardingTime ? (
                              <><div>{new Date(a.boardingTime).toLocaleDateString()}</div><div style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>{new Date(a.boardingTime).toLocaleTimeString()}</div></>
                            ) : <span style={{ color: "var(--text-3)" }}>—</span>}
                          </td>
                          <td>
                            {a.dropTime ? (
                              <><div>{new Date(a.dropTime).toLocaleDateString()}</div><div style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>{new Date(a.dropTime).toLocaleTimeString()}</div></>
                            ) : <span style={{ color: "var(--text-3)" }}>—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div><h2 className="page-title">Ride History</h2><p className="page-subtitle">View, schedule and manage all your rides</p></div>
      </div>

      {msg.text && (
        <div className={`alert ${msg.type === "error" ? "alert-error" : "alert-success"}`} style={{ marginBottom: "20px" }}>
          {msg.text}
        </div>
      )}

      {/* Schedule Ride */}
      <div className="card card-pad" style={{ marginBottom: "24px" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "16px" }}>📅 Schedule a Ride</h3>
        <form onSubmit={handleSchedule}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Select Group</label>
              <select className="form-control" value={scheduleForm.groupId}
                onChange={e => setScheduleForm({ ...scheduleForm, groupId: e.target.value })} required>
                <option key="sg-default" value="">Choose group</option>
                {groups.map(g => (
                  <option key={g.groupId} value={g.groupId}>{g.groupName || "Unnamed"} #{g.groupId}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Select Vehicle <span style={{ color: "var(--text-3)", fontWeight: 400 }}>(optional)</span></label>
              <select className="form-control" value={scheduleForm.vehicleId}
                onChange={e => setScheduleForm({ ...scheduleForm, vehicleId: e.target.value })}>
                <option key="sv-default" value="">Choose vehicle</option>
                {vehicles.map(v => (
                  <option key={v.vehicleId} value={v.vehicleId}>{v.vehicleNumber} ({v.vehicleType})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Ride Date</label>
              <input className="form-control" type="date" value={scheduleForm.rideDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={e => setScheduleForm({ ...scheduleForm, rideDate: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Pickup Time</label>
              <input className="form-control" type="time" value={scheduleForm.pickupTime}
                onChange={e => setScheduleForm({ ...scheduleForm, pickupTime: e.target.value })} required />
            </div>
          </div>
          <button className="btn btn-primary" disabled={scheduling}>{scheduling ? "Scheduling..." : "📅 Schedule Ride"}</button>
        </form>
      </div>

      {loading ? <div className="loader"><div className="spinner" /></div> : (
        <>
          {activeRides.length > 0 && (
            <div style={{ marginBottom: "28px" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "12px", color: "var(--warning)" }}>
                🟡 Active Rides ({activeRides.length})
              </h3>
              {activeRides.map(r => <RideCard key={r.rideId} r={r} showComplete={true} />)}
            </div>
          )}

          {upcomingRides.length > 0 && (
            <div style={{ marginBottom: "28px" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "12px", color: "var(--primary)" }}>
                📅 Upcoming Rides ({upcomingRides.length})
              </h3>
              {upcomingRides.map(r => <RideCard key={r.rideId} r={r} />)}
            </div>
          )}

          <div style={{ marginBottom: "28px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "12px", color: "var(--text-2)" }}>
              🕐 Past Rides ({pastRides.length})
            </h3>
            {pastRides.length === 0 ? (
              <div className="card"><div className="empty-state">
                <div className="empty-icon">🚌</div>
                <div className="empty-title">No past rides</div>
                <div className="empty-sub">Completed rides will appear here</div>
              </div></div>
            ) : pastRides.map(r => <RideCard key={r.rideId} r={r} />)}
          </div>
        </>
      )}
    </>
  );
}

// ── ATTENDANCE ────────────────────────────────────────────────────────────────
export function Attendance() {
  const [childId, setChildId] = useState("");
  const [rideIdInput, setRideIdInput] = useState(localStorage.getItem("rideId") || "");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [attendanceList, setAttendanceList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [activeRides, setActiveRides] = useState([]);

  useEffect(() => {
    getActiveRides().then(r => setActiveRides(r.data)).catch(() => {});
    if (rideIdInput) loadAttendance(rideIdInput);
  }, []);

  async function loadAttendance(id) {
    if (!id) return;
    setLoadingList(true);
    try {
      const res = await getRideAttendance(parseInt(id));
      setAttendanceList(res.data);
    } catch {
      setAttendanceList([]);
    } finally { setLoadingList(false); }
  }

  async function update(status) {
    if (!childId) return setMsg({ type: "error", text: "Please enter a Child ID." });
    if (!rideIdInput) return setMsg({ type: "error", text: "No ride selected." });
    try {
      await markAttendance({ rideId: parseInt(rideIdInput), childId: parseInt(childId), status });
      setMsg({ type: "success", text: `Marked as ${status} successfully!` });
      setChildId("");
      loadAttendance(rideIdInput);
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Failed to update." });
    }
  }

  const statusColor = { Boarded: "badge-green", Dropped: "badge-blue", Absent: "badge-gray" };
  const statusIcon = { Boarded: "✅", Dropped: "🏠", Absent: "❌" };

  return (
    <>
      <div className="page-header">
        <div><h2 className="page-title">Attendance</h2><p className="page-subtitle">Mark and view children boarding/drop status</p></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "24px", alignItems: "start" }}>
        <div className="card card-pad">
          {activeRides.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <label className="form-label">Quick Select Active Ride</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {activeRides.map(r => (
                  <button key={r.rideId}
                    className={`btn btn-sm ${rideIdInput == r.rideId ? "btn-primary" : ""}`}
                    style={{ textAlign: "left", background: rideIdInput == r.rideId ? "var(--primary)" : "var(--bg-2)", color: rideIdInput == r.rideId ? "white" : "inherit" }}
                    onClick={() => { setRideIdInput(String(r.rideId)); loadAttendance(r.rideId); }}>
                    🟡 Ride #{r.rideId} — {r.groupName || "Group #" + r.groupId}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Ride ID</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input className="form-control" type="number" placeholder="Enter Ride ID"
                value={rideIdInput} onChange={e => setRideIdInput(e.target.value)} />
              <button className="btn btn-primary" onClick={() => loadAttendance(rideIdInput)}>Load</button>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px", marginTop: "8px" }}>
            {msg.text && (
              <div className={`alert ${msg.type === "error" ? "alert-error" : "alert-success"}`} style={{ marginBottom: "12px" }}>
                {msg.text}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Child ID</label>
              <input className="form-control" type="number" placeholder="Enter Child ID"
                value={childId} onChange={e => setChildId(e.target.value)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "8px" }}>
              <button className="btn btn-success btn-full" onClick={() => update("Boarded")}>✓ Boarded</button>
              <button className="btn btn-primary btn-full" onClick={() => update("Dropped")}>↓ Dropped</button>
            </div>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "16px" }}>
            {rideIdInput ? `Ride #${rideIdInput} — Attendance` : "Select a ride to view attendance"}
          </h3>

          {loadingList ? <div className="loader"><div className="spinner" /></div>
            : attendanceList.length === 0 ? (
              <div className="card"><div className="empty-state">
                <div className="empty-icon">📋</div>
                <div className="empty-title">No attendance records</div>
                <div className="empty-sub">{rideIdInput ? "No children found for this ride" : "Select or enter a Ride ID"}</div>
              </div></div>
            ) : (
              <div className="card">
                <div style={{ padding: "12px 16px", display: "flex", gap: "16px", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
                  <span style={{ color: "var(--success)" }}>✅ Boarded: {attendanceList.filter(a => a.status === "Boarded").length}</span>
                  <span style={{ color: "var(--primary)" }}>🏠 Dropped: {attendanceList.filter(a => a.status === "Dropped").length}</span>
                  <span style={{ color: "var(--text-3)" }}>❌ Absent: {attendanceList.filter(a => a.status === "Absent").length}</span>
                  <span style={{ color: "var(--text-2)", marginLeft: "auto" }}>Total: {attendanceList.length}</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Child Name</th><th>Status</th><th>Boarded At</th><th>Dropped At</th></tr>
                    </thead>
                    <tbody>
                      {attendanceList.map(a => (
                        <tr key={a.attendanceId}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{a.childName}</div>
                            <div style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>ID: {a.childId}</div>
                          </td>
                          <td>
                            <span className={`badge ${statusColor[a.status] || "badge-gray"}`}>
                              {statusIcon[a.status]} {a.status}
                            </span>
                          </td>
                          <td>
                            {a.boardingTime ? (
                              <><div>{new Date(a.boardingTime).toLocaleDateString()}</div><div style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>{new Date(a.boardingTime).toLocaleTimeString()}</div></>
                            ) : <span style={{ color: "var(--text-3)" }}>—</span>}
                          </td>
                          <td>
                            {a.dropTime ? (
                              <><div>{new Date(a.dropTime).toLocaleDateString()}</div><div style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>{new Date(a.dropTime).toLocaleTimeString()}</div></>
                            ) : <span style={{ color: "var(--text-3)" }}>—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </div>
      </div>
    </>
  );
}

// ── LIVE TRACKING ─────────────────────────────────────────────────────────────
export function ParentLiveTracking() {
  const { token, user } = useAuth();
  const rideId = parseInt(localStorage.getItem("rideId"));
  const role = user?.role === "Driver" ? "driver" : "parent";

  if (!rideId) {
    return (
      <>
        <div className="page-header">
          <div>
            <h2 className="page-title">Live Tracking</h2>
            <p className="page-subtitle">Track your active ride</p>
          </div>
        </div>
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📍</div>
            <div className="empty-title">No active ride</div>
            <div className="empty-sub">Start a ride first to enable live tracking</div>
          </div>
        </div>
      </>
    );
  }

  return <LiveTracking rideId={rideId} role={role} token={token} />;
}

// ── PAYMENTS ──────────────────────────────────────────────────────────────────
export function ParentPayments() {
  const { token } = useAuth();
  return <Payments token={token} role="parent" />;
}