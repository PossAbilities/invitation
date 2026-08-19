"use client";

import { type CSSProperties, useMemo, useState } from "react";

type InviteeStatus = "Going" | "Opened" | "Invited" | "Staged";
type ViewMode = "campaigns" | "builder" | "recipients" | "admin";
type BuilderStep = "design" | "recipients" | "send";

type Invitee = {
  name: string;
  email: string;
  status: InviteeStatus;
};

type Campaign = {
  title: string;
  date: string;
  status: string;
  guests: number;
  rsvps: number;
};

const initialInvitees: Invitee[] = [
  {
    name: "Amelia Hughes",
    email: "amelia.hughes@example.org",
    status: "Going",
  },
  {
    name: "Sam Taylor",
    email: "sam.taylor@example.org",
    status: "Opened",
  },
  {
    name: "Priya Shah",
    email: "priya.shah@example.org",
    status: "Invited",
  },
  {
    name: "Jordan Lee",
    email: "jordan.lee@example.org",
    status: "Going",
  },
];

const palette = [
  { name: "PossAbilities pink", value: "#ec008c" },
  { name: "Brand teal", value: "#66cccc" },
  { name: "Deep purple", value: "#48065a" },
];

const statusTone: Record<InviteeStatus, string> = {
  Going: "status-going",
  Opened: "status-opened",
  Invited: "status-invited",
  Staged: "status-staged",
};

const navItems: Array<{ id: ViewMode; label: string }> = [
  { id: "campaigns", label: "Campaigns" },
  { id: "builder", label: "Create" },
  { id: "recipients", label: "Recipients" },
  { id: "admin", label: "Superuser" },
];

const builderSteps: Array<{ id: BuilderStep; label: string; helper: string }> = [
  { id: "design", label: "Details", helper: "Event, message, card colour" },
  { id: "recipients", label: "People", helper: "Add or import your guest list" },
  { id: "send", label: "Review", helper: "Check before sending" },
];

const adminMetrics = [
  { label: "Active users", value: "18" },
  { label: "Live events", value: "7" },
  { label: "Email queue", value: "1,248" },
  { label: "RSVP rate", value: "63%" },
];

const platformHealth = [
  { label: "Email service", value: "Healthy" },
  { label: "New accounts", value: "3 pending" },
  { label: "Data requests", value: "0 open" },
  { label: "Failed sends", value: "2 today" },
];

const viewCopy: Record<ViewMode, { kicker: string; title: string; description: string }> = {
  campaigns: {
    kicker: "Live The Life You Choose",
    title: "Campaigns",
    description: "Start a new invite, continue a draft, or check how live campaigns are doing.",
  },
  builder: {
    kicker: "Guided builder",
    title: "Create",
    description: "Work through the invitation in order: details, people, then review.",
  },
  recipients: {
    kicker: "People",
    title: "People",
    description: "Add one person, paste spreadsheet rows, upload a CSV, and check guest status.",
  },
  admin: {
    kicker: "Ryan - Superuser",
    title: "Superuser",
    description: "Monitor users, registrations, sending health, and data requests from one place.",
  },
};

const activityItems = [
  "Priya Shah opened the summer social invitation",
  "Morgan Price and Jamie Carter are staged from import",
  "Big Tea Meet Up is currently sending",
];

