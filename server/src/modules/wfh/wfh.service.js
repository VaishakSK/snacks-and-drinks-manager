import { addDays, parseDateKey, startOfWeekMonday, toDateKey } from "../../shared/date/dateKey.js";
import { WfhRequest } from "./wfh.model.js";

export function weekRange(dateKey) {
  const monday = startOfWeekMonday(parseDateKey(dateKey));
  const friday = addDays(monday, 4);
  return { start: toDateKey(monday), end: toDateKey(friday), monday, friday };
}

export function isFriday(dateKey) {
  return parseDateKey(dateKey).getDay() === 5;
}

export async function getApprovedWfhForWeek(userId, dateKey) {
  const { start, end } = weekRange(dateKey);
  return WfhRequest.findOne({
    userId,
    status: "approved",
    dateKey: { $gte: start, $lte: end }
  }).sort({ updatedAt: -1 });
}

export async function getApprovedWfhDateKeyForWeek(userId, dateKey) {
  const req = await getApprovedWfhForWeek(userId, dateKey);
  return req ? req.dateKey : null;
}

export async function getWfhStatusForDate(userId, dateKey) {
  const approvedDateKey = await getApprovedWfhDateKeyForWeek(userId, dateKey);
  const isWfh = approvedDateKey ? approvedDateKey === dateKey : isFriday(dateKey);

  const request = await WfhRequest.findOne({ userId, dateKey }).sort({ createdAt: -1 });
  return {
    isWfh,
    approvedDateKey,
    requestStatus: request?.status ?? "none",
    requestId: request?._id ?? null
  };
}
