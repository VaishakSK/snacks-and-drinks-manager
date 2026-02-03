import { useEffect, useState } from "react";
import { api } from "../../../shared/http/api.js";
import { Banner, Field } from "../../components/FormBits.jsx";
import { AdminOnly } from "./AdminOnly.jsx";

export function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [role, setRole] = useState("employee");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function load() {
    const res = await api("/api/users");
    setUsers(res.users);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function createUser(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/users", {
        method: "POST",
        body: { role, name: name || undefined, email, password: password || undefined }
      });
      setName("");
      setEmail("");
      setPassword("");
      await load();
    } catch (e2) {
      setError(e2.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleDisable(u) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/users/${u._id}`, { method: "PATCH", body: { isDisabled: !u.isDisabled } });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function promote(u) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/users/${u._id}`, { method: "PATCH", body: { role: u.role === "admin" ? "employee" : "admin" } });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(u) {
    if (u.role === "admin") return;
    const ok = window.confirm(`Delete ${u.email}? This cannot be undone.`);
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/users/${u._id}`, { method: "DELETE" });
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
          <div className="h2">Employees / Admins</div>
          <div className="muted p">Create accounts, change role, disable/enable access.</div>
        </div>

        {error ? <Banner kind="error" title="Action failed">{error}</Banner> : null}

        <div className="card" style={{ padding: 14 }}>
          <div className="h2">Add user</div>
          <form onSubmit={createUser} className="row" style={{ marginTop: 10 }}>
            <div className="col-6">
              <Field label="Role">
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="employee">employee</option>
                  <option value="admin">admin</option>
                </select>
              </Field>
            </div>
            <div className="col-6">
              <Field label="Name (optional)">
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
            </div>
            <div className="col-6">
              <Field label="Email">
                <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
            </div>
            <div className="col-6">
              <Field label="Password (optional)">
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
            </div>
            <div className="col-12" style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn" disabled={busy} type="submit">
                {busy ? "Saving…" : "Create"}
              </button>
            </div>
          </form>
        </div>

        <div className="card" style={{ padding: 14, overflowX: "auto" }}>
          <div className="h2">All users</div>
          <table className="table" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>{u.name || <span className="muted">—</span>}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className="badge">{u.role}</span>
                  </td>
                  <td>{u.isDisabled ? <span className="badge">disabled</span> : <span className="badge">active</span>}</td>
                  <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn secondary" disabled={busy} onClick={() => promote(u)}>
                      {u.role === "admin" ? "Make employee" : "Make admin"}
                    </button>
                    <button className="btn danger" disabled={busy} onClick={() => toggleDisable(u)}>
                      {u.isDisabled ? "Enable" : "Disable"}
                    </button>
                    {u.role === "employee" ? (
                      <button className="btn danger" disabled={busy} onClick={() => deleteUser(u)}>
                        Delete
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    No users.
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

