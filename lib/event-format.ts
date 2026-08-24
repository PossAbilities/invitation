/**
 * Event date, time and calendar formatting.
 *
 * Shared by the builder UI and the outgoing email template so that what a guest
 * reads in their inbox, on the invitation page, and in the calendar file they
 * download are always the same event.
 */

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

export function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "possabilities-invitation"
  );
}



/** Splits an <input type="date"> value (yyyy-mm-dd) into numeric parts. */
export function splitDateValue(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) };
}

/** Splits an <input type="time"> value (hh:mm) into numeric parts. */
export function splitTimeValue(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function toEventDates(dateValue: string, startValue: string, endValue: string) {
  const date = splitDateValue(dateValue);
  if (!date) return null;

  const start = splitTimeValue(startValue) ?? { hour: 9, minute: 0 };
  const startDate = new Date(date.year, date.month, date.day, start.hour, start.minute);

  const end = splitTimeValue(endValue);
  const endDate = end
    ? new Date(date.year, date.month, date.day, end.hour, end.minute)
    : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  // An end time earlier than the start means the event runs past midnight.
  if (endDate <= startDate) {
    endDate.setDate(endDate.getDate() + 1);
  }

  return { startDate, endDate };
}

// Formatted by hand rather than with Intl.DateTimeFormat.
//
// Intl's output depends on the ICU data the runtime ships: workerd renders
// "Friday 18 September 2026" while Chromium renders "Friday, 18 September 2026".
// That difference is invisible to read but it breaks React hydration, because
// the server-rendered markup no longer matches what the client produces. These
// tables give the same string everywhere.
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "Friday 18 September 2026", or the raw value if the date is incomplete. */
export function formatEventDate(dateValue: string) {
  const date = splitDateValue(dateValue);
  if (!date) return dateValue;

  const value = new Date(date.year, date.month, date.day);
  return `${WEEKDAYS[value.getDay()]} ${date.day} ${MONTHS[date.month]} ${date.year}`;
}

/** "2:00 pm", in the 12-hour form the invitations use. */
function formatClockLabel(part: { hour: number; minute: number }) {
  const suffix = part.hour < 12 ? "am" : "pm";
  const hour = part.hour % 12 === 0 ? 12 : part.hour % 12;
  return `${hour}:${padDatePart(part.minute)} ${suffix}`;
}

/** "2:00 pm to 5:30 pm". */
export function formatEventTime(startValue: string, endValue: string) {
  const start = splitTimeValue(startValue);
  if (!start) return "";

  const end = splitTimeValue(endValue);
  return end ? `${formatClockLabel(start)} to ${formatClockLabel(end)}` : formatClockLabel(start);
}

function formatCalendarDate(value: Date) {
  return [
    value.getFullYear(),
    padDatePart(value.getMonth() + 1),
    padDatePart(value.getDate()),
    "T",
    padDatePart(value.getHours()),
    padDatePart(value.getMinutes()),
    "00",
  ].join("");
}

function formatCalendarStamp(value: Date) {
  return [
    value.getUTCFullYear(),
    padDatePart(value.getUTCMonth() + 1),
    padDatePart(value.getUTCDate()),
    "T",
    padDatePart(value.getUTCHours()),
    padDatePart(value.getUTCMinutes()),
    padDatePart(value.getUTCSeconds()),
    "Z",
  ].join("");
}

function escapeCalendarText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function createCalendarHref({
  endTime,
  eventDate,
  eventName,
  host,
  location,
  message,
  startTime,
}: {
  endTime: string;
  eventDate: string;
  eventName: string;
  host: string;
  location: string;
  message: string;
  startTime: string;
}) {
  const dates = toEventDates(eventDate, startTime, endTime);

  // Without a valid date there is nothing honest to export. Returning null lets
  // the caller hide the link rather than hand the guest a wrong calendar entry,
  // which is what the previous hardcoded fallback date did.
  if (!dates) return null;

  const { startDate, endDate } = dates;
  const dateLabel = formatEventDate(eventDate);
  const timeLabel = formatEventTime(startTime, endTime);
  const description = `${message}\n\n${dateLabel} at ${timeLabel}\nHosted by ${host}\nLocation: ${location}`;

  // DTSTAMP is derived from the event rather than the wall clock so that server
  // and client render byte-identical markup.
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PossAbilities//Invitations//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${slugify(eventName)}@possabilities-invitations`,
    `DTSTAMP:${formatCalendarStamp(startDate)}`,
    `DTSTART:${formatCalendarDate(startDate)}`,
    `DTEND:${formatCalendarDate(endDate)}`,
    `SUMMARY:${escapeCalendarText(eventName)}`,
    `DESCRIPTION:${escapeCalendarText(description)}`,
    `LOCATION:${escapeCalendarText(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

export function createMapsHref(location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}
