import { useEffect, useMemo, useState } from "react";
import { api } from "../../shared/http/api.js";
import { Banner, Field } from "../components/FormBits.jsx";
import { useAuth } from "../../shared/auth/AuthContext.jsx";
import {
  SelectionTile,
  CupIcon,
  MoonIcon,
  SnackIcon,
  MugIcon,
  BeanIcon,
  LeafIcon,
  GlassIcon,
  SandwichIcon,
  CookieIcon,
  BowlIcon
} from "../components/SelectionTile.jsx";
import { addDays, parseDateKey, startOfWeekMonday, toDateKey } from "../../shared/date/dateKey.js";

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

function isFridayKey(dateKey) {
  return parseDateKey(dateKey).getDay() === 5;
}

function computeEditRestrictions(now, dateKey) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const isToday = dateKey === toDateKey(now);
  return {
    morningAllowed: !isToday || currentMinutes < parseCutoffToMinutes(MORNING_CUTOFF),
    eveningAllowed: !isToday || currentMinutes < parseCutoffToMinutes(EVENING_CUTOFF),
    morningCutoff: MORNING_CUTOFF,
    eveningCutoff: EVENING_CUTOFF
  };
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const DRINK_ICONS = [CupIcon, MugIcon, BeanIcon, LeafIcon, GlassIcon];
const SNACK_ICONS = [SnackIcon, SandwichIcon, CookieIcon, BowlIcon];
const ICON_COLORS = [
  { bg: "rgba(11, 93, 183, 0.12)", color: "#0b5db7", border: "rgba(11, 93, 183, 0.25)" },
  { bg: "rgba(15, 118, 110, 0.12)", color: "#0f766e", border: "rgba(15, 118, 110, 0.25)" },
  { bg: "rgba(180, 83, 9, 0.15)", color: "#b45309", border: "rgba(180, 83, 9, 0.25)" },
  { bg: "rgba(21, 128, 61, 0.12)", color: "#15803d", border: "rgba(21, 128, 61, 0.25)" },
  { bg: "rgba(71, 85, 105, 0.14)", color: "#475569", border: "rgba(71, 85, 105, 0.25)" }
];

function getItemVisual(item, type) {
  const name = (item.name || "").toLowerCase();
  let Icon;

  if (type === "drink") {
    if (name.includes("green") || name.includes("herb") || name.includes("mint")) Icon = LeafIcon;
    else if (name.includes("tea")) Icon = LeafIcon;
    else if (name.includes("coffee") || name.includes("espresso")) Icon = BeanIcon;
    else if (name.includes("latte") || name.includes("capp")) Icon = MugIcon;
    else if (name.includes("juice") || name.includes("water") || name.includes("soda")) Icon = GlassIcon;
  } else {
    if (name.includes("sandwich") || name.includes("burger") || name.includes("wrap")) Icon = SandwichIcon;
    else if (name.includes("cookie") || name.includes("biscuit") || name.includes("cake")) Icon = CookieIcon;
    else if (name.includes("poha") || name.includes("upma") || name.includes("bowl") || name.includes("salad")) Icon = BowlIcon;
  }

  const seed = hashString(`${item._id}-${item.name}-${type}`);
  const icons = type === "drink" ? DRINK_ICONS : SNACK_ICONS;
  if (!Icon) Icon = icons[seed % icons.length];
  const color = ICON_COLORS[seed % ICON_COLORS.length];
  return { Icon, color };
}

