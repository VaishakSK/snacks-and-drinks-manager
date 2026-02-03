import { useState } from "react";
import { NavLink } from "react-router-dom";
import { api } from "../../../shared/http/api.js";
import { Banner, Field } from "../../components/FormBits.jsx";
import { AdminOnly } from "./AdminOnly.jsx";
import { addDays, startOfWeekMonday, toDateKey } from "../../../shared/date/dateKey.js";

function prettyDate(dateKey) {
  const [y, m, d] = dateKey.split("-").map((x) => Number(x));
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "2-digit" });
}

export function AdminDashboardPage() {
  const [dateKey, setDateKey] = useState(toDateKey(new Date()));
  const [session, setSession] = useState("morning");
  const [include, setInclude] = useState("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const totalOf = (arr) => (arr || []).reduce((sum, item) => sum + (item.count || 0), 0);

  async function load(params = {}) {
    const targetDateKey = params.dateKey || dateKey;
    const targetSession = params.session || session;
    const targetInclude = params.include || include;
    setBusy(true);
    setError("");
    try {
      const res = await api(
        `/api/admin/counts/day?dateKey=${encodeURIComponent(targetDateKey)}&session=${encodeURIComponent(
          targetSession
        )}&include=${encodeURIComponent(targetInclude)}`
      );
      setData(res);
      setDateKey(targetDateKey);
      setSession(targetSession);
      setInclude(targetInclude);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function exportCSV(params = {}) {
    const targetDateKey = params.dateKey || dateKey;
    const targetSession = params.session || session;
    const targetInclude = params.include || include;
    setBusy(true);
    setError("");
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4052";
      const url = `${API_BASE}/api/admin/export/csv?dateKey=${encodeURIComponent(targetDateKey)}&session=${encodeURIComponent(
        targetSession
      )}&include=${encodeURIComponent(targetInclude)}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`
        }
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMsg = "Export failed";
        try {
          const errorData = JSON.parse(text);
          errorMsg = errorData.error || errorMsg;
        } catch {
          errorMsg = `Export failed: ${response.status}`;
        }
        throw new Error(errorMsg);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `selections-${targetDateKey}-${targetSession}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function exportTodayMorning() {
    const todayKey = toDateKey(new Date());
    await exportCSV({ dateKey: todayKey, session: "morning", include: "drinks" });
  }

  async function exportWeekSummary() {
    setBusy(true);
    setError("");
    try {
      const monday = startOfWeekMonday(new Date());
      const friday = addDays(monday, 4);
      const start = toDateKey(monday);
      const end = toDateKey(friday);
      const res = await api(`/api/admin/counts/range?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
      const rows = [];
      rows.push(`Range: ${start} to ${end}`);
      rows.push("");
      rows.push("Session,Item,Count");
      (res.counts?.drinksMorning || []).forEach((r) => rows.push(`morning,${r.name},${r.count}`));
      (res.counts?.drinksEvening || []).forEach((r) => rows.push(`evening,${r.name},${r.count}`));
      (res.counts?.snacksEvening || []).forEach((r) => rows.push(`snacks,${r.name},${r.count}`));
      const csv = rows.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `week-summary-${start}-${end}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadEndOfDaySummary() {
    setBusy(true);
    setError("");
    try {
      const todayKey = toDateKey(new Date());
      const [morning, evening] = await Promise.all([
        api(`/api/admin/counts/day?dateKey=${encodeURIComponent(todayKey)}&session=morning&include=drinks`),
        api(`/api/admin/counts/day?dateKey=${encodeURIComponent(todayKey)}&session=evening&include=all`)
      ]);
      setSummary({ dateKey: todayKey, morning, evening });
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
          <div className="h2">Daily overview</div>
          <div className="muted p">Pick a date and session to view counts and selections clearly.</div>
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn" onClick={() => load({ dateKey: toDateKey(new Date()) })} disabled={busy}>
              {busy ? "Loadingâ€¦" : "Load today"}
            </button>
            <NavLink className="btn secondary" to="/app/admin/wfh">
              WFH approvals
            </NavLink>
          </div>
        </div>

        <div className="card" style={{ padding: 14 }}>
          <div className="row">
            <div className="col-6">
              <Field label="Date">
                <input className="input" type="date" value={dateKey} onChange={(e) => setDateKey(e.target.value)} />
              </Field>
            </div>
            <div className="col-6">
              <Field label="Session">
                <select value={session} onChange={(e) => setSession(e.target.value)}>
                  <option value="morning">morning</option>
                  <option value="evening">evening</option>
                  <option value="all">all</option>
                </select>
              </Field>
            </div>
            <div className="col-6">
              <Field label="Include">
                <select value={include} onChange={(e) => setInclude(e.target.value)}>
                  <option value="all">all</option>
                  <option value="drinks">drinks</option>
                  <option value="snacks">snacks</option>
                </select>
              </Field>
            </div>
            <div className="col-6" style={{ display: "flex", alignItems: "end", justifyContent: "flex-end", gap: 10 }}>
              <button className="btn" onClick={() => load()} disabled={busy}>
                {busy ? "Loading…" : "Load"}
              </button>
              <button className="btn secondary" onClick={() => exportCSV()} disabled={busy || !data}>
                Export CSV
              </button>
            </div>
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn secondary" type="button" onClick={exportTodayMorning} disabled={busy}>
              Export Today Morning
            </button>
            <button className="btn secondary" type="button" onClick={exportWeekSummary} disabled={busy}>
              Export This Week Summary
            </button>
            <button className="btn secondary" type="button" onClick={loadEndOfDaySummary} disabled={busy}>
              Load End-of-Day Summary
            </button>
          </div>
        </div>

        {error ? <Banner kind="error" title="Could not load">{error}</Banner> : null}

        {data ? (
          <>
            <div className="card" style={{ padding: 14 }}>
              <div className="h2">{prettyDate(data.dateKey)} • {data.session}</div>
              <div className="muted p">Snacks available: <b>{String(data.snacksAvailable)}</b></div>
            </div>

            <div className="row">
              {data.session === "all" ? (
                <>
                  <div className="col-4">
                    <div className="card" style={{ padding: 14 }}>
                      <div className="muted">Morning drinks</div>
                      <div className="h2">{totalOf(data.counts?.drinksMorning || [])}</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="card" style={{ padding: 14 }}>
                      <div className="muted">Evening drinks</div>
                      <div className="h2">{totalOf(data.counts?.drinksEvening || [])}</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="card" style={{ padding: 14 }}>
                      <div className="muted">Evening snacks</div>
                      <div className="h2">{totalOf(data.counts?.snacksEvening || [])}</div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="col-6">
                    <div className="card" style={{ padding: 14 }}>
                      <div className="muted">Drinks</div>
                      <div className="h2">{totalOf(data.counts?.drinks || [])}</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="card" style={{ padding: 14 }}>
                      <div className="muted">Snacks</div>
                      <div className="h2">{totalOf(data.counts?.snacks || [])}</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="row">
              {data.session === "all" ? (
                <>
                  <div className="col-6">
                    <div className="card" style={{ padding: 14, overflowX: "auto" }}>
                      <div className="h2">Morning drinks • {totalOf(data.counts?.drinksMorning || [])}</div>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data.counts?.drinksMorning || []).map((c) => (
                            <tr key={c.itemId}>
                              <td>{c.name}</td>
                              <td>{c.count}</td>
                            </tr>
                          ))}
                          {(data.counts?.drinksMorning || []).length === 0 ? (
                            <tr>
                              <td colSpan={2} className="muted">
                                No morning selections.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="card" style={{ padding: 14, overflowX: "auto" }}>
                      <div className="h2">Evening drinks • {totalOf(data.counts?.drinksEvening || [])}</div>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data.counts?.drinksEvening || []).map((c) => (
                            <tr key={c.itemId}>
                              <td>{c.name}</td>
                              <td>{c.count}</td>
                            </tr>
                          ))}
                          {(data.counts?.drinksEvening || []).length === 0 ? (
                            <tr>
                              <td colSpan={2} className="muted">
                                No evening drink selections.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="card" style={{ padding: 14, overflowX: "auto" }}>
                      <div className="h2">Evening snacks • {totalOf(data.counts?.snacksEvening || [])}</div>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data.counts?.snacksEvening || []).map((c) => (
                            <tr key={c.itemId}>
                              <td>{c.name}</td>
                              <td>{c.count}</td>
                            </tr>
                          ))}
                          {(data.counts?.snacksEvening || []).length === 0 ? (
                            <tr>
                              <td colSpan={2} className="muted">
                                No snack selections (or snacks disabled).
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="col-6">
                    <div className="card" style={{ padding: 14, overflowX: "auto" }}>
                      <div className="h2">Counts • Drinks</div>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data.counts?.drinks || []).map((c) => (
                            <tr key={c.itemId}>
                              <td>{c.name}</td>
                              <td>{c.count}</td>
                            </tr>
                          ))}
                          {(data.counts?.drinks || []).length === 0 ? (
                            <tr>
                              <td colSpan={2} className="muted">
                                No drink selections.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="card" style={{ padding: 14, overflowX: "auto" }}>
                      <div className="h2">Counts • Snacks</div>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data.counts?.snacks || []).map((c) => (
                            <tr key={c.itemId}>
                              <td>{c.name}</td>
                              <td>{c.count}</td>
                            </tr>
                          ))}
                          {(data.counts?.snacks || []).length === 0 ? (
                            <tr>
                              <td colSpan={2} className="muted">
                                No snack selections (or snacks disabled).
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="card" style={{ padding: 14, overflowX: "auto" }}>
              <div className="h2">Who selected what</div>
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Morning drink</th>
                    <th>Evening drink</th>
                    <th>Evening snack</th>
                  </tr>
                </thead>
                <tbody>
                  {data.selections?.map((s) => (
                    <tr key={s._id}>
                      <td>{s.userId?.name || "—"}</td>
                      <td>{s.userId?.email || "—"}</td>
                      <td>{s.morningDrinkItemId?.name || <span className="muted">—</span>}</td>
                      <td>{s.eveningDrinkItemId?.name || <span className="muted">—</span>}</td>
                      <td>{s.eveningSnackItemId?.name || <span className="muted">—</span>}</td>
                    </tr>
                  ))}
                  {(data.selections?.length || 0) === 0 ? (
                    <tr>
                      <td colSpan={5} className="muted">
                        No selections found for this day.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <Banner title="Load a day" kind="info">
            Pick a date/session and click Load to see counts.
          </Banner>
        )}

        {summary ? (
          <div className="card" style={{ padding: 14 }}>
            <div className="h2">End-of-day summary • {prettyDate(summary.dateKey)}</div>
            <div className="muted p">Combined morning + evening counts for today.</div>
            <div className="row" style={{ marginTop: 10 }}>
              <div className="col-6">
                <div className="h2">Morning drinks</div>
                <ul>
                  {(summary.morning?.counts?.drinks || []).map((c) => (
                    <li key={c.itemId}>{c.name} — {c.count}</li>
                  ))}
                  {(summary.morning?.counts?.drinks || []).length === 0 ? <li className="muted">No selections.</li> : null}
                </ul>
              </div>
              <div className="col-6">
                <div className="h2">Evening (drinks + snacks)</div>
                <ul>
                  {(summary.evening?.counts?.drinks || []).map((c) => (
                    <li key={c.itemId}>{c.name} — {c.count}</li>
                  ))}
                  {(summary.evening?.counts?.snacks || []).map((c) => (
                    <li key={c.itemId}>{c.name} — {c.count}</li>
                  ))}
                  {(summary.evening?.counts?.drinks || []).length + (summary.evening?.counts?.snacks || []).length === 0 ? (
                    <li className="muted">No selections.</li>
                  ) : null}
                </ul>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AdminOnly>
  );
}