const months: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function cleanCell(value: string) {
  return value.trim().replace(/^["']|["']$/g, "");
}

function nameFromEmail(email: string) {
  const prefix = email.split("@")[0] ?? "Guest";
  return prefix
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseInviteeRows(raw: string): Invitee[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.includes("\t") ? /\t+/ : /[,;]+/;
      const cells = line.split(separator).map(cleanCell).filter(Boolean);
      const email = cells.find(isEmail);

      if (!email) {
        return null;
      }

      const nameCell = cells.find(
        (cell) => cell !== email && !/^name$/i.test(cell) && !/^email$/i.test(cell)
      );

      return {
        name: nameCell ?? nameFromEmail(email),
        email,
        status: "Staged" as const,
      };
    })
    .filter((invitee): invitee is Invitee => Boolean(invitee));
}

function mergeInvitees(current: Invitee[], incoming: Invitee[]) {
  const seen = new Set(current.map((invitee) => invitee.email.toLowerCase()));
  const fresh = incoming.filter((invitee) => {
    const key = invitee.email.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  return { next: [...fresh, ...current], added: fresh.length };
}

function campaignRate(campaign: Campaign) {
  if (!campaign.guests) {
    return 0;
  }

  return Math.min(100, Math.round((campaign.rsvps / campaign.guests) * 100));
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "possabilities-invitation"
  );
}

function parseDateText(value: string) {
  const named = value.match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/i);
  if (named) {
    const month = months[named[2].toLowerCase()];

    if (month !== undefined) {
      return {
        day: Number(named[1]),
        month,
        year: Number(named[3]),
      };
    }
  }

  const iso = value.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) {
    return {
      day: Number(iso[3]),
      month: Number(iso[2]) - 1,
      year: Number(iso[1]),
    };
  }

  const numeric = value.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
  if (numeric) {
    return {
      day: Number(numeric[1]),
      month: Number(numeric[2]) - 1,
      year: Number(numeric[3]),
    };
  }

  return null;
}

function parseClockTime(value: string) {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);

  if (!match) {
    return null;
  }

  const meridiem = match[3]?.toLowerCase();
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");

  if (meridiem === "pm" && hour < 12) {
    hour += 12;
  }

  if (meridiem === "am" && hour === 12) {
    hour = 0;
  }

  if (hour > 23 || minute > 59) {
    return null;
  }

  return { hour, minute };
}

