import { useEffect, useState } from "react";
import { api } from "../../shared/http/api.js";
import { Banner } from "../components/FormBits.jsx";

function prettyDate(dateKey) {
  const [y, m, d] = dateKey.split("-").map((x) => Number(x));
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "2-digit" });
}

export function HistoryPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/selections/history?limit=100")
      .then((r) => setItems(r.selections))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="card" style={{ padding: 14 }}>
        <div className="h2">Your selection history</div>
        <div className="muted p">Latest 100 working-day selections.</div>
      </div>
      {error ? <Banner kind="error" title="Could not load">{error}</Banner> : null}
      <div className="card" style={{ padding: 14, overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Morning drink</th>
              <th>Evening drink</th>
              <th>Evening snack</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s._id}>
                <td>{prettyDate(s.dateKey)}</td>
                <td>{s.morningDrinkItemId?.name || <span className="muted">—</span>}</td>
                <td>{s.eveningDrinkItemId?.name || <span className="muted">—</span>}</td>
                <td>{s.eveningSnackItemId?.name || <span className="muted">—</span>}</td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">
                  No history yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

