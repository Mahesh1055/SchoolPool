import { useEffect, useState } from "react";
import { getChildren, addChild, deleteChild, uploadChildDocument } from "../../services/childService";

export default function Children() {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", age: "", class: "", schoolId: "", documentUrl: "" });
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [docUrl, setDocUrl] = useState("");

  const load = () => {
    setLoading(true);
    getChildren().then(r => setChildren(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const f = (field, val) => setForm({ ...form, [field]: val });

  async function handleAdd(e) {
    e.preventDefault();
    setSubmitting(true);
    setMsg({ type: "", text: "" });
    try {
      await addChild({
        ...form,
        age: parseInt(form.age),
        schoolId: form.schoolId ? parseInt(form.schoolId) : null
      });
      setMsg({ type: "success", text: "Child added! Waiting for admin verification." });
      setForm({ name: "", age: "", class: "", schoolId: "", documentUrl: "" });
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Failed to add child." });
    } finally { setSubmitting(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm("Remove this child?")) return;
    try {
      await deleteChild(id);
      load();
    } catch {
      setMsg({ type: "error", text: "Failed to delete child." });
    }
  }

  async function handleUploadDoc(childId) {
    if (!docUrl.trim()) return;
    try {
      await uploadChildDocument(childId, { documentUrl: docUrl });
      setMsg({ type: "success", text: "Document uploaded! Waiting for admin review." });
      setUploadingId(null);
      setDocUrl("");
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Failed to upload document." });
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
        <div>
          <h2 className="page-title">Children</h2>
          <p className="page-subtitle">Register and manage your children's profiles</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "24px", alignItems: "start" }}>

        {/* Add Form */}
        <div className="card card-pad">
          <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "20px" }}>Add Child</h3>

          {msg.text && (
            <div className={`alert ${msg.type === "error" ? "alert-error" : "alert-success"}`}>{msg.text}</div>
          )}

          {/* Info box */}
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: "0.82rem", color: "#1E40AF" }}>
            ℹ️ After adding a child, admin will verify the details. Upload a valid document (school ID / birth certificate) for faster approval.
          </div>

          <form onSubmit={handleAdd}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-control" placeholder="Child's name"
                value={form.name} onChange={e => f("name", e.target.value)} required />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Age</label>
                <input className="form-control" type="number" placeholder="Age"
                  value={form.age} onChange={e => f("age", e.target.value)} required min="3" max="18" />
              </div>
              <div className="form-group">
                <label className="form-label">Class / Grade</label>
                <input className="form-control" placeholder="e.g. 5th"
                  value={form.class} onChange={e => f("class", e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">School ID <span style={{ color: "var(--text-3)", fontWeight: 400 }}>(optional)</span></label>
              <input className="form-control" type="number" placeholder="School ID"
                value={form.schoolId} onChange={e => f("schoolId", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">
                Document URL <span style={{ color: "var(--text-3)", fontWeight: 400 }}>(school ID / birth certificate link)</span>
              </label>
              <input className="form-control" placeholder="https://drive.google.com/..."
                value={form.documentUrl} onChange={e => f("documentUrl", e.target.value)} />
            </div>
            <button className="btn btn-primary btn-full" disabled={submitting}>
              {submitting ? "Adding..." : "+ Add Child"}
            </button>
          </form>
        </div>

        {/* List */}
        <div>
          <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "16px", color: "var(--text-2)" }}>
            Registered Children ({children.length})
          </h3>

          {loading ? <div className="loader"><div className="spinner" /></div>
            : children.length === 0 ? (
              <div className="card"><div className="empty-state">
                <div className="empty-icon">👶</div>
                <div className="empty-title">No children added yet</div>
                <div className="empty-sub">Add your first child using the form</div>
              </div></div>
            ) : (
              <div className="item-list">
                {children.map(c => {
                  const s = statusColor[c.verificationStatus] || statusColor.Pending;
                  return (
                    <div key={c.childId} style={{ marginBottom: "12px" }}>
                      <div className="item-card">
                        <div className="item-icon">👦</div>
                        <div className="item-info" style={{ flex: 1 }}>
                          <div className="item-title">{c.name}</div>
                          <div className="item-sub">
                            Age {c.age} &bull; {c.class || "No class"} &bull; {c.school?.schoolName || "No school"}
                          </div>
                          {/* ✅ Verification status badge */}
                          <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                            <span style={{ padding: "2px 10px", borderRadius: 100, fontSize: "0.75rem", fontWeight: 600, background: s.bg, color: s.color }}>
                              {s.icon} {c.verificationStatus}
                            </span>
                            {c.verificationStatus === "Rejected" && c.rejectionReason && (
                              <span style={{ fontSize: "0.75rem", color: "#DC2626" }}>
                                Reason: {c.rejectionReason}
                              </span>
                            )}
                            {!c.documentUrl && (
                              <span style={{ fontSize: "0.75rem", color: "#D97706" }}>⚠️ No document uploaded</span>
                            )}
                          </div>
                        </div>
                        <div className="item-actions" style={{ display: "flex", gap: 6 }}>
                          {/* Upload doc button for pending/rejected */}
                          {(c.verificationStatus === "Pending" || c.verificationStatus === "Rejected") && (
                            <button className="btn btn-sm btn-primary"
                              onClick={() => { setUploadingId(c.childId); setDocUrl(c.documentUrl || ""); }}>
                              📎 Doc
                            </button>
                          )}
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.childId)}>
                            Remove
                          </button>
                        </div>
                      </div>

                      {/* Upload document inline form */}
                      {uploadingId === c.childId && (
                        <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "12px 16px", marginTop: 4 }}>
                          <label style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: 6, display: "block" }}>
                            Upload Document URL (Google Drive / Dropbox link)
                          </label>
                          <div style={{ display: "flex", gap: 8 }}>
                            <input className="form-control" placeholder="https://..."
                              value={docUrl} onChange={e => setDocUrl(e.target.value)} />
                            <button className="btn btn-primary" onClick={() => handleUploadDoc(c.childId)}>Upload</button>
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