export function DaySelectionPage() {
  const { user } = useAuth();
  const todayKey = toDateKey(new Date());
  const currentWeekMonday = startOfWeekMonday(new Date());
  const currentWeekFriday = addDays(currentWeekMonday, 4);
  const [dateKey, setDateKey] = useState(todayKey);
  const [catalog, setCatalog] = useState([]);
  const [snacksAvailable, setSnacksAvailable] = useState(false);
  const [isWfhDay, setIsWfhDay] = useState(false);
  const [wfhStatus, setWfhStatus] = useState({ requestStatus: "none", approvedDateKey: null, requestId: null });
  const [wfhBusy, setWfhBusy] = useState(false);
  const [selection, setSelection] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [nowTick, setNowTick] = useState(Date.now());
  const [editRestrictions, setEditRestrictions] = useState({
    morningAllowed: true,
    eveningAllowed: true,
    morningCutoff: MORNING_CUTOFF,
    eveningCutoff: EVENING_CUTOFF
  });

  const { drinks, snacks } = useMemo(() => groupCatalog(catalog), [catalog]);

  async function load() {
    setError("");
    setSavedMsg("");

    const now = new Date();
    setEditRestrictions(computeEditRestrictions(now, dateKey));

    const [cat, day, wfh] = await Promise.all([
      api("/api/catalog"),
      api(`/api/selections/day?dateKey=${encodeURIComponent(dateKey)}`),
      api(`/api/wfh/status?dateKey=${encodeURIComponent(dateKey)}`)
    ]);
    setCatalog(cat.items);
    setSnacksAvailable(Boolean(day.snacksAvailable));
    setIsWfhDay(Boolean(day.isWfh ?? wfh.isWfh));
    setWfhStatus({
      requestStatus: wfh.requestStatus || "none",
      approvedDateKey: wfh.approvedDateKey || null,
      requestId: wfh.requestId || null
    });
    setSelection(day.selection || { morningDrinkItemId: null, eveningDrinkItemId: null, eveningSnackItemId: null });
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey]);

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setEditRestrictions(computeEditRestrictions(new Date(nowTick), dateKey));
  }, [nowTick, dateKey]);

  async function save() {
    setBusy(true);
    setError("");
    setSavedMsg("");
    try {
      const payload = {
        dateKey,
        morningDrinkItemId: selection?.morningDrinkItemId || null,
        eveningDrinkItemId: selection?.eveningDrinkItemId || null,
        eveningSnackItemId: selection?.eveningSnackItemId || null
      };
      const res = await api("/api/selections/day", { method: "PUT", body: payload });
      setSelection(res.selection);
      setSavedMsg("Saved.");
      setTimeout(() => setSavedMsg(""), 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }


  async function requestWfhDay() {
    setWfhBusy(true);
    setError("");
    try {
      await api("/api/wfh/request", { method: "POST", body: { dateKey } });
      const wfh = await api(`/api/wfh/status?dateKey=${encodeURIComponent(dateKey)}`);
      setWfhStatus({
        requestStatus: wfh.requestStatus || "none",
        approvedDateKey: wfh.approvedDateKey || null,
        requestId: wfh.requestId || null
      });
      if (wfh.isWfh !== undefined) setIsWfhDay(Boolean(wfh.isWfh));
    } catch (e) {
      setError(e.message);
    } finally {
      setWfhBusy(false);
    }
  }

  function wfhStatusLabel() {
    if (wfhStatus.requestStatus === "pending") return "WFH request pending";
    if (wfhStatus.requestStatus === "approved") return "WFH request approved";
    if (wfhStatus.requestStatus === "rejected") return "WFH request rejected";
    if (wfhStatus.requestStatus === "replaced") return "WFH request replaced";
    if (wfhStatus.requestStatus === "revoked") return "WFH request revoked";
    if (isWfhDay && isFridayKey(dateKey) && !wfhStatus.approvedDateKey) return "Default WFH (Friday)";
    if (isFridayKey(dateKey) && wfhStatus.approvedDateKey && wfhStatus.approvedDateKey !== dateKey) {
      return `Friday open (WFH on ${wfhStatus.approvedDateKey})`;
    }
    return "No WFH request";
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="row">
        <div className="col-6">
          <div className="card" style={{ padding: 14 }}>
            <div className="h2">Select for a day</div>
            <div className="muted p">Drinks: Mon-Fri (morning 11:30, evening 4:30). Snacks: enabled on configured days.</div>
          </div>
        </div>
        <div className="col-6">
          <div className="card" style={{ padding: 14 }}>
            <Field label="Date">
              <input
                className="input"
                type="date"
                min={todayKey}
                max={toDateKey(currentWeekFriday)}
                value={dateKey}
                onChange={(e) => setDateKey(e.target.value)}
              />
            </Field>
            <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span className="badge">Snacks: {snacksAvailable ? "available" : "not available"}</span>
              {savedMsg ? <span className="badge badge-success">{savedMsg}</span> : null}
            </div>
            <div className="status-badges" style={{ marginTop: 10 }}>
              <span className={`status-badge ${snacksAvailable ? "ok" : "muted"}`}>
                {snacksAvailable ? "Snack day" : "No snack day"}
              </span>
              <span className={`status-badge ${isWfhDay ? "wfh" : "muted"}`}>
                {isWfhDay ? "WFH day" : "Office day"}
              </span>
              <span className={`status-badge ${editRestrictions.morningAllowed ? "ok" : "locked"}`}>
                {editRestrictions.morningAllowed ? "Morning open" : "Morning locked"}
              </span>
              <span className={`status-badge ${editRestrictions.eveningAllowed ? "ok" : "locked"}`}>
                {editRestrictions.eveningAllowed ? "Evening open" : "Evening locked"}
              </span>
            </div>
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span className="badge">{wfhStatusLabel()}</span>
              {!isFridayKey(dateKey) && user?.role === "employee" ? (
                <button
                  className="btn secondary"
                  type="button"
                  onClick={requestWfhDay}
                  disabled={wfhBusy || wfhStatus.requestStatus === "pending" || wfhStatus.requestStatus === "approved"}
                >
                  {wfhBusy ? "Submitting..." : "Request WFH"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {error ? <Banner kind="error" title="Could not load/save">{error}</Banner> : null}
      {isWfhDay ? (
        <Banner kind="info" title="Work from home day">
          Services are disabled for this date. Pick another day if you need drinks or snacks.
        </Banner>
      ) : null}
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
            <SelectionTile icon={<CupIcon />} title="Morning drink (11:30am)">
              <div className="select-grid">
                <button
                  type="button"
                  className={`select-card ${!selection?.morningDrinkItemId ? "selected" : ""}`}
                  onClick={() => setSelection((s) => ({ ...s, morningDrinkItemId: null }))}
                  disabled={isWfhDay || !editRestrictions.morningAllowed}
                >
                  <div className="select-icon empty">—</div>
                  <div className="select-title">None</div>
                  <div className="select-sub">No drink</div>
                </button>
                {drinks.map((d) => {
                  const { Icon, color } = getItemVisual(d, "drink");
                
  async function requestWfhDay() {
    setWfhBusy(true);
    setError("");
    try {
      await api("/api/wfh/request", { method: "POST", body: { dateKey } });
      const wfh = await api(`/api/wfh/status?dateKey=${encodeURIComponent(dateKey)}`);
      setWfhStatus({
        requestStatus: wfh.requestStatus || "none",
        approvedDateKey: wfh.approvedDateKey || null,
        requestId: wfh.requestId || null
      });
      if (wfh.isWfh !== undefined) setIsWfhDay(Boolean(wfh.isWfh));
    } catch (e) {
      setError(e.message);
    } finally {
      setWfhBusy(false);
    }
  }

  function wfhStatusLabel() {
    if (wfhStatus.requestStatus === "pending") return "WFH request pending";
    if (wfhStatus.requestStatus === "approved") return "WFH request approved";
    if (wfhStatus.requestStatus === "rejected") return "WFH request rejected";
    if (wfhStatus.requestStatus === "replaced") return "WFH request replaced";
    if (wfhStatus.requestStatus === "revoked") return "WFH request revoked";
    if (isWfhDay && isFridayKey(dateKey) && !wfhStatus.approvedDateKey) return "Default WFH (Friday)";
    if (isFridayKey(dateKey) && wfhStatus.approvedDateKey && wfhStatus.approvedDateKey !== dateKey) {
      return `Friday open (WFH on ${wfhStatus.approvedDateKey})`;
    }
    return "No WFH request";
  }

  return (
                    <button
                      key={d._id}
                      type="button"
                      className={`select-card ${selection?.morningDrinkItemId === d._id ? "selected" : ""}`}
                      onClick={() => setSelection((s) => ({ ...s, morningDrinkItemId: d._id }))}
                      disabled={isWfhDay || !editRestrictions.morningAllowed}
                    >
                      <div
                        className="select-icon"
                        style={{ background: color.bg, color: color.color, borderColor: color.border }}
                      >
                        <Icon />
                      </div>
                      <div className="select-title">{d.name}</div>
                      <div className="select-sub">Morning drink</div>
                    </button>
                  );
                })}
              </div>
              <div className="choice-hint">
                {editRestrictions.morningAllowed
                  ? dateKey === toDateKey(new Date(nowTick))
                    ? `Time left ${formatMinutes(minutesUntilCutoff(editRestrictions.morningCutoff, new Date(nowTick)))}`
                    : "Available for this day"
                  : "Cutoff passed"}
              </div>
              {!editRestrictions.morningAllowed ? (
                <div className="choice-hint warning">
                  Admin blocked the edit access (cutoff: {editRestrictions.morningCutoff} AM)
                </div>
              ) : null}
            </SelectionTile>
          </div>
          <div className="col-6">
            <SelectionTile icon={<MoonIcon />} title="Evening drink (4:30pm)">
              <div className="select-grid">
                <button
                  type="button"
                  className={`select-card ${!selection?.eveningDrinkItemId ? "selected" : ""}`}
                  onClick={() => setSelection((s) => ({ ...s, eveningDrinkItemId: null }))}
                  disabled={isWfhDay || !editRestrictions.eveningAllowed}
                >
                  <div className="select-icon empty">—</div>
                  <div className="select-title">None</div>
                  <div className="select-sub">No drink</div>
                </button>
                {drinks.map((d) => {
                  const { Icon, color } = getItemVisual(d, "drink");
                
  async function requestWfhDay() {
    setWfhBusy(true);
    setError("");
    try {
      await api("/api/wfh/request", { method: "POST", body: { dateKey } });
      const wfh = await api(`/api/wfh/status?dateKey=${encodeURIComponent(dateKey)}`);
      setWfhStatus({
        requestStatus: wfh.requestStatus || "none",
        approvedDateKey: wfh.approvedDateKey || null,
        requestId: wfh.requestId || null
      });
      if (wfh.isWfh !== undefined) setIsWfhDay(Boolean(wfh.isWfh));
    } catch (e) {
      setError(e.message);
    } finally {
      setWfhBusy(false);
    }
  }

  function wfhStatusLabel() {
    if (wfhStatus.requestStatus === "pending") return "WFH request pending";
    if (wfhStatus.requestStatus === "approved") return "WFH request approved";
    if (wfhStatus.requestStatus === "rejected") return "WFH request rejected";
    if (wfhStatus.requestStatus === "replaced") return "WFH request replaced";
    if (wfhStatus.requestStatus === "revoked") return "WFH request revoked";
    if (isWfhDay && isFridayKey(dateKey) && !wfhStatus.approvedDateKey) return "Default WFH (Friday)";
    if (isFridayKey(dateKey) && wfhStatus.approvedDateKey && wfhStatus.approvedDateKey !== dateKey) {
      return `Friday open (WFH on ${wfhStatus.approvedDateKey})`;
    }
    return "No WFH request";
  }

  return (
                    <button
                      key={d._id}
                      type="button"
                      className={`select-card ${selection?.eveningDrinkItemId === d._id ? "selected" : ""}`}
                      onClick={() => setSelection((s) => ({ ...s, eveningDrinkItemId: d._id }))}
                      disabled={isWfhDay || !editRestrictions.eveningAllowed}
                    >
                      <div
                        className="select-icon"
                        style={{ background: color.bg, color: color.color, borderColor: color.border }}
                      >
                        <Icon />
                      </div>
                      <div className="select-title">{d.name}</div>
                      <div className="select-sub">Evening drink</div>
                    </button>
                  );
                })}
              </div>
              <div className="choice-hint">
                {editRestrictions.eveningAllowed
                  ? dateKey === toDateKey(new Date(nowTick))
                    ? `Time left ${formatMinutes(minutesUntilCutoff(editRestrictions.eveningCutoff, new Date(nowTick)))}`
                    : "Available for this day"
                  : "Cutoff passed"}
              </div>
              {!editRestrictions.eveningAllowed ? (
                <div className="choice-hint warning">
                  Admin blocked the edit access (cutoff: {editRestrictions.eveningCutoff} PM)
                </div>
              ) : null}
            </SelectionTile>
          </div>
          <div className="col-12">
            <SelectionTile icon={<SnackIcon />} title="Evening snack (only on snack days)">
              <div className="select-grid">
                <button
                  type="button"
                  className={`select-card ${!selection?.eveningSnackItemId ? "selected" : ""}`}
                  onClick={() => setSelection((s) => ({ ...s, eveningSnackItemId: null }))}
                  disabled={isWfhDay || !snacksAvailable || !editRestrictions.eveningAllowed}
                >
                  <div className="select-icon empty">—</div>
                  <div className="select-title">None</div>
                  <div className="select-sub">No snack</div>
                </button>
                {snacks.map((s) => {
                  const { Icon, color } = getItemVisual(s, "snack");
                
  async function requestWfhDay() {
    setWfhBusy(true);
    setError("");
    try {
      await api("/api/wfh/request", { method: "POST", body: { dateKey } });
      const wfh = await api(`/api/wfh/status?dateKey=${encodeURIComponent(dateKey)}`);
      setWfhStatus({
        requestStatus: wfh.requestStatus || "none",
        approvedDateKey: wfh.approvedDateKey || null,
        requestId: wfh.requestId || null
      });
      if (wfh.isWfh !== undefined) setIsWfhDay(Boolean(wfh.isWfh));
    } catch (e) {
      setError(e.message);
    } finally {
      setWfhBusy(false);
    }
  }

  function wfhStatusLabel() {
    if (wfhStatus.requestStatus === "pending") return "WFH request pending";
    if (wfhStatus.requestStatus === "approved") return "WFH request approved";
    if (wfhStatus.requestStatus === "rejected") return "WFH request rejected";
    if (wfhStatus.requestStatus === "replaced") return "WFH request replaced";
    if (wfhStatus.requestStatus === "revoked") return "WFH request revoked";
    if (isWfhDay && isFridayKey(dateKey) && !wfhStatus.approvedDateKey) return "Default WFH (Friday)";
    if (isFridayKey(dateKey) && wfhStatus.approvedDateKey && wfhStatus.approvedDateKey !== dateKey) {
      return `Friday open (WFH on ${wfhStatus.approvedDateKey})`;
    }
    return "No WFH request";
  }

  return (
                    <button
                      key={s._id}
                      type="button"
                      className={`select-card ${selection?.eveningSnackItemId === s._id ? "selected" : ""}`}
                      onClick={() => setSelection((state) => ({ ...state, eveningSnackItemId: s._id }))}
                      disabled={isWfhDay || !snacksAvailable || !editRestrictions.eveningAllowed}
                    >
                      <div
                        className="select-icon"
                        style={{ background: color.bg, color: color.color, borderColor: color.border }}
                      >
                        <Icon />
                      </div>
                      <div className="select-title">{s.name}</div>
                      <div className="select-sub">Snack</div>
                    </button>
                  );
                })}
              </div>
              <div className="choice-hint">
                {snacksAvailable
                  ? editRestrictions.eveningAllowed
                    ? "Snack day"
                    : "Cutoff passed"
                  : "No snack day"}
              </div>
              {!editRestrictions.eveningAllowed ? (
                <div className="choice-hint warning">
                  Admin blocked the edit access (cutoff: {editRestrictions.eveningCutoff} PM)
                </div>
              ) : null}
            </SelectionTile>
          </div>
          <div className="col-12" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button className="btn" onClick={save} disabled={busy || !selection || isWfhDay}>
              {busy ? "Saving..." : "Save selection"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
