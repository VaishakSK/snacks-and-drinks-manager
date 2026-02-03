import { useEffect, useMemo, useState } from "react";
import { api } from "../../../shared/http/api.js";
import { Banner, Field } from "../../components/FormBits.jsx";
import { AdminOnly } from "./AdminOnly.jsx";
import { addDays, startOfWeekMonday, toDateKey } from "../../../shared/date/dateKey.js";

function monthRange(monthStr) {
  const [y, m] = monthStr.split("-").map((x) => Number(x));
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  return { start: toDateKey(start), end: toDateKey(end) };
}

export function AdminCostPage() {
  const today = new Date();
  const [mode, setMode] = useState("week");
  const [weekOf, setWeekOf] = useState(toDateKey(today));
  const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`);
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const range = useMemo(() => {
    if (mode === "month") return monthRange(month);
    const monday = startOfWeekMonday(new Date(weekOf));
    const friday = addDays(monday, 4);
    return { start: toDateKey(monday), end: toDateKey(friday) };
  }, [mode, weekOf, month]);


  async function generateReport() {
    setBusy(true);
    setError("");
    try {
      const res = await api("/api/admin/cost-report", {
        method: "POST",
        body: {
          start: range.start,
          end: range.end
        }
      });
      setReport(res);
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
          <div className="h2">Cost report</div>
          <div className="muted p">Estimate costs for a week or month using saved item costs.</div>
        </div>

        {error ? <Banner kind="error" title="Could not generate">{error}</Banner> : null}

        <div className="card" style={{ padding: 14 }}>
          <div className="row">
            <div className="col-6">
              <Field label="Report type">
                <select value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="week">week</option>
                  <option value="month">month</option>
                </select>
              </Field>
            </div>
            {mode === "week" ? (
              <div className="col-6">
                <Field label="Week (pick any date within that week)">
                  <input className="input" type="date" value={weekOf} onChange={(e) => setWeekOf(e.target.value)} />
                </Field>
              </div>
            ) : (
              <div className="col-6">
                <Field label="Month">
                  <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
                </Field>
              </div>
            )}
            <div className="col-12">
              <div className="muted">Range: {range.start} → {range.end}</div>
            </div>
            <div className="col-12" style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn" onClick={generateReport} disabled={busy}>
                {busy ? "Generating..." : "Generate report"}
              </button>
            </div>
          </div>
        </div>

        {report ? (
          <div className="card" style={{ padding: 14, overflowX: "auto" }}>
            <div className="h2">Report summary</div>
            <div className="muted p">
              Total cost: {report.totalCost != null ? report.totalCost.toFixed(2) : "—"}
            </div>
            <table className="table" style={{ marginTop: 10 }}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Type</th>
                  <th>Session</th>
                  <th>Count</th>
                  <th>Unit cost</th>
                  <th>Total cost</th>
                </tr>
              </thead>
              <tbody>
                {report.items.map((item) => (
                  <tr key={`${item.itemId}-${item.session}`}>
                    <td>{item.name}</td>
                    <td>{item.type}</td>
                    <td>{item.session}</td>
                    <td>{item.count}</td>
                    <td>{item.unitCost ?? "—"}</td>
                    <td>{item.itemCost ?? "—"}</td>
                  </tr>
                ))}
                {report.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="muted">No selections in this range.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </AdminOnly>
  );
}
