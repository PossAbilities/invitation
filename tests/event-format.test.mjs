import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  createCalendarHref,
  formatEventDate,
  formatEventTime,
  slugify,
} from "../lib/event-format.ts";

function parseIcs(href) {
  assert.ok(href, "expected a calendar link");
  return decodeURIComponent(href.replace("data:text/calendar;charset=utf-8,", "")).split("\r\n");
}

function field(lines, key) {
  return lines.find((line) => line.startsWith(`${key}:`))?.slice(key.length + 1);
}

describe("date and time display", () => {
  test("is identical on every runtime, so hydration does not break", () => {
    // Intl.DateTimeFormat renders "Friday, 18 September" on Chromium and
    // "Friday 18 September" on workerd. The mismatch is invisible to read but
    // it makes React discard the server-rendered markup.
    assert.doesNotMatch(formatEventDate("2026-09-18"), /,/);
  });

  test("formats a date the way a guest would read it", () => {
    assert.equal(formatEventDate("2026-09-18"), "Friday 18 September 2026");
  });

  test("returns the raw value rather than inventing a date", () => {
    assert.equal(formatEventDate(""), "");
    assert.equal(formatEventDate("not a date"), "not a date");
  });

  test("formats a time range", () => {
    assert.equal(formatEventTime("14:00", "17:30"), "2:00 pm to 5:30 pm");
    assert.equal(formatEventTime("09:05", ""), "9:05 am");
    assert.equal(formatEventTime("", ""), "");
  });
});

describe("calendar export", () => {
  const base = {
    endTime: "17:30",
    eventDate: "2026-09-18",
    eventName: "Summer PossAbilities Social",
    host: "PossAbilities CIC",
    location: "The Social Lounge, Rochdale",
    message: "Join us for music and food.",
    startTime: "14:00",
  };

  test("exports exactly the date and time that were chosen", () => {
    const lines = parseIcs(createCalendarHref(base));

    assert.equal(field(lines, "DTSTART"), "20260918T140000");
    assert.equal(field(lines, "DTEND"), "20260918T173000");
  });

  test("follows a changed date instead of falling back to a fixed one", () => {
    // The regression this guards: the previous implementation parsed free text
    // and silently substituted a hardcoded 18 September 2026 whenever the parse
    // failed, so guests could receive a calendar entry for the wrong day.
    const lines = parseIcs(createCalendarHref({ ...base, eventDate: "2026-12-05" }));

    assert.equal(field(lines, "DTSTART"), "20261205T140000");
  });

  test("offers no calendar link at all when the date is incomplete", () => {
    assert.equal(createCalendarHref({ ...base, eventDate: "" }), null);
    assert.equal(createCalendarHref({ ...base, eventDate: "18 September" }), null);
  });

  test("treats an end before the start as running past midnight", () => {
    const lines = parseIcs(createCalendarHref({ ...base, startTime: "22:00", endTime: "01:00" }));

    assert.equal(field(lines, "DTSTART"), "20260918T220000");
    assert.equal(field(lines, "DTEND"), "20260919T010000");
  });

  test("escapes commas and semicolons so the file stays valid", () => {
    const lines = parseIcs(createCalendarHref({ ...base, location: "Hall, Rochdale; door 2" }));

    assert.equal(field(lines, "LOCATION"), "Hall\\, Rochdale\\; door 2");
  });

  test("is stable across renders, so server and client markup agree", () => {
    assert.equal(createCalendarHref(base), createCalendarHref(base));
  });
});

describe("slugify", () => {
  test("builds a safe download filename", () => {
    assert.equal(slugify("Summer PossAbilities Social"), "summer-possabilities-social");
  });

  test("falls back rather than producing an empty filename", () => {
    assert.equal(slugify("!!!"), "possabilities-invitation");
  });
});
