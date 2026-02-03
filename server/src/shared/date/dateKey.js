export function toDateKey(d) {
  const dt = d instanceof Date ? d : new Date(d);
  // Use local date parts (office local)
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateKey(dateKey) {
  // Interprets as local midnight
  const [y, m, d] = dateKey.split("-").map((x) => Number(x));
  return new Date(y, m - 1, d);
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfWeekMonday(date) {
  const d = new Date(date);
  const dow = d.getDay(); // 0 Sun..6 Sat
  const diff = (dow === 0 ? -6 : 1) - dow; // move to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

