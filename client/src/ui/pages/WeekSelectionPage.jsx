import { useEffect, useMemo, useState } from "react";
import { api } from "../../shared/http/api.js";
import { Banner } from "../components/FormBits.jsx";
import { SelectionTile, CupIcon, MoonIcon, SnackIcon, CalendarIcon } from "../components/SelectionTile.jsx";
import { addDays, startOfWeekMonday, toDateKey } from "../../shared/date/dateKey.js";

function groupCatalog(items) {
  const drinks = items.filter((i) => i.type === "drink");
  const snacks = items.filter((i) => i.type === "snack");
  return { drinks, snacks };
}

const MORNING_CUTOFF = "11:20";
const EVENING_CUTOFF = "16:15";

function parseCutoffToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map((x) => Number(x));
  return h * 60 + m;
}

function minutesUntilCutoff(timeStr, now) {
  const cutoffMinutes = parseCutoffToMinutes(timeStr);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return cutoffMinutes - currentMinutes;
}

function formatMinutes(mins) {
  if (mins <= 0) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function shortDate(dateKey) {
  const [y, m, d] = dateKey.split("-").map((x) => Number(x));
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "2-digit" });
}

export function WeekSelectionPage() {
  const today = new Date();
  const currentWeekMonday = startOfWeekMonday(today);
  const currentWeekFriday = addDays(currentWeekMonday, 4);

  const [weekOf, setWeekOf] = useState(toDateKey(today));
  const [catalog, setCatalog] = useState([]);
  const [morningDrinkItemId, setMorningDrinkItemId] = useState("");
  const [eveningDrinkItemId, setEveningDrinkItemId] = useState("");
  const [eveningSnackItemId, setEveningSnackItemId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [weekOverview, setWeekOverview] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());

  const { drinks, snacks } = useMemo(() => groupCatalog(catalog), [catalog]);
  const monday = useMemo(() => startOfWeekMonday(new Date(weekOf)), [weekOf]);

  useEffect(() => {
    api("/api/catalog")
      .then((r) => setCatalog(r.items))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    api(`/api/selections/week?dateKey=${encodeURIComponent(weekOf)}`)
      .then((r) => setWeekOverview(r))
      .catch((e) => setError(e.message));
  }, [weekOf]);

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  async function apply() {
    setBusy(true);
    setError("");
    setOkMsg("");
    try {
      const res = await api("/api/selections/week", {
        method: "PUT",
        body: {
          weekOf,
          morningDrinkItemId: morningDrinkItemId || null,
          eveningDrinkItemId: eveningDrinkItemId || null,
          eveningSnackItemId: eveningSnackItemId || null
        }
      });
      setOkMsg(`Applied to ${res.appliedDates.length} working days (Mon-Fri, excluding WFH). Snacks apply only on snack-enabled days.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="card" style={{ padding: 14 }}>
        <div className="h2">Week selection (one-time fast)</div>
        <div className="muted p">
          Choose one set of items and apply it to all working days in the selected week.
        </div>
      </div>

      {error ? <Banner kind="error" title="Could not apply">{error}</Banner> : null}
      {okMsg ? <Banner kind="success" title="Done">{okMsg}</Banner> : null}
      {drinks.length === 0 ? (
        <Banner kind="info" title="No drinks available">
          Ask an admin to add drinks in the Catalog.
        </Banner>
      ) : null}
      {snacks.length === 0 ? (
        <Banner kind="info" title="No snacks available">
          Snack items will appear here when enabled by admin.
        </Banner>
      ) : null}

      <div className="card" style={{ padding: 14 }}>
        <div className="row">
          <div className="col-6">
            <SelectionTile icon={<CalendarIcon />} title="Week (pick any date within that week)">
              <input
                className="input"
                type="date"
                min={toDateKey(currentWeekMonday)}
                max={toDateKey(currentWeekFriday)}
                value={weekOf}
                onChange={(e) => setWeekOf(e.target.value)}
              />
              <div className="choice-hint">
                Week starts on Monday: <b>{toDateKey(monday)}</b>. You can only set or change preferences for the current week and non-past days.
              </div>
              <div className="choice-hint">
                Cutoffs apply only to today. Morning: {formatMinutes(minutesUntilCutoff(MORNING_CUTOFF, new Date(nowTick)))} left · Evening: {formatMinutes(minutesUntilCutoff(EVENING_CUTOFF, new Date(nowTick)))} left
              </div>
              <div className="choice-hint">
                WFH days are skipped automatically.
              </div>
            </SelectionTile>
          </div>
          <div className="col-6">
            <SelectionTile icon={<CupIcon />} title="Morning drink (11:30am)">
              <select value={morningDrinkItemId} onChange={(e) => setMorningDrinkItemId(e.target.value)}>
                <option value="">-- none --</option>
                {drinks.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </SelectionTile>
          </div>
          <div className="col-6">
            <SelectionTile icon={<MoonIcon />} title="Evening drink (4:30pm)">
              <select value={eveningDrinkItemId} onChange={(e) => setEveningDrinkItemId(e.target.value)}>
                <option value="">-- none --</option>
                {drinks.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </SelectionTile>
          </div>
          <div className="col-6">
            <SelectionTile icon={<SnackIcon />} title="Evening snack (only on snack days)">
              <select value={eveningSnackItemId} onChange={(e) => setEveningSnackItemId(e.target.value)}>
                <option value="">-- none --</option>
                {snacks.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <div className="choice-hint">
                If snacks are disabled for a given date, the snack field is automatically cleared for that day.
              </div>
            </SelectionTile>
          </div>
          <div className="col-12" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              className="btn secondary"
              type="button"
              onClick={() => {
                setMorningDrinkItemId("");
                setEveningDrinkItemId("");
                setEveningSnackItemId("");
              }}
            >
              Clear all
            </button>
            <button className="btn" onClick={apply} disabled={busy}>
              {busy ? "Applying..." : "Apply to week"}
            </button>
          </div>
        </div>
      </div>

      {weekOverview ? (
        <div className="card" style={{ padding: 14 }}>
          <div className="h2">Week overview</div>
          <div className="muted p">Quickly spot missing days before cutoffs.</div>
          <div className="week-grid" style={{ marginTop: 12 }}>
            {weekOverview.days.map((d) => (
              <div
                key={d.dateKey}
                className={`week-card ${d.isWfh ? "wfh" : d.hasSelection ? "ok" : "missing"}`}
              >
                <div className="week-card-date">{shortDate(d.dateKey)}</div>
                <div className="week-card-status">
                  {d.isWfh ? "WFH day" : d.hasSelection ? "Selected" : "Missing"}
                </div>
                <div className="week-card-sub">
                  {d.isWfh ? "Services disabled" : d.snacksAvailable ? "Snack day" : "No snack"}
                </div>
              </div>
            ))}
          </div>
          <div className="week-hint">Tip: pick a day above, then update selections in Day view.</div>
        </div>
      ) : null}
    </div>
  );
}
