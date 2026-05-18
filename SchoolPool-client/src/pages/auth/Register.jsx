import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../../services/authService";

export default function Register() {
  const [form, setForm] = useState({
    fullName: "", email: "", password: "",
    phoneNumber: "", role: "Parent",
    address: "", locality: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handle(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register(form);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const f = (field, val) => setForm({ ...form, [field]: val });

  return (
    <div className="auth-page">
      <div className="auth-card fade-in" style={{ maxWidth: "480px" }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">🚌</div>
          <span className="auth-logo-text">SchoolPool</span>
        </div>

        <h2 className="auth-title">Create account</h2>
        <p className="auth-sub">Join SchoolPool for safe school commutes</p>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">Account created! Redirecting to login...</div>}

        <div className="role-tabs">
          {["Parent", "Admin"].map(r => (
            <button
              key={r}
              type="button"
              className={`role-tab ${form.role === r ? "active" : ""}`}
              onClick={() => f("role", r)}
            >
              {r === "Parent" ? "👨‍👩‍👧 Parent" : "🛡️ Admin"}
            </button>
          ))}
        </div>

        <form onSubmit={handle}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-control" placeholder="John Doe"
                value={form.fullName} onChange={e => f("fullName", e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="form-control" placeholder="9876543210"
                value={form.phoneNumber} onChange={e => f("phoneNumber", e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-control" type="email" placeholder="you@example.com"
              value={form.email} onChange={e => f("email", e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-control" type="password" placeholder="Create a strong password"
              value={form.password} onChange={e => f("password", e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="form-label">Address</label>
            <input className="form-control" placeholder="Your address"
              value={form.address} onChange={e => f("address", e.target.value)} />
          </div>

          {form.role === "Parent" && (
            <div className="form-group">
              <label className="form-label">Locality / Area</label>
              <input className="form-control" placeholder="e.g. Baner, Pune"
                value={form.locality} onChange={e => f("locality", e.target.value)} />
            </div>
          )}

          <button className="btn btn-primary btn-full btn-lg" style={{ marginTop: "8px" }} disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
