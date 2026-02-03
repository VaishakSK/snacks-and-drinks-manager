import { useEffect, useMemo, useState } from "react";
import { api } from "../../../shared/http/api.js";
import { Banner, Field } from "../../components/FormBits.jsx";
import { AdminOnly } from "./AdminOnly.jsx";
import { addDays, startOfWeekMonday, toDateKey } from "../../../shared/date/dateKey.js";

function statusLabel(status) {
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  if (status === "replaced") return "replaced";
  if (status === "revoked") return "revoked";
  return "pending";
}

export function AdminWfhPage() {
  const today = new Date();
  const [weekOf, setWeekOf] = useState(toDateKey(today));
  const [status, setStatus] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [range, setRange] = useState({ start: "", end: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const weekRange = useMemo(() => {
    const monday = startOfWeekMonday(new Date(weekOf));
    const friday = addDays(monday, 4);
    return { start: toDateKey(monday), end: toDateKey(friday) };
  }, [weekOf]);

  async function load() {
    const params = new URLSearchParams({ weekOf });
    if (status !== "all") params.set("status", status);
    const res = await api(`/api/admin/wfh-requests?${params.toString()}`);
    setRequests(res.requests || []);
    setRange({ start: res.start, end: res.end });
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [weekOf, status]);

  async function updateStatus(id, nextStatus) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/admin/wfh-requests/${id}`, { method: "PATCH", body: { status: nextStatus } });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminOnly>
      <div style={{ display: "grid", gap: 14 }}>
        <div className="card" style={{ padding: 14 }}>
          <div className="h2">WFH approvals</div>
          <div className="muted p">
            Friday is the default WFH day for each employee. Approving another weekday makes Friday a regular service day for that employee.
          </div>
        </div>

        {error ? <Banner kind="error" title="Action failed">{error}</Banner> : null}

        <div className="card" style={{ padding: 14 }}>
          <div className="row">
            <div className="col-6">
              <Field label="Week (pick any date within that week)">
                <input className="input" type="date" value={weekOf} onChange={(e) => setWeekOf(e.target.value)} />
              </Field>
            </div>
            <div className="col-6">
              <Field label="Status filter">
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="pending">pending</option>
                  <option value="approved">approved</option>
                  <option value="rejected">rejected</option>
                  <option value="replaced">replaced</option>
                  <option value="revoked">revoked</option>
                  <option value="all">all</option>
                </select>
              </Field>
            </div>
            <div className="col-12">
              <div className="muted">Week range: {range.start || weekRange.start} â†’ {range.end || weekRange.end}</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 14, overflowX: "auto" }}>
          <div className="h2">Requests</div>
          <table className="table" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Email</th>
                <th>Status</th>
                <th>Requested</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r._id}>
                  <td>{r.dateKey}</td>
                  <td>{r.userId?.name || <span className="muted">â€”</span>}</td>
                  <td>{r.userId?.email || <span className="muted">â€”</span>}</td>
                  <td><span className="badge">{statusLabel(r.status)}</span></td>
                  <td>{new Date(r.createdAt).toLocaleString()}</td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <button className="btn" disabled={busy} onClick={() => updateStatus(r._id, "approved")}>
                        Approve
                      </button>
                      <button className="btn secondary" disabled={busy} onClick={() => updateStatus(r._id, "rejected")}>
                        Reject
                      </button>
                      <button className="btn danger" disabled={busy} onClick={() => updateStatus(r._id, "revoked")}>
                        Revoke
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    No requests.
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
