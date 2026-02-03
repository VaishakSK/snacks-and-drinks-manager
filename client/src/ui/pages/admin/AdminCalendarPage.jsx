import { useEffect, useState } from "react";
import { api } from "../../../shared/http/api.js";
import { Banner, Field } from "../../components/FormBits.jsx";
import { AdminOnly } from "./AdminOnly.jsx";

const weekdays = [
  { n: 0, label: "Sun" },
  { n: 1, label: "Mon" },
  { n: 2, label: "Tue" },
  { n: 3, label: "Wed" },
  { n: 4, label: "Thu" },
  { n: 5, label: "Fri" },
  { n: 6, label: "Sat" }
];

export function AdminCalendarPage() {
  const [calendar, setCalendar] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [overrideDateKey, setOverrideDateKey] = useState("");
  const [overrideValue, setOverrideValue] = useState("true");

  async function load() {
    const res = await api("/api/admin/calendar");
    setCalendar({
      ...res.calendar,
      defaultSnackWeekdays: res.calendar.defaultSnackWeekdays || [],
      overrides: res.calendar.overrides || [],
    });
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  function toggleWeekday(n) {
    setCalendar((c) => {
      const has = c.defaultSnackWeekdays.includes(n);
      return { ...c, defaultSnackWeekdays: has ? c.defaultSnackWeekdays.filter((x) => x !== n) : [...c.defaultSnackWeekdays, n].sort() };
    });
  }


  function upsertOverride(dateKey, snacksAvailable) {
    setCalendar((c) => {
      const rest = (c.overrides || []).filter((o) => o.dateKey !== dateKey);
      return { ...c, overrides: [...rest, { dateKey, snacksAvailable }].sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1)) };
    });
  }


  function removeOverride(dateKey) {
    setCalendar((c) => ({ ...c, overrides: (c.overrides || []).filter((o) => o.dateKey !== dateKey) }));
  }


  async function save() {
    setBusy(true);
    setError("");
    try {
      const res = await api("/api/admin/calendar", { method: "PUT", body: calendar });
      setCalendar({
        ...res.calendar,
        defaultSnackWeekdays: res.calendar.defaultSnackWeekdays || [],
        overrides: res.calendar.overrides || [],
      });
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
          <div className="h2">Snack Days</div>
          <div className="muted p">
            Configure default snack weekdays (office logic still excludes Sat/Sun), and add date-specific overrides for holidays/shifted snack days.
          </div>
        </div>

        {error ? <Banner kind="error" title="Could not save/load">{error}</Banner> : null}

        {!calendar ? (
          <Banner title="Loading…" kind="info">Fetching calendar config.</Banner>
        ) : (
          <>
            <div className="card" style={{ padding: 14 }}>
              <div className="h2">Default snack weekdays</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                {weekdays.map((w) => (
                  <button
                    key={w.n}
                    className={`btn ${calendar.defaultSnackWeekdays.includes(w.n) ? "" : "secondary"}`}
                    type="button"
                    onClick={() => toggleWeekday(w.n)}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
              <div className="muted" style={{ fontSize: 13, marginTop: 10 }}>
                Recommended: Mon + Wed (1 and 3). Weekend selections are blocked anyway.
              </div>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <div className="h2">Overrides</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                Overrides force a single date to be a snack day or not. If an override exists, it takes priority over the default weekdays. Weekends are still blocked.
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <div className="col-6">
                  <Field label="Date (YYYY-MM-DD)">
                    <input className="input" type="date" value={overrideDateKey} onChange={(e) => setOverrideDateKey(e.target.value)} />
                  </Field>
                </div>
                <div className="col-6">
                  <Field label="Snacks available?">
                    <select value={overrideValue} onChange={(e) => setOverrideValue(e.target.value)}>
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  </Field>
                </div>
                <div className="col-12" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => {
                      if (!overrideDateKey) return;
                      upsertOverride(overrideDateKey, overrideValue === "true");
                    }}
                  >
                    Add / Update override
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 12, overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Snacks</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {(calendar.overrides || []).map((o) => (
                      <tr key={o.dateKey}>
                        <td>{o.dateKey}</td>
                        <td>{o.snacksAvailable ? "available" : "not available"}</td>
                        <td style={{ textAlign: "right" }}>
                          <button className="btn danger" type="button" onClick={() => removeOverride(o.dateKey)}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(calendar.overrides || []).length === 0 ? (
                      <tr>
                        <td colSpan={3} className="muted">No overrides.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn" onClick={save} disabled={busy}>
                {busy ? "Saving…" : "Save calendar"}
              </button>
            </div>
          </>
        )}
      </div>
    </AdminOnly>
  );
}