function parseEventDateTime(dateText: string, timeText: string) {
  const date = parseDateText(dateText);

  if (!date) {
    return null;
  }

  const [rawStart = "", rawEnd] = timeText.split(/\s*[-–—]\s*/);
  const endMeridiem = rawEnd?.match(/\b(am|pm)\b/i)?.[1];
  const startText =
    endMeridiem && !/\b(am|pm)\b/i.test(rawStart) ? `${rawStart}${endMeridiem}` : rawStart;
  const start = parseClockTime(startText) ?? { hour: 9, minute: 0 };
  const end = rawEnd ? parseClockTime(rawEnd) : null;
  const startDate = new Date(date.year, date.month, date.day, start.hour, start.minute);
  const endDate = end
    ? new Date(date.year, date.month, date.day, end.hour, end.minute)
    : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  if (endDate <= startDate) {
    endDate.setDate(endDate.getDate() + 1);
  }

  return { startDate, endDate };
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

function createCalendarHref({
  eventDate,
  eventName,
  eventTime,
  host,
  location,
  message,
}: {
  eventDate: string;
  eventName: string;
  eventTime: string;
  host: string;
  location: string;
  message: string;
}) {
  const parsed = parseEventDateTime(eventDate, eventTime);
  const fallbackStart = new Date(2026, 8, 18, 14, 0);
  const fallbackEnd = new Date(2026, 8, 18, 17, 30);
  const startDate = parsed?.startDate ?? fallbackStart;
  const endDate = parsed?.endDate ?? fallbackEnd;
  const description = `${message}\n\n${eventDate} at ${eventTime}\nHosted by ${host}\nLocation: ${location}`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PossAbilities//Invitations//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${slugify(eventName)}@possabilities-invitations`,
    `DTSTAMP:${formatCalendarStamp(new Date())}`,
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

function createMapsHref(location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

export default function Home() {
  const [activeView, setActiveView] = useState<ViewMode>("campaigns");
  const [activeStep, setActiveStep] = useState<BuilderStep>("design");
  const [eventName, setEventName] = useState("Summer PossAbilities Social");
  const [eventDate, setEventDate] = useState("Friday 18 September 2026");
  const [eventTime, setEventTime] = useState("2:00 PM - 5:30 PM");
  const [location, setLocation] = useState("The Social Lounge, Rochdale");
  const [host, setHost] = useState("PossAbilities CIC");
  const [message, setMessage] = useState(
    "Join us for music, food, games, and a relaxed afternoon celebrating people living the life they choose."
  );
  const [accent, setAccent] = useState(palette[0].value);
  const [isOpen, setIsOpen] = useState(false);
  const [invitees, setInvitees] = useState<Invitee[]>(initialInvitees);
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestEmail, setNewGuestEmail] = useState("");
  const [bulkInvitees, setBulkInvitees] = useState(
    "Morgan Price,morgan.price@example.org\nJamie Carter,jamie.carter@example.org"
  );
  const [importNotice, setImportNotice] = useState("2 rows ready");

  const responseSummary = useMemo(() => {
    const going = invitees.filter((guest) => guest.status === "Going").length;
    const opened = invitees.filter((guest) => guest.status === "Opened").length;
    const staged = invitees.filter((guest) => guest.status === "Staged").length;
    const invited = invitees.length;
    return { going, opened, invited, staged };
  }, [invitees]);

  const campaigns: Campaign[] = useMemo(
    () => [
      {
        title: eventName,
        date: eventDate,
        status: "Draft",
        guests: invitees.length,
        rsvps: responseSummary.going,
      },
      {
        title: "Big Tea Meet Up",
        date: "Tuesday 6 October 2026",
        status: "Sending",
        guests: 126,
        rsvps: 42,
      },
      {
        title: "Volunteer welcome morning",
        date: "Monday 19 October 2026",
        status: "Live",
        guests: 38,
        rsvps: 21,
      },
    ],
    [eventDate, eventName, invitees.length, responseSummary.going]
  );
  const currentView = viewCopy[activeView];

  function showBuilder(step: BuilderStep = "design") {
    setActiveStep(step);
    setActiveView("builder");
  }

  function addSingleInvitee() {
    if (!isEmail(newGuestEmail)) {
      setImportNotice("Enter a valid email address");
      return;
    }

    const guest = {
      name: newGuestName.trim() || nameFromEmail(newGuestEmail),
      email: newGuestEmail.trim(),
      status: "Staged" as const,
    };
    const { next, added } = mergeInvitees(invitees, [guest]);

    setInvitees(next);
    setImportNotice(added ? "1 person added" : "That email is already listed");
    setNewGuestName("");
    setNewGuestEmail("");
  }

  function importBulkInvitees() {
    const parsed = parseInviteeRows(bulkInvitees);
    const { next, added } = mergeInvitees(invitees, parsed);

    setInvitees(next);
    setImportNotice(added ? `${added} people imported` : "No new email addresses found");
  }

  return (
    <main className="app-shell" style={{ "--accent": accent } as CSSProperties}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="app-topbar" aria-label="PossAbilities invitation platform">
        <div className="brand-lockup" aria-label="PossAbilities invitation studio">
          <img src="/brand/possabilities-wordmark.png" alt="PossAbilities" />
          <span>Invitations</span>
        </div>

        <nav className="primary-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              className={activeView === item.id ? "nav-item active" : "nav-item"}
              key={item.id}
              type="button"
              onClick={() => setActiveView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button className="new-campaign-button" type="button" onClick={() => showBuilder()}>
          New invitation
        </button>
      </header>

      <section className="workspace" id="main-content">
        <div className="workspace-header">
          <div className="page-copy">
            <p className="section-kicker">{currentView.kicker}</p>
            <h1>{currentView.title}</h1>
            <p>{currentView.description}</p>
          </div>
          <div className="status-strip" aria-label="Campaign status summary">
            <span>{responseSummary.invited} listed</span>
            <span>{responseSummary.staged} staged</span>
            <span>{responseSummary.going} going</span>
          </div>
        </div>

        {activeView === "campaigns" && (
          <section className="command-grid" aria-label="Campaigns">
            <article className="start-workbench" aria-label="Start a new invitation">
              <div className="focus-copy">
                <p className="label-text">Start here</p>
                <h2>Create invitation</h2>
                <p>
                  Create the event, add people, preview the envelope reveal, then send a test before
                  the campaign goes live.
                </p>
              </div>
              <div className="start-options" aria-label="Invitation creation steps">
                {builderSteps.map((step, index) => (
                  <button
                    className="start-option"
                    key={step.id}
                    type="button"
                    onClick={() => showBuilder(step.id)}
                  >
                    <span>{index + 1}</span>
                    <strong>{step.label}</strong>
                    <small>{step.helper}</small>
                  </button>
                ))}
              </div>
              <div className="focus-actions">
                <button className="primary-action" type="button" onClick={() => showBuilder()}>
                  Start new invitation
                </button>
                <button
                  className="secondary-action"
                  type="button"
                  onClick={() => {
                    setActiveView("recipients");
                    setActiveStep("recipients");
                  }}
                >
                  Import people
                </button>
              </div>
            </article>

            <section className="active-campaigns" aria-label="Active invitations">
              <div className="panel-title split">
                <div>
                  <p className="label-text">Active work</p>
                  <h2>Invitations in progress</h2>
                </div>
                <button className="secondary-action compact" type="button" onClick={() => showBuilder()}>
                  Continue draft
                </button>
              </div>
              <div className="campaign-list">
                {campaigns.map((campaign) => {
                  const rate = campaignRate(campaign);

                  return (
                    <article
                      className="campaign-row"
                      key={campaign.title}
                      style={{ "--progress": `${rate}%` } as CSSProperties}
                    >
                      <div className="campaign-main">
                        <span className="campaign-status">{campaign.status}</span>
                        <h3>{campaign.title}</h3>
                        <p>{campaign.date}</p>
                      </div>
                      <dl>
                        <div>
                          <dt>Guests</dt>
                          <dd>{campaign.guests}</dd>
                        </div>
                        <div>
                          <dt>RSVPs</dt>
                          <dd>{campaign.rsvps}</dd>
                        </div>
                      </dl>
                      <div className="campaign-response" aria-label={`${rate}% response rate`}>
                        <span />
                      </div>
                      <button type="button" onClick={() => showBuilder()}>
                        Open
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>

            <aside className="activity-panel" aria-label="Recent campaign activity">
              <div className="panel-title">
                <p className="label-text">Today</p>
                <h2>Needs attention</h2>
              </div>
              <div className="attention-grid">
                <article>
                  <strong>{responseSummary.staged}</strong>
                  <span>ready to invite</span>
                </article>
                <article>
                  <strong>2</strong>
                  <span>failed sends</span>
                </article>
                <article>
                  <strong>3</strong>
                  <span>account approvals</span>
                </article>
              </div>
              <div className="activity-feed">
                {activityItems.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </aside>
          </section>
        )}

        {activeView === "builder" && (
          <section className="builder-shell" aria-label="Invitation builder">
            <aside className="builder-rail" aria-label="Builder steps">
              {builderSteps.map((step, index) => (
                <button
                  className={activeStep === step.id ? "step-button active" : "step-button"}
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                >
                  <span className="step-index">{index + 1}</span>
                  <strong>{step.label}</strong>
                  <small>{step.helper}</small>
                </button>
              ))}
            </aside>

            <section className="builder-main">
              {activeStep === "design" && (
                <div className="builder-panel">
                  <div className="panel-title split">
                    <div>
                      <p className="label-text">Step 1 of 3</p>
                      <h2>Event details</h2>
                      <p className="helper-text">
                        These details appear on the card guests see after opening the envelope.
                      </p>
                    </div>
                    <span className="count-chip">Draft autosaved</span>
                  </div>

                  <section className="form-section" aria-label="Event information">
                    <div className="form-section-head">
                      <h3>Event information</h3>
                      <p>Name the event clearly and keep the place recognisable for guests.</p>
                    </div>
                    <div className="form-grid">
                      <label>
                        <span>Event name</span>
                        <input
                          value={eventName}
                          onChange={(event) => setEventName(event.target.value)}
                        />
                      </label>
                      <label>
                        <span>Date</span>
                        <input
                          value={eventDate}
                          onChange={(event) => setEventDate(event.target.value)}
                        />
                      </label>
                      <label>
                        <span>Time</span>
                        <input
                          value={eventTime}
                          onChange={(event) => setEventTime(event.target.value)}
                        />
                      </label>
                      <label>
                        <span>Place</span>
                        <input
                          value={location}
                          onChange={(event) => setLocation(event.target.value)}
                        />
                      </label>
                      <label>
                        <span>Host</span>
                        <input
                          value={host}
                          onChange={(event) => setHost(event.target.value)}
                        />
                      </label>
                    </div>
                  </section>

                  <section className="form-section" aria-label="Invitation message">
                    <div className="form-section-head">
                      <h3>Message and brand colour</h3>
                      <p>Keep the message short. The card preview updates as you type.</p>
                    </div>
                    <label className="message-field">
                      <span>Invite message</span>
                      <textarea
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        rows={4}
                      />
                    </label>

                    <fieldset className="palette-field">
                      <legend>Card accent</legend>
                      <div className="swatches">
                        {palette.map((color) => (
                          <button
                            className={accent === color.value ? "swatch selected" : "swatch"}
                            key={color.value}
                            onClick={() => setAccent(color.value)}
                            style={{ backgroundColor: color.value }}
                            type="button"
                            aria-label={color.name}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </fieldset>
                  </section>

                  <div className="form-actions">
                    <button
                      className="primary-action"
                      type="button"
                      onClick={() => setActiveStep("recipients")}
                    >
                      Next: recipients
                    </button>
                    <button className="text-action" type="button">
                      Save draft
                    </button>
                  </div>
                </div>
              )}

              {activeStep === "recipients" && (
                <PeopleManager
                  bulkInvitees={bulkInvitees}
                  importNotice={importNotice}
                  invitees={invitees}
                  newGuestEmail={newGuestEmail}
                  newGuestName={newGuestName}
                  onAdd={addSingleInvitee}
                  onBulkChange={(value) => {
                    setBulkInvitees(value);
                    setImportNotice(`${parseInviteeRows(value).length} rows ready`);
                  }}
                  onClearBulk={() => {
                    setBulkInvitees("");
                    setImportNotice("Paste or upload people to import");
                  }}
                  onEmailChange={setNewGuestEmail}
                  onFileText={(text) => {
                    setBulkInvitees(text);
                    setImportNotice(`${parseInviteeRows(text).length} rows ready`);
                  }}
                  onImport={importBulkInvitees}
                  onNameChange={setNewGuestName}
                />
              )}

              {activeStep === "send" && (
                <div className="builder-panel review-panel">
                  <div className="panel-title">
                    <p className="label-text">Step 3 of 3</p>
                    <h2>Review before sending</h2>
                    <p className="helper-text">
                      This screen keeps the important checks together before the invitation leaves
                      the platform.
                    </p>
                  </div>
                  <div className="review-grid">
                    <article>
                      <strong>{eventName}</strong>
                      <span>{eventDate}</span>
                    </article>
                    <article>
                      <strong>{invitees.length}</strong>
                      <span>people in this campaign</span>
                    </article>
                    <article>
                      <strong>{responseSummary.staged}</strong>
                      <span>new people staged</span>
                    </article>
                  </div>
                  <div className="send-checklist">
                    <div>
                      <span className="check-mark" />
                      Invitation design saved
                    </div>
                    <div>
                      <span className="check-mark" />
                      Guest list checked
                    </div>
                    <div>
                      <span className="check-mark" />
                      Calendar and maps links included
                    </div>
                    <div>
                      <span className="check-mark muted" />
                      Email sending provider pending
                    </div>
                  </div>
                  <div className="form-actions">
                    <button className="primary-action" type="button">
                      Send test email
                    </button>
                    <button className="secondary-action" type="button">
                      Schedule campaign
                    </button>
                  </div>
                </div>
              )}
            </section>

            <aside className="preview-dock" aria-label="Live invitation preview">
              <div className="preview-head">
                <div>
                  <p className="label-text">Recipient view</p>
                  <h2>Preview</h2>
                  <p className="helper-text">The envelope starts closed. Open it to check the card.</p>
                </div>
                <button
                  className="secondary-action compact"
                  type="button"
                  onClick={() => setIsOpen((value) => !value)}
                  aria-pressed={isOpen}
                >
                  {isOpen ? "Reset envelope" : "Open envelope"}
                </button>
              </div>
              <InvitePreview
                eventDate={eventDate}
                eventName={eventName}
                eventTime={eventTime}
                host={host}
                isOpen={isOpen}
                location={location}
                message={message}
                onToggle={() => setIsOpen((value) => !value)}
              />
            </aside>
          </section>
        )}

        {activeView === "recipients" && (
          <section className="standalone-grid" aria-label="Recipients">
            <PeopleManager
              bulkInvitees={bulkInvitees}
              importNotice={importNotice}
              invitees={invitees}
              newGuestEmail={newGuestEmail}
              newGuestName={newGuestName}
              onAdd={addSingleInvitee}
              onBulkChange={(value) => {
                setBulkInvitees(value);
                setImportNotice(`${parseInviteeRows(value).length} rows ready`);
              }}
              onClearBulk={() => {
                setBulkInvitees("");
                setImportNotice("Paste or upload people to import");
              }}
              onEmailChange={setNewGuestEmail}
              onFileText={(text) => {
                setBulkInvitees(text);
                setImportNotice(`${parseInviteeRows(text).length} rows ready`);
              }}
              onImport={importBulkInvitees}
              onNameChange={setNewGuestName}
            />
            <GuestList invitees={invitees} />
          </section>
        )}

        {activeView === "admin" && (
          <section className="admin-shell" aria-label="Superuser monitoring">
            <div className="admin-header">
              <div>
                <p className="label-text">Ryan - Superuser</p>
                <h2>Platform monitor</h2>
              </div>
              <button className="secondary-action" type="button">
                Export report
              </button>
            </div>
            <div className="admin-metrics">
              {adminMetrics.map((metric) => (
                <article key={metric.label}>
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </article>
              ))}
            </div>
            <div className="admin-grid">
              <section className="registration-panel" aria-label="User registration">
                <h3>User registration</h3>
                <div className="registration-fields">
                  <label>
                    <span>First name</span>
                    <input placeholder="Ryan" />
                  </label>
                  <label>
                    <span>Last name</span>
                    <input placeholder="Bott" />
                  </label>
                  <label>
                    <span>Work email</span>
                    <input placeholder="name@example.org" type="email" />
                  </label>
                  <label>
                    <span>Password</span>
                    <input placeholder="Minimum 12 characters" type="password" />
                  </label>
                </div>
                <label className="toggle-row">
                  <input type="checkbox" defaultChecked />
                  <span>Require superuser approval</span>
                </label>
                <button className="primary-action" type="button">
                  Create account
                </button>
              </section>

              <section className="monitor-panel" aria-label="Platform health">
                <h3>Platform health</h3>
                <div className="monitor-feed">
                  {platformHealth.map((item) => (
                    <article key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function PeopleManager({
  bulkInvitees,
  importNotice,
  invitees,
  newGuestEmail,
  newGuestName,
  onAdd,
  onBulkChange,
  onClearBulk,
  onEmailChange,
  onFileText,
  onImport,
  onNameChange,
}: {
  bulkInvitees: string;
  importNotice: string;
  invitees: Invitee[];
  newGuestEmail: string;
  newGuestName: string;
  onAdd: () => void;
  onBulkChange: (value: string) => void;
  onClearBulk: () => void;
  onEmailChange: (value: string) => void;
  onFileText: (value: string) => void;
  onImport: () => void;
  onNameChange: (value: string) => void;
}) {
  return (
    <section className="people-manager" aria-label="Invitation recipients">
      <div className="panel-title split">
        <div>
          <p className="label-text">Recipients</p>
          <h2>Invitation list</h2>
          <p className="helper-text">
            Add one person, paste rows from Excel, or upload a CSV export.
          </p>
        </div>
        <div className="count-chip">{invitees.length} listed</div>
      </div>

      <div className="people-layout">
        <div className="single-add">
          <div className="form-section-head">
            <h3>Add one person</h3>
            <p>Useful when someone asks to be included after the main list is ready.</p>
          </div>
          <label>
            <span>Name</span>
            <input
              value={newGuestName}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Morgan Price"
            />
          </label>
          <label>
            <span>Email</span>
            <input
              value={newGuestEmail}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="morgan.price@example.org"
              type="email"
            />
          </label>
          <button className="primary-action" type="button" onClick={onAdd}>
            Add person
          </button>
        </div>

        <div className="bulk-add">
          <div className="form-section-head">
            <h3>Import a list</h3>
            <p>Paste names and emails from a spreadsheet, or upload a CSV file.</p>
          </div>
          <label>
            <span>Spreadsheet rows</span>
            <textarea
              value={bulkInvitees}
              onChange={(event) => onBulkChange(event.target.value)}
              rows={6}
            />
          </label>
          <p className="field-hint">Accepted format: name, email. One person per row.</p>
          <div className="bulk-actions">
            <label className="file-import">
              <span>CSV file</span>
              <input
                accept=".csv,.txt,text/csv,text/plain"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (!file) {
                    return;
                  }

                  void file.text().then(onFileText);
                }}
                type="file"
              />
            </label>
            <button className="secondary-action" type="button" onClick={onImport}>
              Import people
            </button>
            <button className="text-action" type="button" onClick={onClearBulk}>
              Clear
            </button>
          </div>
          <p className="import-notice" role="status">
            {importNotice}
          </p>
        </div>
      </div>
    </section>
  );
}

function GuestList({ invitees }: { invitees: Invitee[] }) {
  return (
    <section className="guest-list-panel" aria-label="Current invitation list">
      <div className="panel-title">
        <p className="label-text">Current list</p>
        <h2>People invited</h2>
      </div>
      <div className="guest-list">
        {invitees.map((guest) => (
          <article className="guest-row" key={guest.email}>
            <div>
              <h3>{guest.name}</h3>
              <p>{guest.email}</p>
            </div>
            <span className={statusTone[guest.status]}>{guest.status}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function InvitePreview({
  eventDate,
  eventName,
  eventTime,
  host,
  isOpen,
  location,
  message,
  onToggle,
}: {
  eventDate: string;
  eventName: string;
  eventTime: string;
  host: string;
  isOpen: boolean;
  location: string;
  message: string;
  onToggle: () => void;
}) {
  const calendarHref = createCalendarHref({
    eventDate,
    eventName,
    eventTime,
    host,
    location,
    message,
  });
  const mapsHref = createMapsHref(location);
  const calendarDownloadName = `${slugify(eventName)}.ics`;

  return (
    <div className={isOpen ? "invite-stage open" : "invite-stage"}>
      <div className="mail-shadow" />
      <div className="invite-card" aria-hidden={!isOpen} aria-label="Invitation card preview">
        <img src="/brand/possabilities-stacked.png" alt="" />
        <span className="invite-tag">Live The Life You Choose</span>
        <h3>{eventName}</h3>
        <p>{message}</p>
        <dl>
          <div>
            <dt>Date</dt>
            <dd>{eventDate}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>{eventTime}</dd>
          </div>
          <div>
            <dt>Place</dt>
            <dd>
              <a
                className="map-link"
                href={mapsHref}
                rel="noreferrer"
                tabIndex={isOpen ? undefined : -1}
                target="_blank"
              >
                {location}
              </a>
            </dd>
          </div>
        </dl>
        <div className="guest-tools" aria-label="Guest event tools">
          <a
            className="guest-tool primary"
            download={calendarDownloadName}
            href={calendarHref}
            tabIndex={isOpen ? undefined : -1}
          >
            Add to calendar
          </a>
          <a
            className="guest-tool"
            href={mapsHref}
            rel="noreferrer"
            tabIndex={isOpen ? undefined : -1}
            target="_blank"
          >
            Open maps
          </a>
        </div>
        <div className="rsvp-row" aria-label="RSVP actions">
          <button disabled={!isOpen} type="button">
            Going
          </button>
          <button disabled={!isOpen} type="button">
            Maybe
          </button>
        </div>
      </div>
      <button
        className="envelope"
        type="button"
        onClick={onToggle}
        aria-label={isOpen ? "Close invitation envelope" : "Open invitation envelope"}
        title={isOpen ? "Close envelope" : "Open envelope"}
      >
        <span className="envelope-back" />
        <span className="envelope-paper">
          <span>You are invited</span>
          <strong>{host}</strong>
        </span>
        <span className="envelope-front" />
        <span className="envelope-flap" />
        <span className="wax-seal">P</span>
      </button>
    </div>
  );
}
