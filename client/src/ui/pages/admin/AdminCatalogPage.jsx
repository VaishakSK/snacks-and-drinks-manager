import { useEffect, useMemo, useState } from "react";
import { api } from "../../../shared/http/api.js";
import { Banner, Field } from "../../components/FormBits.jsx";
import { AdminOnly } from "./AdminOnly.jsx";

export function AdminCatalogPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [type, setType] = useState("drink");
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [costDrafts, setCostDrafts] = useState({});

  const grouped = useMemo(() => {
    return {
      drinks: items.filter((i) => i.type === "drink"),
      snacks: items.filter((i) => i.type === "snack")
    };
  }, [items]);

  async function load() {
    const res = await api("/api/catalog?include=all");
    setItems(res.items);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    setCostDrafts(Object.fromEntries(items.map((i) => [i._id, i.cost ?? ""])));
  }, [items]);

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const costValue = cost === "" ? undefined : Number(cost);
      await api("/api/catalog", { method: "POST", body: { type, name, cost: costValue } });
      setName("");
      setCost("");
      await load();
    } catch (e2) {
      setError(e2.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/catalog/${item._id}`, { method: "PATCH", body: { isActive: !item.isActive } });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(item) {
    const ok = window.confirm(`Remove "${item.name}" permanently? This cannot be undone.`);
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/catalog/${item._id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveCost(item) {
    setBusy(true);
    setError("");
    try {
      const value = costDrafts[item._id];
      const payload = value === "" || value == null ? null : Number(value);
      await api(`/api/catalog/${item._id}`, { method: "PATCH", body: { cost: payload } });
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
          <div className="h2">Catalog</div>
          <div className="muted p">Manage available drink/snack options shown to employees.</div>
        </div>

        {error ? <Banner kind="error" title="Action failed">{error}</Banner> : null}

        <div className="card" style={{ padding: 14 }}>
          <div className="h2">Add item</div>
          <form onSubmit={create} className="row" style={{ marginTop: 10 }}>
            <div className="col-6">
              <Field label="Type">
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="drink">drink</option>
                  <option value="snack">snack</option>
                </select>
              </Field>
            </div>
            <div className="col-6">
              <Field label="Name">
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tea, Coffee, Maggie…" />
              </Field>
            </div>
            <div className="col-6">
              <Field label="Cost (optional)">
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="Cost per item"
                />
              </Field>
            </div>
            <div className="col-12" style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn" disabled={busy || !name.trim()} type="submit">
                {busy ? "Saving…" : "Add"}
              </button>
            </div>
          </form>
        </div>

        <div className="row">
          <div className="col-6">
            <div className="card" style={{ padding: 14, overflowX: "auto" }}>
              <div className="h2">Drinks</div>
              <table className="table" style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Cost</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {grouped.drinks.map((i) => (
                    <tr key={i._id} className={!i.isActive ? "catalog-row inactive" : "catalog-row"}>
                      <td>{i.name}</td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={costDrafts[i._id] ?? ""}
                          onChange={(e) => setCostDrafts((c) => ({ ...c, [i._id]: e.target.value }))}
                        />
                      </td>
                      <td>{i.isActive ? <span className="badge">active</span> : <span className="badge">inactive</span>}</td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button className="btn secondary" disabled={busy} onClick={() => toggle(i)}>
                            {i.isActive ? "Disable" : "Reactivate"}
                          </button>
                          <button className="btn" disabled={busy} onClick={() => saveCost(i)}>
                            Save cost
                          </button>
                          <button className="btn danger" disabled={busy} onClick={() => removeItem(i)}>
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {grouped.drinks.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="muted">
                        No drink items.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
          <div className="col-6">
            <div className="card" style={{ padding: 14, overflowX: "auto" }}>
              <div className="h2">Snacks</div>
              <table className="table" style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Cost</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {grouped.snacks.map((i) => (
                    <tr key={i._id} className={!i.isActive ? "catalog-row inactive" : "catalog-row"}>
                      <td>{i.name}</td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={costDrafts[i._id] ?? ""}
                          onChange={(e) => setCostDrafts((c) => ({ ...c, [i._id]: e.target.value }))}
                        />
                      </td>
                      <td>{i.isActive ? <span className="badge">active</span> : <span className="badge">inactive</span>}</td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button className="btn secondary" disabled={busy} onClick={() => toggle(i)}>
                            {i.isActive ? "Disable" : "Reactivate"}
                          </button>
                          <button className="btn" disabled={busy} onClick={() => saveCost(i)}>
                            Save cost
                          </button>
                          <button className="btn danger" disabled={busy} onClick={() => removeItem(i)}>
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {grouped.snacks.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="muted">
                        No snack items.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AdminOnly>
  );
}

