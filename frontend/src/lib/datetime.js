// Operational date calculations MUST use Asia/Kolkata, independent of the browser TZ.
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export const IST = "Asia/Kolkata";

export function nowIST() {
  return dayjs().tz(IST);
}

/** Today's calendar date in Asia/Kolkata as YYYY-MM-DD */
export function todayIST() {
  return dayjs().tz(IST).format("YYYY-MM-DD");
}

/** Tomorrow's calendar date in Asia/Kolkata as YYYY-MM-DD */
export function tomorrowIST() {
  return dayjs().tz(IST).add(1, "day").format("YYYY-MM-DD");
}

/** Human readable, e.g. "26 Aug 2026" */
export function formatDate(dateStr) {
  if (!dateStr) return "";
  return dayjs(dateStr, "YYYY-MM-DD").format("DD MMM YYYY");
}

/** Current IST wall-clock time for the header, e.g. "26 Aug 2026 · 14:05 IST" */
export function nowLabel() {
  return dayjs().tz(IST).format("DD MMM YYYY · HH:mm") + " IST";
}

/** Format a backend timestamp (ISO) to IST, e.g. "26 Aug 2026, 14:05". Returns "" if absent/invalid. */
export function formatDateTime(value) {
  if (!value) return "";
  const d = dayjs(value);
  if (!d.isValid()) return "";
  return d.tz(IST).format("DD MMM YYYY, HH:mm");
}
