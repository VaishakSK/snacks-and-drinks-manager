import { useEffect, useState } from "react";
import { api } from "../../../shared/http/api.js";
import { Banner } from "../../components/FormBits.jsx";
import { AdminOnly } from "./AdminOnly.jsx";

function formatDate(value) {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString();
}

export function AdminApprovalsPage() {
  const [status, setStatus] = useState("pending");
  const [users, setUsers] = useState([]);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  async function load(nextStatus = status) {
    const res = await api(`/api/admin/user-approvals?status=${encodeURIComponent(nextStatus)}`);
    setUsers(res.users || []);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [status]);

  async function decide(userId, nextStatus) {
    setBusyId(userId);
    setError("");
    setOkMsg("");
    try {
      await api(`/api/admin/user-approvals/${userId}`, {
        method: "PATCH",
        body: { status: nextStatus }
      });
      setOkMsg(`User marked as ${nextStatus}.`);
      await load();
    } catch (e) {
      setError(e.message || "Could not update approval");
    } finally {
      setBusyId("");
    }
  }

  return (
    <AdminOnly>
      <div style={{ display: "grid", gap: 14 }}>
        <div className="card" style={{ padding: 14 }}>
          <div className="h2">Account approvals</div>
          <div className="muted p">
            Review new account requests. Approved users can access all employee services.
          </div>
        </div>

        {error ? <Banner kind="error" title="Could not load approvals">{error}</Banner> : null}
        {okMsg ? <Banner kind="success" title="Updated">{okMsg}</Banner> : null}

        <div className="card" style={{ padding: 14 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {["pending", "approved", "rejected", "all"].map((s) => (
              <button
                key={s}
                type="button"
                className={`btn ${status === s ? "" : "secondary"}`}
                onClick={() => setStatus(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 14, overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Requested</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>{u.name || "—"}</td>
                  <td>{u.email}</td>
                  <td><span className="badge">{u.role}</span></td>
                  <td>{formatDate(u.approvalRequestedAt || u.createdAt)}</td>
                  <td>{u.approvalStatus || "approved"}</td>
                  <td style={{ textAlign: "right" }}>
                    {u.approvalStatus === "pending" ? (
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          className="btn"
                          type="button"
                          disabled={busyId === u._id}
                          onClick={() => decide(u._id, "approved")}
                        >
                          Approve
                        </button>
                        <button
                          className="btn danger"
                          type="button"
                          disabled={busyId === u._id || u.role === "admin"}
                          onClick={() => decide(u._id, "rejected")}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    No accounts found for this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </AdminOnly>
  );
}
