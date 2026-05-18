// ─────────────────────────────────────────────────────────
//  FILE:  src/pages/Payments.jsx
//
//  Usage:
//    Parent:  <Payments token={jwt} role="parent" />
//    Admin:   <Payments token={jwt} role="admin"  />
// ─────────────────────────────────────────────────────────
import { useEffect, useState } from "react";

const API = "https://localhost:7086/api";

// ── Helpers ───────────────────────────────────────────────
const INR   = (n) => `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
const badge = (status) => {
  const map = {
    Completed: { bg: "#dcfce7", color: "#166534" },
    Pending:   { bg: "#fef9c3", color: "#854d0e" },
    Failed:    { bg: "#fee2e2", color: "#991b1b" },
    Refunded:  { bg: "#f3f4f6", color: "#374151" },
  };
  const s = map[status] ?? { bg: "var(--color-background-secondary)", color: "var(--color-text-secondary)" };
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500,
      background: s.bg, color: s.color,
    }}>
      {status}
    </span>
  );
};

// ════════════════════════════════════════════════════════
//  PARENT VIEW — make a payment + view history
// ════════════════════════════════════════════════════════
function ParentPayments({ token }) {
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [amount,   setAmount]   = useState("");
  const [method,   setMethod]   = useState("UPI");
  const [sending,  setSending]  = useState(false);
  const [msg,      setMsg]      = useState(null); // { type: ok|err, text }

  const fetchPayments = async () => {
    try {
      const res = await fetch(`${API}/payment/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setPayments(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchPayments(); }, [token]);

  const submitPayment = async () => {
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      setMsg({ type: "err", text: "Enter a valid amount." }); return;
    }
    setSending(true);
    try {
      const res = await fetch(`${API}/payment`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: amt, paymentMethod: method }),
      });
      if (res.ok) {
        setMsg({ type: "ok", text: "Payment submitted successfully!" });
        setAmount("");
        fetchPayments();
      } else {
        const d = await res.json();
        setMsg({ type: "err", text: d.message ?? "Something went wrong." });
      }
    } catch (e) {
      setMsg({ type: "err", text: "Network error." });
    }
    setSending(false);
    setTimeout(() => setMsg(null), 4000);
  };

  const totalPaid = payments
    .filter(p => p.status === "Completed")
    .reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div style={{ padding: "1.25rem", maxWidth: 560, margin: "0 auto" }}>

      {/* Summary card */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 12, marginBottom: "1.25rem",
      }}>
        {[
          { label: "Total paid",    value: INR(totalPaid) },
          { label: "Transactions",  value: payments.length },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: "var(--color-background-secondary)",
            borderRadius: 10, padding: "14px 16px",
          }}>
            <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--color-text-secondary)" }}>{label}</p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Make payment */}
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 12, padding: "1.25rem", marginBottom: "1.25rem",
      }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 500 }}>Make a payment</h3>

        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <input
            type="number" min="1" placeholder="Amount (₹)"
            value={amount} onChange={e => setAmount(e.target.value)}
            style={{
              flex: 1, padding: "9px 12px", borderRadius: 8,
              border: "0.5px solid var(--color-border-secondary)",
              background: "var(--color-background-secondary)",
              color: "var(--color-text-primary)", fontSize: 14,
            }}
          />
          <select
            value={method} onChange={e => setMethod(e.target.value)}
            style={{
              padding: "9px 12px", borderRadius: 8,
              border: "0.5px solid var(--color-border-secondary)",
              background: "var(--color-background-secondary)",
              color: "var(--color-text-primary)", fontSize: 14,
            }}
          >
            <option>UPI</option>
            <option>Card</option>
            <option>Cash</option>
          </select>
        </div>

        {msg && (
          <p style={{
            margin: "0 0 10px", fontSize: 13,
            color: msg.type === "ok" ? "#166534" : "#991b1b",
          }}>
            {msg.text}
          </p>
        )}

        <button
          onClick={submitPayment} disabled={sending}
          style={{
            width: "100%", padding: "11px 0", borderRadius: 8, border: "none",
            background: "#1d4ed8", color: "#fff",
            fontWeight: 500, fontSize: 14,
            cursor: sending ? "not-allowed" : "pointer",
            opacity: sending ? 0.7 : 1,
          }}
        >
          {sending ? "Submitting…" : "Submit payment"}
        </button>
      </div>

      {/* History */}
      <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 500 }}>Payment history</h3>
      {loading && <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>Loading…</p>}
      {!loading && payments.length === 0 && (
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>No payments yet.</p>
      )}
      {payments.map(p => (
        <div key={p.paymentId} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "12px 14px",
          background: "var(--color-background-secondary)",
          borderRadius: 9, marginBottom: 8,
        }}>
          <div>
            <p style={{ margin: "0 0 2px", fontWeight: 500, fontSize: 14 }}>{INR(p.amount)}</p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)" }}>
              {p.paymentMethod} · {new Date(p.paidAt).toLocaleDateString("en-IN")}
            </p>
          </div>
          {badge(p.status)}
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════
//  ADMIN VIEW — all payments + status update + summary
// ════════════════════════════════════════════════════════
function AdminPayments({ token }) {
  const [payments, setPayments] = useState([]);
  const [summary,  setSummary]  = useState(null);
  const [filter,   setFilter]   = useState("");
  const [loading,  setLoading]  = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        fetch(`${API}/payment${filter ? `?status=${filter}` : ""}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/payment/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (pRes.ok) setPayments(await pRes.json());
      if (sRes.ok) setSummary(await sRes.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [filter]);

  const updateStatus = async (id, status) => {
    await fetch(`${API}/payment/${id}/status`, {
      method:  "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    fetchAll();
  };

  return (
    <div style={{ padding: "1.25rem" }}>

      {/* Summary strip */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: "1.25rem" }}>
          {[
            { label: "Collected",  value: INR(summary.totalCollected) },
            { label: "Pending",    value: INR(summary.totalPending)   },
            { label: "Refunded",   value: INR(summary.totalRefunded)  },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: "var(--color-background-secondary)",
              borderRadius: 10, padding: "12px 14px",
            }}>
              <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--color-text-secondary)" }}>{label}</p>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: "1rem", flexWrap: "wrap" }}>
        {["", "Pending", "Completed", "Failed", "Refunded"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 13,
              border: "0.5px solid var(--color-border-secondary)",
              background: filter === f ? "#1d4ed8" : "var(--color-background-secondary)",
              color: filter === f ? "#fff" : "var(--color-text-primary)",
              cursor: "pointer",
            }}
          >
            {f || "All"}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading && <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>Loading…</p>}
      {!loading && payments.length === 0 && (
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>No payments found.</p>
      )}
      {payments.map(p => (
        <div key={p.paymentId} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "12px 14px",
          background: "var(--color-background-secondary)",
          borderRadius: 9, marginBottom: 8,
        }}>
          <div>
            <p style={{ margin: "0 0 2px", fontWeight: 500, fontSize: 14 }}>
              {INR(p.amount)}
              <span style={{ marginLeft: 8, fontWeight: 400, fontSize: 13, color: "var(--color-text-secondary)" }}>
                {p.paymentMethod}
              </span>
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)" }}>
              Parent #{p.parentId} · {new Date(p.paidAt).toLocaleString("en-IN")}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {badge(p.status)}
            {p.status === "Pending" && (
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => updateStatus(p.paymentId, "Completed")}
                  style={{
                    padding: "4px 10px", borderRadius: 6, border: "none",
                    background: "#16a34a", color: "#fff",
                    fontSize: 12, cursor: "pointer",
                  }}
                >
                  Approve
                </button>
                <button
                  onClick={() => updateStatus(p.paymentId, "Failed")}
                  style={{
                    padding: "4px 10px", borderRadius: 6, border: "none",
                    background: "#dc2626", color: "#fff",
                    fontSize: 12, cursor: "pointer",
                  }}
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────
export default function Payments({ token, role }) {
  return role === "admin"
    ? <AdminPayments token={token} />
    : <ParentPayments token={token} />;
}
