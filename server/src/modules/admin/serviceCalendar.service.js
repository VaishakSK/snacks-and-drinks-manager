import { ServiceCalendar } from "./serviceCalendar.model.js";
import { parseDateKey } from "../../shared/date/dateKey.js";

export async function getCalendarConfig() {
  let cfg = await ServiceCalendar.findOne();
  if (!cfg) cfg = await ServiceCalendar.create({ defaultSnackWeekdays: [1, 3], overrides: [] });
  return cfg;
}

export function isWeekend(dateObj) {
  const dow = dateObj.getDay();
  return dow === 0 || dow === 6;
}

export async function snacksAvailableOnDateKey(dateKey) {
  const cfg = await getCalendarConfig();
  const ov = cfg.overrides.find((o) => o.dateKey === dateKey);
  if (ov) return ov.snacksAvailable;

  const d = parseDateKey(dateKey);
  if (isWeekend(d)) return false;

  const dow = d.getDay();
  return cfg.defaultSnackWeekdays.includes(dow);
}

